const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying MonadNFTTradingV7 with Automatic Expiration");
  console.log("========================================================");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("🔧 Deploying with account:", deployer.address);
  
  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "MONAD");
  
  if (balance < hre.ethers.parseEther("0.1")) {
    console.warn("⚠️ Warning: Low balance. Make sure you have enough MONAD for deployment.");
  }
  
  try {
    // Deploy the contract
    console.log("\n📦 Deploying MonadNFTTradingV7...");
    const MonadNFTTradingV7 = await hre.ethers.getContractFactory("MonadNFTTradingV7");
    const contract = await MonadNFTTradingV7.deploy();
    
    console.log("⏳ Waiting for deployment transaction...");
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log("✅ Contract deployed to:", contractAddress);
    
    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const deployedCode = await hre.ethers.provider.getCode(contractAddress);
    if (deployedCode === "0x") {
      throw new Error("Contract deployment failed - no code at address");
    }
    
    // Test basic contract functions
    console.log("\n🧪 Testing contract functions...");
    
    const tradeCount = await contract.tradeCount();
    console.log("📊 Initial trade count:", tradeCount.toString());
    
    const tradeFee = await contract.getTradeFee();
    console.log("💰 Trade fee:", hre.ethers.formatEther(tradeFee), "MONAD");
    
    const adminCount = await contract.getAdminCount();
    console.log("👥 Admin count:", adminCount.toString());
    
    const admins = await contract.getAdmins();
    console.log("👤 Admins:", admins);
    
    // Verify deployer is admin
    const isDeployerAdmin = await contract.isAdmin(deployer.address);
    console.log("🔑 Deployer is admin:", isDeployerAdmin);
    
    console.log("\n🎉 V7 Contract Features:");
    console.log("✅ Automatic expiration checking on all trade operations");
    console.log("✅ 24-hour trade expiration built-in");
    console.log("✅ No external scripts needed for basic expiration");
    console.log("✅ Expired trades auto-return assets to creators");
    console.log("✅ Gas-optimized expiration checks");
    console.log("✅ Admin functions for emergency management");
    
    console.log("\n📋 Deployment Summary:");
    console.log("Contract Address:", contractAddress);
    console.log("Network: Monad Testnet");
    console.log("Trade Fee: 0.3 MONAD");
    console.log("Max Admins: 3");
    console.log("Fee Collector: 0x20ce27B140A0EEECceF880e01D2082558400FDd6");
    
    console.log("\n🔧 Next Steps:");
    console.log("1. Update lib/contracts.ts with new V7 address");
    console.log("2. Create/update V7 ABI file");
    console.log("3. Test the automatic expiration functionality");
    console.log("4. Update frontend to use V7 contract");
    
    console.log("\n🧪 Test Commands:");
    console.log(`node scripts/test-v7-expiration.js ${contractAddress}`);
    console.log(`node scripts/create-test-trade-v7.js ${contractAddress}`);
    
    // Save deployment info
    const deploymentInfo = {
      contractAddress,
      deployer: deployer.address,
      deploymentTime: new Date().toISOString(),
      network: "monad-testnet",
      version: "V7",
      features: [
        "Automatic expiration checking",
        "24-hour trade expiration",
        "Gas-optimized operations",
        "Admin management",
        "Emergency controls"
      ]
    };
    
    console.log("\n💾 Deployment Info:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    
    if (error.message.includes("insufficient funds")) {
      console.log("💡 Solution: Add more MONAD to your account");
    } else if (error.message.includes("nonce")) {
      console.log("💡 Solution: Wait a moment and try again (nonce issue)");
    } else if (error.message.includes("gas")) {
      console.log("💡 Solution: The contract might be too large or gas price too low");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n🎉 Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Deployment script error:", error);
    process.exit(1);
  }); 