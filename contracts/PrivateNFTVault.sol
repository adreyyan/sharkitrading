// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import { FHE, euint64, euint256, eaddress, externalEuint256, externalEaddress, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title PrivateNFTVault
 * @dev Vault system that enables PERSISTENT NFT privacy:
 *      1. Deposit real NFT → Get encrypted receipt
 *      2. Trade encrypted receipts (FULLY PRIVATE)
 *      3. Withdraw → Reveal NFT (becomes public)
 * 
 * @notice This is the KEY to achieving privacy AFTER trade execution!
 *         NFTs stay private as long as they remain in the vault.
 */
contract PrivateNFTVault is ERC721Holder, ERC1155Holder, ReentrancyGuard, Pausable, SepoliaConfig {
    
    enum TokenStandard { ERC721, ERC1155 }
    
    struct DepositedNFT {
        eaddress nftContract;      // 🔐 Encrypted NFT address
        euint256 tokenId;          // 🔐 Encrypted token ID
        euint64 amount;            // 🔐 Encrypted amount (for ERC1155)
        address depositor;         // Owner (public for permissions)
        TokenStandard standard;    // Token type (public - needed for logic)
        bool exists;               // Deposit exists
    }
    
    // State
    uint256 public nextReceiptId;
    mapping(euint256 => DepositedNFT) private deposits;
    mapping(address => euint256[]) public userReceipts;
    
    // 🔑 APPROVAL SYSTEM - Allow trading contracts to transfer receipts
    mapping(address => mapping(address => bool)) private operatorApprovals;
    
    // Decryption tracking for async operations
    mapping(uint256 => euint256) private decryptRequestToReceipt;
    mapping(uint256 => address) private decryptRequestWithdrawer;
    
    // Events
    event NFTDeposited(address indexed user, uint256 receiptId);
    event WithdrawInitiated(address indexed user, uint256 receiptId, uint256 requestId);
    event NFTWithdrawn(address indexed user, address nftContract, uint256 tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    
    constructor() {
        nextReceiptId = 1; // Start from 1 (0 = invalid)
    }
    
    /**
     * @dev Deposit NFT and get encrypted receipt
     * @param nftContract The NFT contract address
     * @param tokenId The token ID
     * @param amount Amount (for ERC1155, use 1 for ERC721)
     * @param standard Token standard (0 = ERC721, 1 = ERC1155)
     * @return receiptId Encrypted receipt ID (euint256)
     */
    function deposit(
        address nftContract,
        uint256 tokenId,
        uint256 amount,
        TokenStandard standard
    ) external nonReentrant whenNotPaused returns (euint256 receiptId) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(amount > 0, "Amount must be > 0");
        
        // Transfer NFT to vault
        if (standard == TokenStandard.ERC721) {
            IERC721(nftContract).safeTransferFrom(msg.sender, address(this), tokenId);
        } else {
            IERC1155(nftContract).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        }
        
        // Generate encrypted receipt ID
        uint256 plainReceiptId = nextReceiptId++;
        receiptId = FHE.asEuint256(plainReceiptId);
        
        // 🔐 Encrypt NFT details
        eaddress encryptedContract = FHE.asEaddress(nftContract);
        euint256 encryptedTokenId = FHE.asEuint256(tokenId);
        euint64 encryptedAmount = FHE.asEuint64(uint64(amount));
        
        // Store encrypted deposit
        deposits[receiptId] = DepositedNFT({
            nftContract: encryptedContract,
            tokenId: encryptedTokenId,
            amount: encryptedAmount,
            depositor: msg.sender,
            standard: standard,
            exists: true
        });
        
        // Track user receipts
        userReceipts[msg.sender].push(receiptId);
        
        // Grant permissions for encrypted data
        FHE.allowThis(receiptId);
        FHE.allowThis(encryptedContract);
        FHE.allowThis(encryptedTokenId);
        FHE.allowThis(encryptedAmount);
        FHE.allow(receiptId, msg.sender);
        FHE.allow(encryptedContract, msg.sender);
        FHE.allow(encryptedTokenId, msg.sender);
        FHE.allow(encryptedAmount, msg.sender);
        
        emit NFTDeposited(msg.sender, plainReceiptId);
    }
    
    /**
     * @dev Initiate withdrawal (requests async decryption)
     * @param receiptId The encrypted receipt ID
     */
    function initiateWithdraw(euint256 receiptId) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (uint256 requestId) 
    {
        DepositedNFT storage nft = deposits[receiptId];
        require(nft.exists, "Receipt does not exist");
        require(nft.depositor == msg.sender, "Not receipt owner");
        
        // Request async decryption of NFT details
        bytes32[] memory handles = new bytes32[](3);
        handles[0] = eaddress.unwrap(nft.nftContract);
        handles[1] = euint256.unwrap(nft.tokenId);
        handles[2] = euint64.unwrap(nft.amount);
        
        requestId = FHE.requestDecryption(
            handles,
            this.fulfillWithdraw.selector
        );
        
        decryptRequestToReceipt[requestId] = receiptId;
        decryptRequestWithdrawer[requestId] = msg.sender;
        
        emit WithdrawInitiated(msg.sender, uint256(euint256.unwrap(receiptId)), requestId);
    }
    
    /**
     * @dev Initiate withdraw using plain ID (helper for frontend)
     * @param plainReceiptId The plain receipt ID (1, 2, 3...)
     * @return requestId The decryption request ID
     */
    function initiateWithdrawById(uint256 plainReceiptId) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (uint256 requestId) 
    {
        // Convert plain ID to encrypted ID
        euint256 receiptId = FHE.asEuint256(plainReceiptId);
        
        DepositedNFT storage nft = deposits[receiptId];
        require(nft.exists, "Receipt does not exist");
        require(nft.depositor == msg.sender, "Not receipt owner");
        
        // Request async decryption of NFT details
        bytes32[] memory handles = new bytes32[](3);
        handles[0] = eaddress.unwrap(nft.nftContract);
        handles[1] = euint256.unwrap(nft.tokenId);
        handles[2] = euint64.unwrap(nft.amount);
        
        requestId = FHE.requestDecryption(
            handles,
            this.fulfillWithdraw.selector
        );
        
        decryptRequestToReceipt[requestId] = receiptId;
        decryptRequestWithdrawer[requestId] = msg.sender;
        
        emit WithdrawInitiated(msg.sender, plainReceiptId, requestId);
    }
    
    /**
     * @dev Oracle callback - completes withdrawal with decrypted values
     * @param requestId The decryption request ID
     * @param nftContract Decrypted NFT contract address
     * @param tokenId Decrypted token ID
     * @param amount Decrypted amount
     */
    function fulfillWithdraw(
        uint256 requestId,
        address nftContract,
        uint256 tokenId,
        uint64 amount
    ) external nonReentrant {
        euint256 receiptId = decryptRequestToReceipt[requestId];
        address withdrawer = decryptRequestWithdrawer[requestId];
        
        require(withdrawer != address(0), "Invalid request");
        
        DepositedNFT storage nft = deposits[receiptId];
        require(nft.exists, "Receipt does not exist");
        require(nft.depositor == withdrawer, "Not authorized");
        
        // Mark as withdrawn
        nft.exists = false;
        
        // Transfer NFT back to depositor
        if (nft.standard == TokenStandard.ERC721) {
            IERC721(nftContract).safeTransferFrom(address(this), withdrawer, tokenId);
        } else {
            IERC1155(nftContract).safeTransferFrom(address(this), withdrawer, tokenId, amount, "");
        }
        
        emit NFTWithdrawn(withdrawer, nftContract, tokenId);
    }
    
    /**
     * @dev Transfer receipt to another user (STAYS PRIVATE!)
     * @param receiptId The encrypted receipt ID
     * @param to The recipient address
     * 
     * Can be called by:
     * - Receipt owner
     * - Approved operator (e.g., trading contract)
     */
    function transferReceipt(euint256 receiptId, address to) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(to != address(0), "Invalid recipient");
        
        DepositedNFT storage nft = deposits[receiptId];
        require(nft.exists, "Receipt does not exist");
        
        // ✅ Check authorization: owner OR approved operator
        require(
            nft.depositor == msg.sender || 
            operatorApprovals[nft.depositor][msg.sender],
            "Not authorized to transfer"
        );
        
        // Transfer ownership
        nft.depositor = to;
        
        // Update tracking
        userReceipts[to].push(receiptId);
        
        // Grant permissions to new owner
        FHE.allow(receiptId, to);
        FHE.allow(nft.nftContract, to);
        FHE.allow(nft.tokenId, to);
        FHE.allow(nft.amount, to);
    }
    
    /**
     * @dev Transfer receipt using plain ID (for trading contracts)
     * @param plainReceiptId The plain receipt ID (1, 2, 3...)
     * @param to The recipient address
     * 
     * This is a helper for external contracts that work with plain IDs
     */
    function transferReceiptById(uint256 plainReceiptId, address to) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        euint256 receiptId = FHE.asEuint256(plainReceiptId);
        
        require(to != address(0), "Invalid recipient");
        
        DepositedNFT storage nft = deposits[receiptId];
        require(nft.exists, "Receipt does not exist");
        
        // ✅ Check authorization: owner OR approved operator
        require(
            nft.depositor == msg.sender || 
            operatorApprovals[nft.depositor][msg.sender],
            "Not authorized to transfer"
        );
        
        // Transfer ownership
        nft.depositor = to;
        
        // Update tracking
        userReceipts[to].push(receiptId);
        
        // Grant permissions to new owner
        FHE.allow(receiptId, to);
        FHE.allow(nft.nftContract, to);
        FHE.allow(nft.tokenId, to);
        FHE.allow(nft.amount, to);
    }
    
    /**
     * @dev Approve operator to transfer all your receipts (like ERC721)
     * @param operator The address to approve (e.g., trading contract)
     * @param approved True to approve, false to revoke
     */
    function setApprovalForAll(address operator, bool approved) external {
        require(operator != address(0), "Invalid operator");
        require(operator != msg.sender, "Cannot approve yourself");
        
        operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    /**
     * @dev Check if operator is approved for all receipts
     * @param owner The receipt owner
     * @param operator The operator address
     * @return True if approved
     */
    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return operatorApprovals[owner][operator];
    }
    
    /**
     * @dev Check if user owns a receipt (encrypted check)
     * @param receiptId The encrypted receipt ID
     * @return True if caller owns the receipt
     */
    function ownsReceipt(euint256 receiptId) external view returns (bool) {
        DepositedNFT storage nft = deposits[receiptId];
        return nft.exists && nft.depositor == msg.sender;
    }
    
    /**
     * @dev Get user's receipts
     */
    function getUserReceipts(address user) external view returns (euint256[] memory) {
        return userReceipts[user];
    }
    
    /**
     * @dev Get encrypted NFT details (only owner can decrypt with FHE client)
     */
    function getReceiptDetails(euint256 receiptId) 
        external 
        view 
        returns (
            eaddress nftContract,
            euint256 tokenId,
            euint64 amount,
            address depositor,
            TokenStandard standard
        ) 
    {
        DepositedNFT storage nft = deposits[receiptId];
        require(nft.exists, "Receipt does not exist");
        
        return (
            nft.nftContract,
            nft.tokenId,
            nft.amount,
            nft.depositor,
            nft.standard
        );
    }
    
    function pause() external {
        // Add admin check if needed
        _pause();
    }
    
    function unpause() external {
        // Add admin check if needed
        _unpause();
    }
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        virtual 
        override(ERC1155Holder) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}

