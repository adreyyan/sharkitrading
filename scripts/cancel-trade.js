const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678"; // ✅ V4 CONTRACT
const TRADE_ID = 3; // The trade to cancel

// Contract ABI for cancelling
const CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "tradeId", "type": "uint256"}],
    "name": "cancelTrade",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
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
  }
];

async function main() {
  console.log("🚫 Cancelling Circular Trade");
  console.log("============================");
  
  // Check if we have a private key
  if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY.length <= 10) {
    console.log("❌ No valid PRIVATE_KEY found in environment variables.");
    console.log("💡 Please set your PRIVATE_KEY in the .env file to cancel blockchain trades.");
    console.log("");
    console.log("   Example .env file:");
    console.log("   PRIVATE_KEY=0x1234567890abcdef...");
    console.log("");
    console.log("   This should be the private key of the wallet that created the trade.");
    return;
  }

  // Get signer from environment (this will use the PRIVATE_KEY from .env)
  let signer;
  try {
    // Connect to the Monad testnet
    const provider = new ethers.JsonRpcProvider("https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d");
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  } catch (error) {
    console.log("❌ Error connecting to network:", error.message);
    return;
  }

  const userAddress = await signer.getAddress();
  
  console.log("👤 User Address:", userAddress);
  console.log("🏠 Contract Address:", CONTRACT_ADDRESS);
  console.log("🆔 Trade ID:", TRADE_ID);
  console.log("");
  
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  
  try {
    // Check trade details first
    console.log("🔍 Checking trade details...");
    const [id, creator, counterparty, offeredMONAD, requestedMONAD, expiryTime, status, message, createdAt] = await contract.getTrade(TRADE_ID);
    
    if (!creator || creator === ethers.ZeroAddress) {
      console.log("❌ Trade does not exist!");
      return;
    }
    
    console.log("✅ Trade found!");
    console.log("   Creator:", creator);
    console.log("   Counterparty:", counterparty);
    console.log("   Status:", status === 0 ? "Pending" : status === 1 ? "Accepted" : status === 2 ? "Cancelled" : "Expired");
    console.log("");
    
    // Check if user is the creator
    if (creator.toLowerCase() !== userAddress.toLowerCase()) {
      console.log("❌ You are not the creator of this trade!");
      console.log("   Only the trade creator can cancel the trade.");
      console.log("   Trade creator:", creator);
      console.log("   Your address:", userAddress);
      return;
    }
    
    // Check if trade is still pending
    if (status !== 0) {
      console.log("❌ Trade is not pending!");
      const statusText = status === 1 ? "Accepted" : status === 2 ? "Cancelled" : "Expired";
      console.log("   Status:", statusText);
      return;
    }
    
    console.log("✅ You can cancel this trade!");
    console.log("");
    
    // Cancel the trade
    console.log("🚫 Cancelling trade...");
    const tx = await contract.cancelTrade(TRADE_ID);
    console.log("📤 Cancel transaction sent:", tx.hash);
    
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("✅ Trade cancelled successfully!");
    console.log("   Gas used:", receipt.gasUsed.toString());
    console.log("");
    
    console.log("🎉 Your NFTs and MONAD have been returned to your wallet!");
    console.log("💡 Next steps:");
    console.log("   - Create a new trade with different NFTs");
    console.log("   - Or trade with a different person");
    console.log("   - Avoid trading the same NFT in both directions");
    
  } catch (error) {
    console.error("❌ Error cancelling trade:", error);
    
    if (error.message?.includes('BAD_DATA')) {
      console.log("");
      console.log("💡 This error might indicate:");
      console.log("   - The trade ID doesn't exist");
      console.log("   - Network connection issues");
      console.log("   - Contract address is incorrect");
    } else if (error.message?.includes('Not trade creator')) {
      console.log("");
      console.log("💡 Only the person who created the trade can cancel it.");
    } else if (error.message?.includes('Trade not pending')) {
      console.log("");
      console.log("💡 This trade has already been accepted, cancelled, or expired.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 