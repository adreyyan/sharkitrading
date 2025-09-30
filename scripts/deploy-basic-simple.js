const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying NFTTradingBasic to Sepolia...");
  
  // For direct private key usage, we'll use the configured network
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (parseFloat(ethers.formatEther(balance)) < 0.01) {
    console.error("❌ Insufficient ETH for deployment! Need at least 0.01 ETH");
    console.log("💡 Get Sepolia ETH from: https://sepoliafaucet.com/");
    process.exit(1);
  }
  
  // Deploy the contract
  console.log("\n📡 Deploying NFTTradingBasic contract...");
  const NFTTradingBasic = await ethers.getContractFactory("NFTTradingBasic");
  
  const contract = await NFTTradingBasic.deploy();
  console.log("⏳ Waiting for deployment...");
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("✅ NFTTradingBasic deployed to:", contractAddress);
  
  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const tradeFee = await contract.tradeFee();
  const tradeCount = await contract.tradeCount();
  
  console.log("📊 Contract Info:");
  console.log("   Trade Fee:", ethers.formatEther(tradeFee), "ETH");
  console.log("   Trade Count:", tradeCount.toString());
  
  console.log("\n🎉 Deployment Complete!");
  console.log("🔗 Contract Address:", contractAddress);
  console.log("\n📋 Next Steps:");
  console.log("1. Copy this address to lib/contracts.ts:");
  console.log(`   export const BASIC_NFT_TRADING_ADDRESS = "${contractAddress}";`);
  console.log("2. Test creating a trade!");
  
  return contractAddress;
}

main()
  .then((address) => {
    console.log("\n✅ Success! Contract deployed to:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error.message);
    process.exit(1);
  });
