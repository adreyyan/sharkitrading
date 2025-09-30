const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678"; // ✅ V4 CONTRACT
const TRADE_ID = 3; // The failing trade ID from the error

// Contract ABI (just the functions we need)
const CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "tradeId", "type": "uint256"}],
    "name": "getTrade",
    "outputs": [
      {"internalType": "uint256", "name": "id", "type": "uint256"},
      {"internalType": "address", "name": "creator", "type": "address"},
      {"internalType": "address", "name": "counterparty", "type": "address"},
      {"internalType": "uint256", "name": "offeredMONAD", "type": "uint256"},
      {"internalType": "uint256", "name": "requestedMONAD", "type": "uint256"},
      {"internalType": "uint256", "name": "expiryTime", "type": "uint256"},
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "string", "name": "message", "type": "string"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tradeId", "type": "uint256"}],
    "name": "getRequestedNFTs",
    "outputs": [
      {"components": [
        {"internalType": "address", "name": "contractAddress", "type": "address"},
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"},
        {"internalType": "uint8", "name": "standard", "type": "uint8"}
      ], "internalType": "struct MonadNFTTrading.NFTItem[]", "name": "", "type": "tuple[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tradeId", "type": "uint256"}],
    "name": "getOfferedNFTs",
    "outputs": [
      {"components": [
        {"internalType": "address", "name": "contractAddress", "type": "address"},
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"},
        {"internalType": "uint8", "name": "standard", "type": "uint8"}
      ], "internalType": "struct MonadNFTTrading.NFTItem[]", "name": "", "type": "tuple[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tradeId", "type": "uint256"}],
    "name": "acceptTrade",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

async function main() {
  console.log("🔍 Debugging Trade Acceptance Issue");
  console.log("====================================");
  
  // Get signer from environment
  let signer;
  try {
    const signers = await ethers.getSigners();
    if (signers.length === 0) {
      console.log("❌ No signers available. Make sure PRIVATE_KEY is set in .env");
      return;
    }
    signer = signers[0];
  } catch (error) {
    console.log("❌ Error getting signer:", error.message);
    return;
  }

  const userAddress = await signer.getAddress();
  
  console.log("👤 User Address:", userAddress);
  console.log("🏠 Contract Address:", CONTRACT_ADDRESS);
  console.log("🆔 Trade ID:", TRADE_ID);
  console.log("");
  
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  
  try {
    // 1. Check if trade exists
    console.log("1️⃣ Checking trade details...");
    const [id, creator, counterparty, offeredMONAD, requestedMONAD, expiryTime, status, message, createdAt] = await contract.getTrade(TRADE_ID);
    
    if (!creator || creator === ethers.ZeroAddress) {
      console.log("❌ Trade does not exist!");
      return;
    }
    
    console.log("✅ Trade found!");
    console.log("   Creator:", creator);
    console.log("   Counterparty:", counterparty);
    console.log("   Offered MONAD:", ethers.formatEther(offeredMONAD));
    console.log("   Requested MONAD:", ethers.formatEther(requestedMONAD));
    console.log("   Status:", status === 0 ? "Pending" : status === 1 ? "Accepted" : status === 2 ? "Cancelled" : "Expired");
    console.log("   Expiry:", new Date(Number(expiryTime) * 1000).toLocaleString());
    console.log("");
    
    // 2. Check if user is counterparty
    console.log("2️⃣ Checking user permissions...");
    if (counterparty.toLowerCase() !== userAddress.toLowerCase()) {
      console.log("❌ You are not the counterparty for this trade!");
      console.log("   Expected:", counterparty);
      console.log("   Got:", userAddress);
      return;
    }
    console.log("✅ You are the counterparty!");
    console.log("");
    
    // 3. Check trade status
    console.log("3️⃣ Checking trade status...");
    if (status !== 0) {
      console.log("❌ Trade is not pending!");
      const statusText = status === 1 ? "Accepted" : status === 2 ? "Cancelled" : "Expired";
      console.log("   Status:", statusText);
      return;
    }
    console.log("✅ Trade is pending!");
    console.log("");
    
    // 4. Check if expired
    console.log("4️⃣ Checking expiry...");
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > Number(expiryTime)) {
      console.log("❌ Trade has expired!");
      console.log("   Current time:", new Date(currentTime * 1000).toLocaleString());
      console.log("   Expiry time:", new Date(Number(expiryTime) * 1000).toLocaleString());
      return;
    }
    console.log("✅ Trade is not expired!");
    console.log("");
    
    // 5. Check user balance
    console.log("5️⃣ Checking MONAD balance...");
    const userBalance = await signer.provider.getBalance(userAddress);
    console.log("   Required MONAD:", ethers.formatEther(requestedMONAD));
    console.log("   Available MONAD:", ethers.formatEther(userBalance));
    
    if (userBalance < requestedMONAD) {
      console.log("❌ Insufficient MONAD balance!");
      return;
    }
    console.log("✅ Sufficient MONAD balance!");
    console.log("");
    
    // 6. Check offered NFTs (what the creator offered)
    console.log("6️⃣ Checking offered NFTs (what you'll receive)...");
    const offeredNFTs = await contract.getOfferedNFTs(TRADE_ID);
    console.log("   Number of offered NFTs:", offeredNFTs.length);
    
    for (let i = 0; i < offeredNFTs.length; i++) {
      const nft = offeredNFTs[i];
      console.log(`   Offered NFT ${i + 1}:`);
      console.log(`     Contract: ${nft.contractAddress}`);
      console.log(`     Token ID: ${nft.tokenId}`);
      console.log(`     Amount: ${nft.amount}`);
      console.log(`     Standard: ${nft.standard === 0 ? 'ERC721' : 'ERC1155'}`);
      console.log(`     Status: Currently held by contract (escrowed)`);
      console.log("");
    }
    
    // 7. Check requested NFTs (what you need to provide)
    console.log("7️⃣ Checking requested NFTs (what you need to provide)...");
    const requestedNFTs = await contract.getRequestedNFTs(TRADE_ID);
    console.log("   Number of requested NFTs:", requestedNFTs.length);
    
    for (let i = 0; i < requestedNFTs.length; i++) {
      const nft = requestedNFTs[i];
      console.log(`   Requested NFT ${i + 1}:`);
      console.log(`     Contract: ${nft.contractAddress}`);
      console.log(`     Token ID: ${nft.tokenId}`);
      console.log(`     Amount: ${nft.amount}`);
      console.log(`     Standard: ${nft.standard === 0 ? 'ERC721' : 'ERC1155'}`);
      
      try {
        if (nft.standard === 0) { // ERC721
          const erc721Contract = new ethers.Contract(
            nft.contractAddress,
            [
              'function ownerOf(uint256 tokenId) view returns (address)',
              'function getApproved(uint256 tokenId) view returns (address)',
              'function isApprovedForAll(address owner, address operator) view returns (bool)'
            ],
            signer
          );
          
          const owner = await erc721Contract.ownerOf(nft.tokenId);
          console.log(`     Current Owner: ${owner}`);
          
          if (owner.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
            console.log("     ⚠️ NFT is currently held by the trading contract!");
            console.log("     🔍 This suggests the same NFT is both offered and requested!");
          } else if (owner.toLowerCase() !== userAddress.toLowerCase()) {
            console.log("     ❌ You don't own this NFT!");
            continue;
          } else {
            console.log("     ✅ You own this NFT!");
          }
          
          if (owner.toLowerCase() === userAddress.toLowerCase()) {
            const approved = await erc721Contract.getApproved(nft.tokenId);
            const isApprovedForAll = await erc721Contract.isApprovedForAll(userAddress, CONTRACT_ADDRESS);
            
            console.log(`     Approved: ${approved}`);
            console.log(`     ApprovedForAll: ${isApprovedForAll}`);
            
            if (approved.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase() && !isApprovedForAll) {
              console.log("     ❌ NFT not approved for trading!");
            } else {
              console.log("     ✅ NFT approved for trading!");
            }
          }
          
        } else if (nft.standard === 1) { // ERC1155
          const erc1155Contract = new ethers.Contract(
            nft.contractAddress,
            [
              'function balanceOf(address account, uint256 id) view returns (uint256)',
              'function isApprovedForAll(address owner, address operator) view returns (bool)'
            ],
            signer
          );
          
          const userBalance = await erc1155Contract.balanceOf(userAddress, nft.tokenId);
          const contractBalance = await erc1155Contract.balanceOf(CONTRACT_ADDRESS, nft.tokenId);
          
          console.log(`     Your Balance: ${userBalance}`);
          console.log(`     Contract Balance: ${contractBalance}`);
          
          if (contractBalance > 0) {
            console.log("     ⚠️ Contract holds some of this NFT (likely from offering)!");
          }
          
          if (userBalance < nft.amount) {
            console.log("     ❌ Insufficient balance!");
            continue;
          }
          
          const isApprovedForAll = await erc1155Contract.isApprovedForAll(userAddress, CONTRACT_ADDRESS);
          console.log(`     ApprovedForAll: ${isApprovedForAll}`);
          
          if (!isApprovedForAll) {
            console.log("     ❌ NFT not approved for trading!");
          } else {
            console.log("     ✅ NFT approved for trading!");
          }
        }
      } catch (nftError) {
        console.log(`     ❌ Error checking NFT: ${nftError.message}`);
      }
      
      console.log("");
    }
    
    // 8. Check for circular trade issue
    console.log("8️⃣ Checking for circular trade issues...");
    let hasCircularTrade = false;
    
    for (let i = 0; i < offeredNFTs.length; i++) {
      for (let j = 0; j < requestedNFTs.length; j++) {
        if (offeredNFTs[i].contractAddress.toLowerCase() === requestedNFTs[j].contractAddress.toLowerCase() &&
            offeredNFTs[i].tokenId.toString() === requestedNFTs[j].tokenId.toString()) {
          console.log("     🚨 CIRCULAR TRADE DETECTED!");
          console.log(`     Same NFT (${offeredNFTs[i].contractAddress}:${offeredNFTs[i].tokenId}) is both offered and requested!`);
          hasCircularTrade = true;
        }
      }
    }
    
    if (hasCircularTrade) {
      console.log("     ❌ This trade cannot be completed because the same NFT is being traded in both directions!");
      console.log("     💡 Solution: Use different NFTs for offering and requesting.");
    } else {
      console.log("     ✅ No circular trade issues detected!");
    }
    console.log("");
    
    // 9. Try to estimate gas for acceptTrade
    console.log("9️⃣ Testing gas estimation...");
    try {
      const gasEstimate = await contract.acceptTrade.estimateGas(TRADE_ID, { value: requestedMONAD });
      console.log("✅ Gas estimation successful!");
      console.log("   Estimated gas:", gasEstimate.toString());
    } catch (gasError) {
      console.log("❌ Gas estimation failed!");
      console.log("   Error:", gasError.message);
      console.log("   Reason:", gasError.reason || "Unknown");
      console.log("   Code:", gasError.code || "Unknown");
      
      if (hasCircularTrade) {
        console.log("   💡 This is likely due to the circular trade issue detected above!");
      }
    }
    
  } catch (error) {
    console.error("❌ Error during diagnosis:", error);
    console.error("Error details:", {
      message: error.message,
      reason: error.reason,
      code: error.code,
      data: error.data
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 