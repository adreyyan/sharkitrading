// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// fhEVM imports
import { FHE, euint64 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title NFTTradingFHEV7
 * @dev fhEVM contract with V7 interface (no encryption parameters needed from frontend)
 */
contract NFTTradingFHEV7 is ERC721Holder, ERC1155Holder, ReentrancyGuard, Pausable, SepoliaConfig {
    
    // Constants
    uint256 public constant MAX_TRADE_FEE = 1 ether;
    uint256 public constant MAX_ADMINS = 3;
    address public constant FEE_COLLECTOR = 0x20ce27B140A0EEECceF880e01D2082558400FDd6;
    
    // State variables
    uint256 public tradeCount;
    uint256 public tradeFee = 0.01 ether; // 0.01 ETH to match V7
    
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
        euint64 offeredETH;      // 🔐 Encrypted internally
        euint64 requestedETH;    // 🔐 Encrypted internally  
        uint256 expiryTime;
        TradeStatus status;
        string message;
        uint256 createdAt;
    }
    
    // Storage mappings
    mapping(uint256 => Trade) public trades;
    mapping(uint256 => NFTItem[]) public tradeOfferedNFTs;
    mapping(uint256 => NFTItem[]) public tradeRequestedNFTs;
    mapping(uint256 => uint256) public tradeOfferedNFTCount;
    mapping(uint256 => uint256) public tradeRequestedNFTCount;
    mapping(address => uint256[]) public userCreatedTrades;
    mapping(address => uint256[]) public userReceivedTrades;
    
    // Events
    event TradeCreated(uint256 indexed tradeId, address indexed creator, address indexed counterparty);
    event TradeAccepted(uint256 indexed tradeId, address indexed creator, address indexed acceptor);
    event TradeCancelled(uint256 indexed tradeId, address indexed canceller);
    event TradeExpired(uint256 indexed tradeId);
    event TradeDeclined(uint256 indexed tradeId, address indexed decliner);
    event TradeFeeUpdated(uint256 oldFee, uint256 newFee, address updatedBy);
    event AdminAdded(address indexed newAdmin, address indexed addedBy);
    event AdminRemoved(address indexed removedAdmin, address indexed removedBy);
    event TradeAdminCancelled(uint256 indexed tradeId, address indexed admin);
    event TradeAutoExpired(uint256 indexed tradeId);
    
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
        require(msg.sender == trades[tradeId].creator, "Only trade creator can perform this action");
        _;
    }
    
    modifier onlyCounterparty(uint256 tradeId) {
        require(msg.sender == trades[tradeId].counterparty, "Not trade counterparty");
        _;
    }
    
    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "Only admin can perform this action");
        _;
    }
    
    // Auto-expiration modifier
    modifier autoExpireCheck(uint256 tradeId) {
        if (_isTradeExpired(tradeId)) {
            _autoExpireTrade(tradeId);
        }
        _;
    }
    
    constructor() {
        // Set deployer as first admin
        isAdmin[msg.sender] = true;
        adminList.push(msg.sender);
    }
    
    /**
     * @dev Create a trade with V7 interface but fhEVM encryption internally
     * @param counterparty The address to trade with
     * @param offeredNFTs Array of NFTs being offered
     * @param requestedNFTs Array of NFTs being requested
     * @param requestedETH Amount of ETH requested (will be encrypted internally)
     * @param message Optional message for the trade
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
        require(
            offeredNFTs.length > 0 || requestedNFTs.length > 0 || msg.value > tradeFee || requestedETH > 0,
            "Trade must include at least one asset"
        );
        
        uint256 offeredETH = msg.value - tradeFee;
        tradeCount++;
        uint256 tradeId = tradeCount;
        
        // 🔐 Encrypt amounts internally (no proof needed - trivial encryption)
        euint64 offeredETHEncrypted = FHE.asEuint64(uint64(offeredETH));
        euint64 requestedETHEncrypted = FHE.asEuint64(uint64(requestedETH));
        
        // Create trade with encrypted amounts
        trades[tradeId] = Trade({
            id: tradeId,
            creator: msg.sender,
            counterparty: counterparty,
            offeredETH: offeredETHEncrypted,
            requestedETH: requestedETHEncrypted,
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
        
        tradeOfferedNFTCount[tradeId] = offeredNFTs.length;
        tradeRequestedNFTCount[tradeId] = requestedNFTs.length;
        
        // Track trades for users
        userCreatedTrades[msg.sender].push(tradeId);
        userReceivedTrades[counterparty].push(tradeId);
        
        // Grant FHE permissions
        FHE.allowThis(trades[tradeId].offeredETH);
        FHE.allowThis(trades[tradeId].requestedETH);
        FHE.allow(trades[tradeId].offeredETH, msg.sender);
        FHE.allow(trades[tradeId].requestedETH, msg.sender);
        FHE.allow(trades[tradeId].offeredETH, counterparty);
        FHE.allow(trades[tradeId].requestedETH, counterparty);
        
        // Send fee to collector
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
    
    function _isTradeExpired(uint256 tradeId) internal view returns (bool) {
        return block.timestamp > trades[tradeId].expiryTime && trades[tradeId].status == TradeStatus.Pending;
    }
    
    function _autoExpireTrade(uint256 tradeId) internal {
        Trade storage trade = trades[tradeId];
        trade.status = TradeStatus.Expired;
        
        // Return offered NFTs to creator
        for (uint256 i = 0; i < tradeOfferedNFTCount[tradeId]; i++) {
            NFTItem storage nft = tradeOfferedNFTs[tradeId][i];
            _transferNFTFromContract(nft, trade.creator);
        }
        
        emit TradeExpired(tradeId);
    }
    
    function _transferNFTFromContract(NFTItem memory nft, address to) internal {
        if (nft.standard == TokenStandard.ERC721) {
            IERC721(nft.contractAddress).safeTransferFrom(address(this), to, nft.tokenId);
        } else if (nft.standard == TokenStandard.ERC1155) {
            IERC1155(nft.contractAddress).safeTransferFrom(address(this), to, nft.tokenId, nft.amount, "");
        }
    }
    
    function _returnAssetsToCreator(uint256 tradeId) internal {
        Trade storage trade = trades[tradeId];
        
        // Return offered NFTs to creator
        for (uint256 i = 0; i < tradeOfferedNFTCount[tradeId]; i++) {
            NFTItem storage nft = tradeOfferedNFTs[tradeId][i];
            _transferNFTFromContract(nft, trade.creator);
        }
        
        // Note: With encrypted amounts, we simplify ETH handling
        // In production, you'd need proper encrypted amount settlement
    }
    
    // Trade lifecycle functions
    function acceptTrade(uint256 tradeId) 
        external 
        payable 
        nonReentrant 
        whenNotPaused
        tradeExists(tradeId)
        autoExpireCheck(tradeId)
        tradePending(tradeId)
        onlyCounterparty(tradeId)
    {
        Trade storage trade = trades[tradeId];
        require(msg.value >= tradeFee, "Insufficient fee payment");
        
        trade.status = TradeStatus.Accepted;
        
        // Transfer offered NFTs to counterparty (acceptor)
        for (uint256 i = 0; i < tradeOfferedNFTCount[tradeId]; i++) {
            NFTItem storage nft = tradeOfferedNFTs[tradeId][i];
            _transferNFTFromContract(nft, msg.sender);
        }
        
        // Transfer requested NFTs from counterparty to creator
        for (uint256 i = 0; i < tradeRequestedNFTCount[tradeId]; i++) {
            NFTItem storage nft = tradeRequestedNFTs[tradeId][i];
            _transferNFTToContract(nft, msg.sender);
            _transferNFTFromContract(nft, trade.creator);
        }
        
        // Handle fee
        if (tradeFee > 0) {
            payable(FEE_COLLECTOR).transfer(tradeFee);
        }
        
        // Note: Encrypted ETH settlement simplified for demo
        // In production, decrypt and transfer encrypted amounts
        
        emit TradeAccepted(tradeId, trade.creator, msg.sender);
    }
    
    function cancelTrade(uint256 tradeId)
        external
        nonReentrant
        tradeExists(tradeId)
        autoExpireCheck(tradeId)
        tradePending(tradeId)
        onlyTradeCreator(tradeId)
    {
        Trade storage trade = trades[tradeId];
        trade.status = TradeStatus.Cancelled;
        
        _returnAssetsToCreator(tradeId);
        
        emit TradeCancelled(tradeId, msg.sender);
    }
    
    function declineTrade(uint256 tradeId)
        external
        nonReentrant
        tradeExists(tradeId)
        autoExpireCheck(tradeId)
        tradePending(tradeId)
        onlyCounterparty(tradeId)
    {
        Trade storage trade = trades[tradeId];
        trade.status = TradeStatus.Declined;
        
        _returnAssetsToCreator(tradeId);
        
        emit TradeDeclined(tradeId, msg.sender);
    }
    
    function expireTrade(uint256 tradeId)
        external
        nonReentrant
        tradeExists(tradeId)
        tradePending(tradeId)
    {
        require(_isTradeExpired(tradeId), "Trade not yet expired");
        
        _autoExpireTrade(tradeId);
    }
    
    function adminCancelTrade(uint256 tradeId)
        external
        nonReentrant
        tradeExists(tradeId)
        tradePending(tradeId)
        onlyAdmin
    {
        Trade storage trade = trades[tradeId];
        trade.status = TradeStatus.Cancelled;
        
        _returnAssetsToCreator(tradeId);
        
        emit TradeAdminCancelled(tradeId, msg.sender);
    }
    
    // Admin functions
    function setTradeFee(uint256 newFee) external onlyAdmin {
        require(newFee <= MAX_TRADE_FEE, "Fee exceeds maximum limit");
        uint256 oldFee = tradeFee;
        tradeFee = newFee;
        emit TradeFeeUpdated(oldFee, newFee, msg.sender);
    }
    
    function addAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin address");
        require(!isAdmin[newAdmin], "Address is already an admin");
        require(adminList.length < MAX_ADMINS, "Maximum admin limit reached");
        
        isAdmin[newAdmin] = true;
        adminList.push(newAdmin);
        
        emit AdminAdded(newAdmin, msg.sender);
    }
    
    function removeAdmin(address adminToRemove) external onlyAdmin {
        require(isAdmin[adminToRemove], "Address is not an admin");
        require(adminList.length > 1, "Cannot remove the last admin");
        require(adminToRemove != msg.sender, "Cannot remove yourself");
        
        isAdmin[adminToRemove] = false;
        
        for (uint256 i = 0; i < adminList.length; i++) {
            if (adminList[i] == adminToRemove) {
                adminList[i] = adminList[adminList.length - 1];
                adminList.pop();
                break;
            }
        }
        
        emit AdminRemoved(adminToRemove, msg.sender);
    }
    
    function pause() external onlyAdmin {
        _pause();
    }
    
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    // View functions
    function getTradeFee() external view returns (uint256) {
        return tradeFee;
    }
    
    function getAdminCount() external view returns (uint256) {
        return adminList.length;
    }
    
    function getAdmins() external view returns (address[] memory) {
        return adminList;
    }
    
    function getUserCreatedTrades(address user) external view returns (uint256[] memory) {
        return userCreatedTrades[user];
    }
    
    function getUserReceivedTrades(address user) external view returns (uint256[] memory) {
        return userReceivedTrades[user];
    }
    
    function isTradeExpired(uint256 tradeId) external view returns (bool) {
        return _isTradeExpired(tradeId);
    }
    
    function getOfferedNFTs(uint256 tradeId) external view returns (NFTItem[] memory) {
        return tradeOfferedNFTs[tradeId];
    }
    
    function getRequestedNFTs(uint256 tradeId) external view returns (NFTItem[] memory) {
        return tradeRequestedNFTs[tradeId];
    }
    
    function getTrade(uint256 tradeId) external view tradeExists(tradeId) returns (
        uint256 id,
        address creator,
        address counterparty,
        uint256 expiryTime,
        TradeStatus status,
        string memory message,
        uint256 createdAt
    ) {
        Trade storage trade = trades[tradeId];
        return (
            trade.id,
            trade.creator,
            trade.counterparty,
            trade.expiryTime,
            trade.status,
            trade.message,
            trade.createdAt
        );
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Holder) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
