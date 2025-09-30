const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678"; // ✅ V4 CONTRACT

// Contract ABI for listing trades
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
    "inputs": [],
    "name": "nextTradeId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  console.log("📋 Recent Trades Listing");
  console.log("========================");
  
  // Connect to the Monad testnet (read-only)
  let provider;
  try {
    provider = new ethers.JsonRpcProvider("https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d");
  } catch (error) {
    console.log("❌ Error connecting to network:", error.message);
    return;
  }
  
  console.log("🏠 Contract Address:", CONTRACT_ADDRESS);
  console.log("");
  
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  
  try {
    // Get the next trade ID to know how many trades exist
    const nextTradeId = await contract.nextTradeId();
    const totalTrades = Number(nextTradeId);
    
    console.log("📊 Total trades created:", totalTrades);
    console.log("");
    
    if (totalTrades === 0) {
      console.log("No trades found.");
      return;
    }
    
    // Check the last 10 trades (or all if less than 10)
    const tradesToCheck = Math.min(10, totalTrades);
    const startId = Math.max(0, totalTrades - tradesToCheck);
    
    console.log(`🔍 Checking last ${tradesToCheck} trades (IDs ${startId} to ${totalTrades - 1}):`);
    console.log("");
    
    const currentTime = Math.floor(Date.now() / 1000);
    
    for (let i = startId; i < totalTrades; i++) {
      try {
        const [id, creator, counterparty, offeredMONAD, requestedMONAD, expiryTime, status, message, createdAt] = await contract.getTrade(i);
        
        if (creator === ethers.ZeroAddress) {
          console.log(`Trade ${i}: ❌ Does not exist`);
          continue;
        }
        
        const statusText = status === 0 ? "Pending" : status === 1 ? "Accepted" : status === 2 ? "Cancelled" : "Expired";
        const isExpired = currentTime > Number(expiryTime);
        const timeUntilExpiry = Number(expiryTime) - currentTime;
        
        console.log(`Trade ${i}:`);
        console.log(`   Status: ${statusText} ${isExpired ? '(⏰ Expired)' : '(✅ Active)'}`);
        console.log(`   Creator: ${creator}`);
        console.log(`   Counterparty: ${counterparty}`);
        console.log(`   Offered MONAD: ${ethers.formatEther(offeredMONAD)}`);
        console.log(`   Requested MONAD: ${ethers.formatEther(requestedMONAD)}`);
        console.log(`   Created: ${new Date(Number(createdAt) * 1000).toLocaleString()}`);
        console.log(`   Expires: ${new Date(Number(expiryTime) * 1000).toLocaleString()}`);
        
        if (!isExpired && timeUntilExpiry > 0) {
          const hours = Math.floor(timeUntilExpiry / 3600);
          const minutes = Math.floor((timeUntilExpiry % 3600) / 60);
          console.log(`   Time left: ${hours}h ${minutes}m`);
        }
        
        if (message && message.trim()) {
          console.log(`   Message: "${message}"`);
        }
        
        console.log("");
        
      } catch (tradeError) {
        console.log(`Trade ${i}: ❌ Error fetching - ${tradeError.message}`);
      }
    }
    
    // Summary for pending trades
    console.log("📋 Summary of Pending Trades:");
    let pendingCount = 0;
    
    for (let i = startId; i < totalTrades; i++) {
      try {
        const [id, creator, counterparty, offeredMONAD, requestedMONAD, expiryTime, status] = await contract.getTrade(i);
        
        if (creator !== ethers.ZeroAddress && status === 0) {
          const isExpired = currentTime > Number(expiryTime);
          
          if (!isExpired) {
            pendingCount++;
            console.log(`   Trade ${i}: ${creator} → ${counterparty} (${ethers.formatEther(offeredMONAD)} → ${ethers.formatEther(requestedMONAD)} MONAD)`);
          }
        }
      } catch (e) {
        // Skip errors
      }
    }
    
    if (pendingCount === 0) {
      console.log("   No active pending trades found.");
    }
    
    console.log("");
    console.log("💡 Tips:");
    console.log("   • Only pending trades can be accepted");
    console.log("   • Trades expire after 24 hours");
    console.log("   • Use 'node scripts/check-trade-status.js' to check a specific trade");
    console.log("   • Update TRADE_ID in scripts to match the trade you want to interact with");
    
  } catch (error) {
    console.error("❌ Error listing trades:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 