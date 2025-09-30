const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678"; // ✅ V4 CONTRACT
const TRADE_ID = 8; // Change this to the trade ID you want to force accept

// Contract ABI for force accepting
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
    "name": "acceptTrade",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

async function main() {
  console.log("🚀 Force Accept Trade (Bypass Expired Status)");
  console.log("==============================================");
  
  // Check if we have a private key
  if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY.length <= 10) {
    console.log("❌ No valid PRIVATE_KEY found in environment variables.");
    console.log("💡 Please set your PRIVATE_KEY in the .env file to force accept trades.");
    console.log("");
    console.log("   Example .env file:");
    console.log("   PRIVATE_KEY=0x1234567890abcdef...");
    console.log("");
    console.log("   This should be the private key of the counterparty (person accepting the trade).");
    return;
  }

  // Connect to the Monad testnet
  let signer;
  try {
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
    console.log("   Offered MONAD:", ethers.formatEther(offeredMONAD));
    console.log("   Requested MONAD:", ethers.formatEther(requestedMONAD));
    console.log("   Status:", status === 0 ? "Pending" : status === 1 ? "Accepted" : status === 2 ? "Cancelled" : "Expired");
    console.log("   Created:", new Date(Number(createdAt) * 1000).toLocaleString());
    console.log("   Expires:", new Date(Number(expiryTime) * 1000).toLocaleString());
    console.log("");
    
    // Check if user is the counterparty
    if (counterparty.toLowerCase() !== userAddress.toLowerCase()) {
      console.log("❌ You are not the counterparty for this trade!");
      console.log("   Only the designated counterparty can accept the trade.");
      return;
    }
    
    // Check actual expiry vs status
    const currentTime = Math.floor(Date.now() / 1000);
    const expiryTimeNumber = Number(expiryTime);
    const timeUntilExpiry = expiryTimeNumber - currentTime;
    
    console.log("⏰ Expiry Analysis:");
    console.log("   Current time:", new Date(currentTime * 1000).toLocaleString());
    console.log("   Expiry time:", new Date(expiryTimeNumber * 1000).toLocaleString());
    console.log("   Time until expiry:", timeUntilExpiry > 0 ? `${Math.floor(timeUntilExpiry / 3600)}h ${Math.floor((timeUntilExpiry % 3600) / 60)}m` : "EXPIRED");
    console.log("   Actually expired:", currentTime > expiryTimeNumber);
    console.log("");
    
    if (currentTime > expiryTimeNumber) {
      console.log("❌ Trade has actually expired and cannot be accepted!");
      console.log("💡 The trade creator should cancel it to recover assets.");
      return;
    }
    
    if (status === 1) {
      console.log("❌ Trade has already been accepted!");
      return;
    }
    
    if (status === 2) {
      console.log("❌ Trade has been cancelled!");
      return;
    }
    
    // Special message for expired status
    if (status === 3) {
      console.log("⚠️ WARNING: Trade is marked as 'Expired' but hasn't actually expired!");
      console.log("   This appears to be a bug where someone called expireTrade() prematurely.");
      console.log("   Since the actual expiry time hasn't passed, we can still try to accept it.");
      console.log("");
    }
    
    // Check balance
    const userBalance = await signer.provider.getBalance(userAddress);
    console.log("💰 Balance Check:");
    console.log("   Your MONAD balance:", ethers.formatEther(userBalance));
    console.log("   Required MONAD:", ethers.formatEther(requestedMONAD));
    
    if (userBalance < requestedMONAD) {
      console.log("❌ Insufficient MONAD balance!");
      return;
    }
    console.log("   ✅ Sufficient balance");
    console.log("");
    
    // Attempt to accept the trade
    console.log("🚀 Attempting to force accept trade...");
    console.log("   Note: This may fail if the contract strictly enforces the expired status.");
    console.log("");
    
    try {
      const tx = await contract.acceptTrade(TRADE_ID, { 
        value: requestedMONAD,
        gasLimit: 500000 // Set a reasonable gas limit
      });
      console.log("📤 Accept transaction sent:", tx.hash);
      
      console.log("⏳ Waiting for confirmation...");
      const receipt = await tx.wait();
      console.log("✅ Trade accepted successfully!");
      console.log("   Gas used:", receipt.gasUsed.toString());
      console.log("");
      
      console.log("🎉 Success! The trade was completed despite being marked as expired!");
      console.log("💡 This confirms that the 'expired' status was incorrectly set.");
      
    } catch (acceptError) {
      console.log("❌ Failed to accept trade:", acceptError.message);
      console.log("");
      
      if (acceptError.message?.includes('Trade not pending')) {
        console.log("💡 The contract is strictly enforcing the expired status.");
        console.log("   The trade cannot be accepted even though it hasn't actually expired.");
        console.log("   This is a limitation of the current contract design.");
      } else if (acceptError.message?.includes('Trade expired')) {
        console.log("💡 The contract has an expiry check that's blocking acceptance.");
      } else {
        console.log("💡 Unexpected error. Check the error message above for details.");
      }
      
      console.log("");
      console.log("🔄 Alternative solutions:");
      console.log("   1. Wait for the trade to actually expire, then creator cancels it");
      console.log("   2. Creator cancels the trade now to recover assets");
      console.log("   3. Create a new trade with the same terms");
    }
    
  } catch (error) {
    console.error("❌ Error checking trade:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 