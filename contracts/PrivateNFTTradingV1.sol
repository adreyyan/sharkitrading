// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import { FHE, euint256 } from "@fhevm/solidity/lib/FHE.sol";
import "./PrivateNFTVault.sol";

/**
 * @title PrivateNFTTradingV1
 * @dev P2P trading with vault receipts for true NFT privacy
 * 
 * ✅ How Privacy Works:
 * 1. Receipt IDs are public (1, 2, 3...)
 * 2. BUT vault's mapping is encrypted (Receipt #5 → ??? NFT)
 * 3. Public sees receipt numbers change hands
 * 4. Public CANNOT see which NFTs those receipts represent!
 * 
 * ✅ Trade Verification:
 * - Traders verify off-chain before accepting
 * - OR use trust-based trading (for blind mystery boxes)
 * - OR future: Client-side decryption with fhevmjs
 * 
 * 🎯 PERFECT FOR HACKATHON: Shows real privacy without client complexity!
 */
contract PrivateNFTTradingV1 is ReentrancyGuard, Pausable {
    
    PrivateNFTVault public immutable vault;
    
    uint256 public tradeCount;
    uint256 public tradeFee = 0.01 ether;
    address public constant FEE_COLLECTOR = 0x20ce27B140A0EEECceF880e01D2082558400FDd6;
    
    enum TradeStatus { Pending, Accepted, Cancelled, Declined }
    
    struct Trade {
        uint256 id;
        address creator;
        address counterparty;
        uint256[] offeredReceiptIds;   // ← PLAIN uint256!
        uint256[] requestedReceiptIds; // ← PLAIN uint256!
        uint256 offeredETH;            // ← PLAIN uint256!
        uint256 requestedETH;          // ← PLAIN uint256!
        TradeStatus status;
        string message;
        uint256 createdAt;
    }
    
    mapping(uint256 => Trade) public trades;
    mapping(address => uint256[]) public userCreatedTrades;
    mapping(address => uint256[]) public userReceivedTrades;
    
    event TradeCreated(uint256 indexed tradeId, address indexed creator, address indexed counterparty);
    event TradeAccepted(uint256 indexed tradeId, address indexed creator, address indexed acceptor);
    event TradeCancelled(uint256 indexed tradeId);
    event TradeDeclined(uint256 indexed tradeId);
    
    constructor(address vaultAddress) {
        require(vaultAddress != address(0), "Invalid vault address");
        vault = PrivateNFTVault(vaultAddress);
    }
    
    /**
     * @dev Create trade with vault receipts (SIMPLIFIED!)
     * @param counterparty Who to trade with
     * @param offeredReceiptIds Plain receipt IDs you're offering
     * @param requestedReceiptIds Plain receipt IDs you're requesting
     * @param requestedETH ETH amount you're requesting
     * @param message Trade message
     */
    function createTrade(
        address counterparty,
        uint256[] calldata offeredReceiptIds,
        uint256[] calldata requestedReceiptIds,
        uint256 requestedETH,
        string calldata message
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        require(counterparty != address(0), "Invalid counterparty");
        require(counterparty != msg.sender, "Cannot trade with yourself");
        require(msg.value >= tradeFee, "Insufficient fee");
        require(
            offeredReceiptIds.length > 0 || msg.value > tradeFee || requestedETH > 0, 
            "Nothing offered"
        );
        require(
            requestedReceiptIds.length > 0 || requestedETH > 0, 
            "Nothing requested"
        );
        
        uint256 offeredETH = msg.value - tradeFee;
        tradeCount++;
        uint256 tradeId = tradeCount;
        
        // Store trade
        Trade storage trade = trades[tradeId];
        trade.id = tradeId;
        trade.creator = msg.sender;
        trade.counterparty = counterparty;
        trade.offeredReceiptIds = offeredReceiptIds;
        trade.requestedReceiptIds = requestedReceiptIds;
        trade.offeredETH = offeredETH;
        trade.requestedETH = requestedETH;
        trade.status = TradeStatus.Pending;
        trade.message = message;
        trade.createdAt = block.timestamp;
        
        // Track trades
        userCreatedTrades[msg.sender].push(tradeId);
        userReceivedTrades[counterparty].push(tradeId);
        
        // Send fee to collector
        if (tradeFee > 0) {
            payable(FEE_COLLECTOR).transfer(tradeFee);
        }
        
        emit TradeCreated(tradeId, msg.sender, counterparty);
        return tradeId;
    }
    
    /**
     * @dev Accept trade (SIMPLIFIED - instant execution!)
     * @param tradeId The trade ID to accept
     */
    function acceptTrade(uint256 tradeId) external payable nonReentrant whenNotPaused {
        Trade storage trade = trades[tradeId];
        
        require(trade.id == tradeId, "Trade does not exist");
        require(trade.status == TradeStatus.Pending, "Trade not pending");
        require(trade.counterparty == msg.sender, "Not trade counterparty");
        require(msg.value >= tradeFee + trade.requestedETH, "Insufficient payment");
        
        uint256 payment = msg.value - tradeFee;
        require(payment >= trade.requestedETH, "Insufficient ETH");
        
        // Update status
        trade.status = TradeStatus.Accepted;
        
        // Transfer receipts (PRIVACY MAINTAINED! 🔐)
        // Public sees: "Receipt #X transferred"
        // Public CANNOT see: Which NFT that receipt represents!
        for (uint256 i = 0; i < trade.offeredReceiptIds.length; i++) {
            // Use helper function that accepts plain IDs
            vault.transferReceiptById(trade.offeredReceiptIds[i], msg.sender);
        }
        
        for (uint256 i = 0; i < trade.requestedReceiptIds.length; i++) {
            vault.transferReceiptById(trade.requestedReceiptIds[i], trade.creator);
        }
        
        // Send fee to collector
        if (tradeFee > 0) {
            payable(FEE_COLLECTOR).transfer(tradeFee);
        }
        
        // Transfer ETH to creator
        if (trade.offeredETH > 0) {
            payable(msg.sender).transfer(trade.offeredETH);
        }
        
        // Transfer ETH to counterparty (requested amount)
        if (trade.requestedETH > 0) {
            payable(trade.creator).transfer(trade.requestedETH);
        }
        
        // Return excess ETH
        uint256 excess = payment - trade.requestedETH;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }
        
        emit TradeAccepted(tradeId, trade.creator, msg.sender);
    }
    
    /**
     * @dev Cancel trade (creator only)
     */
    function cancelTrade(uint256 tradeId) external nonReentrant {
        Trade storage trade = trades[tradeId];
        
        require(trade.id == tradeId, "Trade does not exist");
        require(trade.creator == msg.sender, "Not trade creator");
        require(trade.status == TradeStatus.Pending, "Trade not pending");
        
        trade.status = TradeStatus.Cancelled;
        
        // Refund offered ETH
        if (trade.offeredETH > 0) {
            payable(msg.sender).transfer(trade.offeredETH);
        }
        
        emit TradeCancelled(tradeId);
    }
    
    /**
     * @dev Decline trade (counterparty only)
     */
    function declineTrade(uint256 tradeId) external nonReentrant {
        Trade storage trade = trades[tradeId];
        
        require(trade.id == tradeId, "Trade does not exist");
        require(trade.counterparty == msg.sender, "Not trade counterparty");
        require(trade.status == TradeStatus.Pending, "Trade not pending");
        
        trade.status = TradeStatus.Declined;
        
        // Refund offered ETH to creator
        if (trade.offeredETH > 0) {
            payable(trade.creator).transfer(trade.offeredETH);
        }
        
        emit TradeDeclined(tradeId);
    }
    
    /**
     * @dev Get trade details
     */
    function getTrade(uint256 tradeId) external view returns (Trade memory) {
        return trades[tradeId];
    }
    
    /**
     * @dev Get user's created trades
     */
    function getUserCreatedTrades(address user) external view returns (uint256[] memory) {
        return userCreatedTrades[user];
    }
    
    /**
     * @dev Get user's received trades
     */
    function getUserReceivedTrades(address user) external view returns (uint256[] memory) {
        return userReceivedTrades[user];
    }
    
    /**
     * @dev Update trade fee (admin)
     */
    function setTradeFee(uint256 newFee) external {
        // Add proper admin control in production
        tradeFee = newFee;
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external {
        // Add proper admin control in production
        _pause();
    }
    
    /**
     * @dev Unpause
     */
    function unpause() external {
        // Add proper admin control in production
        _unpause();
    }
}

