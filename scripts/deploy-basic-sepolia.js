const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying NFTTradingBasic to Sepolia...");
  
  // Check environment variables
  if (!process.env.SEPOLIA_PRIVATE_KEY) {
    console.error("❌ SEPOLIA_PRIVATE_KEY not found in environment variables!");
    console.log("💡 Please add SEPOLIA_PRIVATE_KEY to your .env.local file");
    process.exit(1);
  }
  
  // Get deployer account
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    console.error("❌ No signers available! Check your SEPOLIA_PRIVATE_KEY");
    process.exit(1);
  }
  
  const [deployer] = signers;
  console.log("👤 Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (parseFloat(ethers.formatEther(balance)) < 0.01) {
    console.error("❌ Insufficient ETH for deployment! Need at least 0.01 ETH");
    process.exit(1);
  }
  
  // Deploy the contract
  console.log("\n📡 Deploying NFTTradingBasic contract...");
  const NFTTradingBasic = await ethers.getContractFactory("NFTTradingBasic");
  
  // Deploy with gas limit and gas price for Sepolia
  const contract = await NFTTradingBasic.deploy({
    gasLimit: 3000000, // 3M gas limit
    gasPrice: ethers.parseUnits("20", "gwei") // 20 gwei
  });
  
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
  console.log("   Deployer is Admin:", await contract.isAdmin(deployer.address));
  
  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    contractName: "NFTTradingBasic",
    address: contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    tradeFee: ethers.formatEther(tradeFee),
    blockNumber: await deployer.provider.getBlockNumber(),
    txHash: contract.deploymentTransaction()?.hash
  };
  
  console.log("\n📝 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n🎉 Deployment Complete!");
  console.log("🔗 Update your config with:");
  console.log(`export const BASIC_NFT_TRADING_ADDRESS = "${contractAddress}";`);
  
  console.log("\n📋 Next Steps:");
  console.log("1. Update lib/contracts.ts with the new address");
  console.log("2. Test creating a trade");
  console.log("3. Verify contract on Etherscan if needed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
