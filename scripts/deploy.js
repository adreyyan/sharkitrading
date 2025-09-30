const { ethers } = require("hardhat");
const readline = require('readline');

async function main() {
  console.log("🚀 Deploying MonadNFTTrading Contract v2.0.0");
  console.log("=====================================");
  
  // Get private key from user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const privateKey = await new Promise((resolve) => {
    rl.question('Enter your private key (it will not be stored): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  // Clean and validate private key
  let cleanPrivateKey = privateKey;
  if (privateKey.startsWith('0x')) {
    cleanPrivateKey = privateKey.slice(2);
  }

  if (!cleanPrivateKey || cleanPrivateKey.length !== 64) {
    console.error("❌ Invalid private key. Please provide a 64-character hex private key (with or without 0x prefix).");
    process.exit(1);
  }

  // Create wallet with provider
  const wallet = new ethers.Wallet(cleanPrivateKey, ethers.provider);
  
  console.log("📍 Deploying from address:", wallet.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(wallet.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "MONAD");
  
  if (balance < ethers.parseEther("1.0")) {
    console.warn("⚠️  Warning: Low balance. Make sure you have enough MONAD for deployment.");
  }

  // Get contract factory
  const MonadNFTTrading = await ethers.getContractFactory("MonadNFTTrading", wallet);
  
  console.log("📦 Deploying contract...");
  
  // Deploy contract
  const contract = await MonadNFTTrading.deploy({
    gasLimit: 3000000, // Set a reasonable gas limit
  });
  
  console.log("⏳ Waiting for deployment...");
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  
  console.log("✅ Contract deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  console.log("🔗 Network: Monad Testnet");
  console.log("⛽ Gas used: Deployment completed");
  
  // Verify contract details
  console.log("\n📋 Contract Details:");
  console.log("- Trade Fee:", ethers.formatEther(await contract.TRADE_FEE()), "MONAD");
  console.log("- Fee Collector:", await contract.FEE_COLLECTOR());
  console.log("- Max NFTs per trade:", (await contract.MAX_NFTS_PER_TRADE()).toString());
  console.log("- Expiry duration:", (await contract.ONE_DAY()).toString(), "seconds (1 day)");
  console.log("- Version:", await contract.getVersion());
  
  console.log("\n🎉 Deployment Complete!");
  console.log("📝 Save this contract address:", contractAddress);
  console.log("🔧 Update your frontend with the new address and ABI");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });