const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678"; // ✅ V4 CONTRACT
const TRADE_ID = 5;

// Contract ABI for read-only functions
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
  }
];

async function main() {
  console.log("🔍 Analyzing Trade (Read-Only)");
  console.log("==============================");
  
  // Use a read-only provider
  const provider = new ethers.JsonRpcProvider("https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  
  console.log("🏠 Contract Address:", CONTRACT_ADDRESS);
  console.log("🆔 Trade ID:", TRADE_ID);
  console.log("");
  
  try {
    // Get trade details
    console.log("1️⃣ Fetching trade details...");
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
    console.log("   Message:", message || "No message");
    console.log("");
    
    // Get offered NFTs (what creator put in escrow)
    console.log("2️⃣ NFTs offered by creator (currently in escrow)...");
    const offeredNFTs = await contract.getOfferedNFTs(TRADE_ID);
    console.log("   Number of offered NFTs:", offeredNFTs.length);
    
    if (offeredNFTs.length === 0) {
      console.log("   No NFTs offered");
    } else {
      for (let i = 0; i < offeredNFTs.length; i++) {
        const nft = offeredNFTs[i];
        console.log(`   NFT ${i + 1}:`);
        console.log(`     Contract: ${nft.contractAddress}`);
        console.log(`     Token ID: ${nft.tokenId}`);
        console.log(`     Amount: ${nft.amount}`);
        console.log(`     Standard: ${nft.standard === 0 ? 'ERC721' : 'ERC1155'}`);
        
        // Check if this is the "Try" NFT
        if (nft.contractAddress.toLowerCase() === "0x4c718854bbd7502d230b48e2ebd3a8cb4cdd7c57") {
          console.log(`     🎯 This is the "Try" NFT!`);
        }
      }
    }
    console.log("");
    
    // Get requested NFTs (what counterparty needs to provide)
    console.log("3️⃣ NFTs requested from counterparty...");
    const requestedNFTs = await contract.getRequestedNFTs(TRADE_ID);
    console.log("   Number of requested NFTs:", requestedNFTs.length);
    
    if (requestedNFTs.length === 0) {
      console.log("   No NFTs requested");
    } else {
      for (let i = 0; i < requestedNFTs.length; i++) {
        const nft = requestedNFTs[i];
        console.log(`   NFT ${i + 1}:`);
        console.log(`     Contract: ${nft.contractAddress}`);
        console.log(`     Token ID: ${nft.tokenId}`);
        console.log(`     Amount: ${nft.amount}`);
        console.log(`     Standard: ${nft.standard === 0 ? 'ERC721' : 'ERC1155'}`);
        
        // Check if this is the "Try" NFT
        if (nft.contractAddress.toLowerCase() === "0x4c718854bbd7502d230b48e2ebd3a8cb4cdd7c57") {
          console.log(`     🎯 This is the "Try" NFT!`);
        }
      }
    }
    console.log("");
    
    // Analysis
    console.log("4️⃣ Analysis...");
    
    // Check for circular trades
    let hasCircularTrade = false;
    for (let i = 0; i < offeredNFTs.length; i++) {
      for (let j = 0; j < requestedNFTs.length; j++) {
        if (offeredNFTs[i].contractAddress.toLowerCase() === requestedNFTs[j].contractAddress.toLowerCase() &&
            offeredNFTs[i].tokenId.toString() === requestedNFTs[j].tokenId.toString()) {
          console.log("   🚨 CIRCULAR TRADE DETECTED!");
          console.log(`   Same NFT (${offeredNFTs[i].contractAddress}:${offeredNFTs[i].tokenId}) is both offered and requested!`);
          hasCircularTrade = true;
        }
      }
    }
    
    if (!hasCircularTrade) {
      console.log("   ✅ No circular trade detected");
    }
    
    // Check if "Try" NFT is involved
    const tryNFTOffered = offeredNFTs.some(nft => 
      nft.contractAddress.toLowerCase() === "0x4c718854bbd7502d230b48e2ebd3a8cb4cdd7c57"
    );
    const tryNFTRequested = requestedNFTs.some(nft => 
      nft.contractAddress.toLowerCase() === "0x4c718854bbd7502d230b48e2ebd3a8cb4cdd7c57"
    );
    
    if (tryNFTOffered && tryNFTRequested) {
      console.log("   🎯 'Try' NFT is both offered AND requested - this is the problem!");
    } else if (tryNFTOffered) {
      console.log("   🎯 'Try' NFT is offered by creator (in escrow)");
    } else if (tryNFTRequested) {
      console.log("   🎯 'Try' NFT is requested from counterparty");
      console.log("   💡 The counterparty needs to own and approve this NFT to accept the trade");
    }
    
    console.log("");
    console.log("5️⃣ Summary for accepting this trade:");
    
    if (status !== 0) {
      console.log("   ❌ Trade is not pending - cannot be accepted");
    } else if (hasCircularTrade) {
      console.log("   ❌ Circular trade - cannot be completed");
      console.log("   💡 Cancel this trade and create a new one with different NFTs");
    } else {
      console.log("   ✅ Trade appears valid");
      console.log("   📋 To accept this trade, the counterparty needs to:");
      
      if (requestedNFTs.length > 0) {
        console.log("   • Own the following NFTs:");
        requestedNFTs.forEach((nft, i) => {
          console.log(`     - ${nft.contractAddress}:${nft.tokenId} (${nft.standard === 0 ? 'ERC721' : 'ERC1155'})`);
        });
        console.log("   • Approve the trading contract to transfer these NFTs");
      }
      
      if (requestedMONAD > 0) {
        console.log(`   • Have at least ${ethers.formatEther(requestedMONAD)} MONAD`);
      }
    }
    
  } catch (error) {
    console.error("❌ Error analyzing trade:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 