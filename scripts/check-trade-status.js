const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678"; // ✅ V4 CONTRACT
const TRADE_ID = 4; // Change this to the trade ID you want to check

// Contract ABI for checking status
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
    "name": "isTradeExpired",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  console.log("⏰ Trade Status & Expiry Checker");
  console.log("=================================");
  
  // Connect to the Monad testnet (read-only, no private key needed)
  let provider;
  try {
    provider = new ethers.JsonRpcProvider("https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d");
  } catch (error) {
    console.log("❌ Error connecting to network:", error.message);
    return;
  }
  
  console.log("🏠 Contract Address:", CONTRACT_ADDRESS);
  console.log("🆔 Trade ID:", TRADE_ID);
  console.log("");
  
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  
  try {
    // Check trade details
    console.log("🔍 Fetching trade details...");
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
    console.log("");
    
    // Status analysis
    console.log("📊 Trade Status Analysis:");
    const statusText = status === 0 ? "Pending" : status === 1 ? "Accepted" : status === 2 ? "Cancelled" : "Expired";
    console.log("   Current Status:", statusText);
    
    if (status === 0) {
      console.log("   ✅ Trade is still pending");
    } else if (status === 1) {
      console.log("   ✅ Trade was successfully accepted");
    } else if (status === 2) {
      console.log("   ❌ Trade was cancelled by creator");
    } else if (status === 3) {
      console.log("   ⏰ Trade has expired");
    }
    console.log("");
    
    // Time analysis
    console.log("⏰ Time Analysis:");
    const createdDate = new Date(Number(createdAt) * 1000);
    const expiryDate = new Date(Number(expiryTime) * 1000);
    const currentTime = new Date();
    
    console.log("   Created at:", createdDate.toLocaleString());
    console.log("   Expires at:", expiryDate.toLocaleString());
    console.log("   Current time:", currentTime.toLocaleString());
    console.log("");
    
    // Calculate time differences
    const timeSinceCreation = currentTime.getTime() - createdDate.getTime();
    const timeUntilExpiry = expiryDate.getTime() - currentTime.getTime();
    
    console.log("   Time since creation:", formatDuration(timeSinceCreation));
    
    if (timeUntilExpiry > 0) {
      console.log("   Time until expiry:", formatDuration(timeUntilExpiry));
      console.log("   ✅ Trade has not expired yet");
    } else {
      console.log("   Time past expiry:", formatDuration(-timeUntilExpiry));
      console.log("   ❌ Trade has expired!");
    }
    console.log("");
    
    // Check blockchain expiry status
    const isExpiredOnChain = await contract.isTradeExpired(TRADE_ID);
    console.log("   Blockchain says expired:", isExpiredOnChain);
    console.log("");
    
    // Recommendations
    console.log("💡 Recommendations:");
    
    if (status === 0 && timeUntilExpiry > 0) {
      console.log("   ✅ This trade can still be accepted!");
      console.log("   ⏰ Accept it soon before it expires");
    } else if (status === 0 && timeUntilExpiry <= 0) {
      console.log("   ❌ This trade has expired and cannot be accepted");
      console.log("   💡 The creator needs to cancel it to recover their assets");
      console.log("   💡 Then create a new trade with fresh 24-hour expiry");
    } else if (status === 1) {
      console.log("   ✅ This trade was successfully completed");
    } else if (status === 2) {
      console.log("   ✅ This trade was cancelled - assets returned to creator");
    } else if (status === 3) {
      console.log("   ⏰ This trade was marked as expired");
      console.log("   💡 Assets should have been returned to creator");
    }
    
    console.log("");
    console.log("🔄 Next Steps:");
    
    if (status === 0 && timeUntilExpiry <= 0) {
      console.log("   1. Creator should cancel the trade to recover assets");
      console.log("   2. Create a new trade with the same terms");
      console.log("   3. New trade will have fresh 24-hour expiry");
      console.log("");
      console.log("   To cancel: Use the cancel button in the web interface");
      console.log("   Or run: node scripts/cancel-trade.js");
    } else if (status === 0 && timeUntilExpiry > 0) {
      console.log("   1. Counterparty can accept this trade");
      console.log("   2. Make sure you have required MONAD and NFT approvals");
      console.log("   3. Use the web interface or run: node scripts/accept-trade.js");
    }
    
  } catch (error) {
    console.error("❌ Error checking trade status:", error);
    
    if (error.message?.includes('BAD_DATA')) {
      console.log("");
      console.log("💡 This error might indicate:");
      console.log("   - The trade ID doesn't exist");
      console.log("   - Network connection issues");
      console.log("   - Contract address is incorrect");
    }
  }
}

function formatDuration(milliseconds) {
  const seconds = Math.abs(Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${seconds}s`;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 