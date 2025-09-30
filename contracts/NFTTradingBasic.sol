// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title NFTTradingBasic
 * @dev Basic NFT trading contract (no fhEVM) to test network deployment
 */
contract NFTTradingBasic is ERC721Holder, ERC1155Holder, ReentrancyGuard, Pausable {
    
    // Constants
    uint256 public constant MAX_TRADE_FEE = 1 ether;
    uint256 public constant MAX_ADMINS = 3;
    address public constant FEE_COLLECTOR = 0x20ce27B140A0EEECceF880e01D2082558400FDd6;
    
    // State variables
    uint256 public tradeCount;
    uint256 public tradeFee = 0.01 ether; // 0.01 ETH
    
    // Admin management
    mapping(address => bool) public isAdmin;
    address[] public adminList;
    
    enum TradeStatus { Pending, Accepted, Cancelled, Expired, Declined }
    enum TokenStandard { ERC721, ERC1155 }
    
    struct NFTItem {
        address contractAddress;
        uint256 tokenId;
        uint256 amount;
        TokenStandard standard;
    }
    
    struct Trade {
        uint256 id;
        address creator;
        address counterparty;
        uint256 offeredETH;      // Regular uint256 (not encrypted)
        uint256 requestedETH;    // Regular uint256 (not encrypted)
        uint256 expiryTime;
        TradeStatus status;
        string message;
        uint256 createdAt;
    }
    
    // Storage mappings
    mapping(uint256 => Trade) public trades;
    mapping(uint256 => NFTItem[]) public tradeOfferedNFTs;
    mapping(uint256 => NFTItem[]) public tradeRequestedNFTs;
    mapping(address => uint256[]) public userCreatedTrades;
    mapping(address => uint256[]) public userReceivedTrades;
    
    // Events
    event TradeCreated(uint256 indexed tradeId, address indexed creator, address indexed counterparty);
    event TradeAccepted(uint256 indexed tradeId, address indexed creator, address indexed acceptor);
    event TradeCancelled(uint256 indexed tradeId, address indexed canceller);
    
    // Modifiers
    modifier tradeExists(uint256 tradeId) {
        require(trades[tradeId].creator != address(0), "Trade does not exist");
        _;
    }
    
    modifier tradePending(uint256 tradeId) {
        require(trades[tradeId].status == TradeStatus.Pending, "Trade not pending");
        _;
    }
    
    modifier onlyTradeCreator(uint256 tradeId) {
        require(msg.sender == trades[tradeId].creator, "Only trade creator");
        _;
    }
    
    modifier onlyCounterparty(uint256 tradeId) {
        require(msg.sender == trades[tradeId].counterparty, "Not trade counterparty");
        _;
    }
    
    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "Only admin");
        _;
    }
    
    constructor() {
        isAdmin[msg.sender] = true;
        adminList.push(msg.sender);
    }
    
    /**
     * @dev Create a basic trade (no encryption)
     */
    function createTrade(
        address counterparty,
        NFTItem[] calldata offeredNFTs,
        NFTItem[] calldata requestedNFTs,
        uint256 requestedETH,
        string calldata message
    ) external payable nonReentrant whenNotPaused {
        require(counterparty != address(0), "Invalid counterparty address");
        require(counterparty != msg.sender, "Cannot trade with yourself");
        require(msg.value >= tradeFee, "Insufficient fee payment");
        
        uint256 offeredETH = msg.value - tradeFee;
        tradeCount++;
        uint256 tradeId = tradeCount;
        
        // Create trade with regular uint256 amounts
        trades[tradeId] = Trade({
            id: tradeId,
            creator: msg.sender,
            counterparty: counterparty,
            offeredETH: offeredETH,
            requestedETH: requestedETH,
            expiryTime: block.timestamp + 24 hours,
            status: TradeStatus.Pending,
            message: message,
            createdAt: block.timestamp
        });
        
        // Store NFTs
        for (uint256 i = 0; i < offeredNFTs.length; i++) {
            _transferNFTToContract(offeredNFTs[i], msg.sender);
            tradeOfferedNFTs[tradeId].push(offeredNFTs[i]);
        }
        
        for (uint256 i = 0; i < requestedNFTs.length; i++) {
            tradeRequestedNFTs[tradeId].push(requestedNFTs[i]);
        }
        
        // Track trades
        userCreatedTrades[msg.sender].push(tradeId);
        userReceivedTrades[counterparty].push(tradeId);
        
        // Send fee
        if (tradeFee > 0) {
            payable(FEE_COLLECTOR).transfer(tradeFee);
        }
        
        emit TradeCreated(tradeId, msg.sender, counterparty);
    }
    
    function _transferNFTToContract(NFTItem memory nft, address from) internal {
        if (nft.standard == TokenStandard.ERC721) {
            IERC721(nft.contractAddress).safeTransferFrom(from, address(this), nft.tokenId);
        } else if (nft.standard == TokenStandard.ERC1155) {
            IERC1155(nft.contractAddress).safeTransferFrom(from, address(this), nft.tokenId, nft.amount, "");
        }
    }
    
    // Admin functions
    function setTradeFee(uint256 newFee) external onlyAdmin {
        require(newFee <= MAX_TRADE_FEE, "Fee exceeds maximum");
        tradeFee = newFee;
    }
    
    // View functions
    function getTradeFee() external view returns (uint256) {
        return tradeFee;
    }
    
    function getAdminCount() external view returns (uint256) {
        return adminList.length;
    }
    
    function getTrade(uint256 tradeId) external view returns (Trade memory) {
        return trades[tradeId];
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Holder) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
