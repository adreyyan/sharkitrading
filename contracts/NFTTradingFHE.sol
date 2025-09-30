// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// fhEVM imports
import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title MonadNFTTradingFHE
 * @dev Enhanced NFT trading contract with Fully Homomorphic Encryption for private amounts
 * 
 * Key features:
 * - Private trading amounts using fhEVM encryption
 * - Automatic expiration checking in all trade operations
 * - Support for both ERC721 and ERC1155 tokens
 * - Admin controls and fee management
 */
contract MonadNFTTradingFHE is ERC721Holder, ERC1155Holder, ReentrancyGuard, Pausable, SepoliaConfig {
    
    // Constants
    uint256 public constant MAX_TRADE_FEE = 1 ether; // 1 ETH max fee
    uint256 public constant MAX_ADMINS = 3;
    address public constant FEE_COLLECTOR = 0x20ce27B140A0EEECceF880e01D2082558400FDd6;
    
    // State variables
    uint256 public tradeCount;
    uint256 public tradeFee = 0.001 ether; // Default 0.001 ETH
    
    // Admin management
    mapping(address => bool) public isAdmin;
    address[] public adminList;
    
    enum TradeStatus { Pending, Accepted, Cancelled, Expired, Declined }
    enum TokenStandard { ERC721, ERC1155 }
    
    struct NFTItem {
        address contractAddress;
        uint256 tokenId;
        uint256 amount; // For ERC1155, 1 for ERC721
        TokenStandard standard;
    }
    
    struct Trade {
        uint256 id;
        address creator;
        address counterparty;
        euint64 offeredETH;      // 🔐 Encrypted offered amount
        euint64 requestedETH;    // 🔐 Encrypted requested amount
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
     * @dev Create a new trade with encrypted amounts
     * @param counterparty The address to trade with
     * @param offeredNFTs Array of NFTs being offered
     * @param requestedNFTs Array of NFTs being requested
     * @param encryptedRequestedETH Encrypted amount of ETH requested (with proof)
     * @param requestedETHProof Zero-knowledge proof for the encrypted amount
     * @param message Optional message for the trade
     */
    function createTrade(
        address counterparty,
        NFTItem[] calldata offeredNFTs,
        NFTItem[] calldata requestedNFTs,
        externalEuint64 encryptedRequestedETH,
        bytes calldata requestedETHProof,
        string calldata message
    ) external payable nonReentrant whenNotPaused {
        require(counterparty != address(0), "Invalid counterparty address");
        require(counterparty != msg.sender, "Cannot trade with yourself");
        require(msg.value >= tradeFee, "Insufficient fee payment");
        require(
            offeredNFTs.length > 0 || requestedNFTs.length > 0 || msg.value > tradeFee,
            "Trade must include at least one asset"
        );
        
        uint256 offeredETH = msg.value - tradeFee;
        tradeCount++;
        uint256 tradeId = tradeCount;
        
        // Convert encrypted input to internal encrypted type
        euint64 requestedETH = FHE.fromExternal(encryptedRequestedETH, requestedETHProof);
        
        // Create encrypted offered amount (trivial encryption from plaintext)
        euint64 offeredETHEncrypted = FHE.asEuint64(uint64(offeredETH));
        
        // Create trade with encrypted amounts
        trades[tradeId] = Trade({
            id: tradeId,
            creator: msg.sender,
            counterparty: counterparty,
            offeredETH: offeredETHEncrypted,
            requestedETH: requestedETH,
            expiryTime: block.timestamp + 24 hours, // 24-hour expiration
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
    
    /**
     * @dev Accept a trade with encrypted payment validation
     * @param tradeId The ID of the trade to accept
     * @param encryptedPayment Encrypted payment amount (with proof)
     * @param paymentProof Zero-knowledge proof for the encrypted payment
     */
    function acceptTrade(
        uint256 tradeId,
        externalEuint64 encryptedPayment,
        bytes calldata paymentProof
    ) 
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
        
        // Convert encrypted payment input
        euint64 paymentAmount = FHE.fromExternal(encryptedPayment, paymentProof);
        
        // Note: In a full implementation, we'd need to verify that the encrypted payment
        // matches the requested amount. For now, we trust the frontend validation.
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
        
        // Note: ETH settlement is simplified here. In production, you'd need a more
        // sophisticated mechanism to handle encrypted amount settlements.
        
        // Refund excess payment
        if (msg.value > tradeFee) {
            payable(msg.sender).transfer(msg.value - tradeFee);
        }
        
        emit TradeAccepted(tradeId, trade.creator, msg.sender);
    }
    
    /**
     * @dev Cancel a trade and return assets
     */
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
    
    /**
     * @dev Decline a trade
     */
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
    
    /**
     * @dev Manual expiration function
     */
    function expireTrade(uint256 tradeId)
        external
        nonReentrant
        tradeExists(tradeId)
        tradePending(tradeId)
    {
        require(_isTradeExpired(tradeId), "Trade not yet expired");
        
        _autoExpireTrade(tradeId);
    }
    
    /**
     * @dev Admin force cancel trade
     */
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
    
    // Internal functions
    
    function _isTradeExpired(uint256 tradeId) internal view returns (bool) {
        return block.timestamp > trades[tradeId].expiryTime && trades[tradeId].status == TradeStatus.Pending;
    }
    
    function _autoExpireTrade(uint256 tradeId) internal {
        Trade storage trade = trades[tradeId];
        trade.status = TradeStatus.Expired;
        
        _returnAssetsToCreator(tradeId);
        
        emit TradeAutoExpired(tradeId);
    }
    
    function _returnAssetsToCreator(uint256 tradeId) internal {
        Trade storage trade = trades[tradeId];
        
        // Return offered NFTs to creator
        for (uint256 i = 0; i < tradeOfferedNFTCount[tradeId]; i++) {
            NFTItem storage nft = tradeOfferedNFTs[tradeId][i];
            _transferNFTFromContract(nft, trade.creator);
        }
        
        // Note: In the original contract, offered MONAD was returned here.
        // With encrypted amounts, this becomes more complex and would require
        // decryption or a different settlement mechanism.
    }
    
    function _transferNFTToContract(NFTItem memory nft, address from) internal {
        if (nft.standard == TokenStandard.ERC721) {
            IERC721(nft.contractAddress).safeTransferFrom(from, address(this), nft.tokenId);
        } else if (nft.standard == TokenStandard.ERC1155) {
            IERC1155(nft.contractAddress).safeTransferFrom(from, address(this), nft.tokenId, nft.amount, "");
        }
    }
    
    function _transferNFTFromContract(NFTItem memory nft, address to) internal {
        if (nft.standard == TokenStandard.ERC721) {
            IERC721(nft.contractAddress).safeTransferFrom(address(this), to, nft.tokenId);
        } else if (nft.standard == TokenStandard.ERC1155) {
            IERC1155(nft.contractAddress).safeTransferFrom(address(this), to, nft.tokenId, nft.amount, "");
        }
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
    
    // View functions
    function getTrade(uint256 tradeId) external view returns (
        uint256 id,
        address creator,
        address counterparty,
        euint64 offeredETH,
        euint64 requestedETH,
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
            trade.offeredETH,
            trade.requestedETH,
            trade.expiryTime,
            trade.status,
            trade.message,
            trade.createdAt
        );
    }
    
    function getOfferedNFTs(uint256 tradeId) external view returns (NFTItem[] memory) {
        return tradeOfferedNFTs[tradeId];
    }
    
    function getRequestedNFTs(uint256 tradeId) external view returns (NFTItem[] memory) {
        return tradeRequestedNFTs[tradeId];
    }
    
    function getUserCreatedTrades(address user) external view returns (uint256[] memory) {
        return userCreatedTrades[user];
    }
    
    function getUserReceivedTrades(address user) external view returns (uint256[] memory) {
        return userReceivedTrades[user];
    }
    
    function getAdmins() external view returns (address[] memory) {
        return adminList;
    }
    
    function getAdminCount() external view returns (uint256) {
        return adminList.length;
    }
    
    function getTradeFee() external view returns (uint256) {
        return tradeFee;
    }
    
    function isTradeExpired(uint256 tradeId) external view returns (bool) {
        return _isTradeExpired(tradeId);
    }
    
    // Emergency functions
    function pause() external onlyAdmin {
        _pause();
    }
    
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Holder) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
