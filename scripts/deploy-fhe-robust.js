const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying MonadNFTTradingFHE to Sepolia (robust)...");
  
  try {
    // Get the deployer account with timeout
    console.log("Getting deployer account...");
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Check balance with timeout
    console.log("Checking balance...");
    const balance = await Promise.race([
      ethers.provider.getBalance(deployer.address),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Balance check timeout")), 10000)
      )
    ]);
    
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
      console.log("❌ No ETH balance! Please get Sepolia ETH from a faucet first.");
      return;
    }
    
    // Deploy with explicit gas settings
    console.log("📦 Deploying contract with optimized gas settings...");
    const MonadNFTTradingFHE = await ethers.getContractFactory("MonadNFTTradingFHE");
    
    const contract = await MonadNFTTradingFHE.deploy({
      gasLimit: 3000000,           // 3M gas limit
      gasPrice: ethers.parseUnits("25", "gwei"),  // 25 gwei
    });
    
    console.log("Waiting for deployment transaction...");
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log("✅ MonadNFTTradingFHE deployed to:", contractAddress);
    
    // Quick verification
    console.log("🔍 Quick verification...");
    const tradeFee = await contract.getTradeFee();
    const adminCount = await contract.getAdminCount();
    
    console.log("Trade fee:", ethers.formatEther(tradeFee), "ETH");
    console.log("Admin count:", adminCount.toString());
    
    console.log("\n🎉 Deployment successful!");
    console.log("Contract address:", contractAddress);
    console.log("Network: Sepolia");
    console.log("Explorer: https://sepolia.etherscan.io/address/" + contractAddress);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    
    if (error.message.includes("timeout")) {
      console.log("🔄 Try again - network timeout issues are common on testnets");
    } else if (error.message.includes("insufficient funds")) {
      console.log("💰 Get more Sepolia ETH from faucets");
    } else if (error.message.includes("nonce")) {
      console.log("🔄 Nonce issue - try again in a few seconds");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
