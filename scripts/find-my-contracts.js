const hre = require("hardhat");

async function main() {
  console.log("🔍 Finding your recent contract deployments on Sepolia...");
  
  const [deployer] = await hre.ethers.getSigners();
  const userAddress = deployer.address;
  
  console.log("👤 Your address:", userAddress);
  console.log("🔗 Etherscan:", `https://sepolia.etherscan.io/address/${userAddress}`);
  
  try {
    // Get recent transactions
    console.log("\n📡 Fetching recent transactions...");
    
    const provider = hre.ethers.provider;
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks
    
    console.log(`🔍 Scanning blocks ${fromBlock} to ${currentBlock}...`);
    
    // Look for contract creation transactions
    const nonce = await provider.getTransactionCount(userAddress);
    console.log(`📊 Total transactions sent: ${nonce}`);
    
    // Get recent transactions from Etherscan API (if available)
    console.log("\n💡 To find your contracts, check:");
    console.log(`🔗 Your transactions: https://sepolia.etherscan.io/address/${userAddress}`);
    console.log("   Look for 'Contract Creation' transactions");
    console.log("\n🎯 Common contract addresses you might have deployed:");
    
    // If we can estimate contract addresses based on nonce
    for (let i = Math.max(0, nonce - 5); i < nonce; i++) {
      const contractAddress = hre.ethers.getCreateAddress({
        from: userAddress,
        nonce: i
      });
      console.log(`   Nonce ${i}: ${contractAddress}`);
    }
    
    console.log("\n📋 To check a specific NFT contract, run:");
    console.log("npx hardhat run scripts/check-my-nfts.js --network sepolia CONTRACT_ADDRESS");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\n💡 Manual check: Go to https://sepolia.etherscan.io/address/" + userAddress);
    console.log("   and look for recent 'Contract Creation' transactions");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
