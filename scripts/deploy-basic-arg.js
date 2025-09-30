const { ethers } = require("hardhat");

async function main() {
  // Get private key from command line argument
  const privateKey = process.argv[2];
  
  if (!privateKey) {
    console.error("❌ Please provide your private key as an argument!");
    console.log("💡 Usage: npx hardhat run scripts/deploy-basic-arg.js --network sepolia 0x1234567890abcdef...");
    process.exit(1);
  }
  
  // Remove 0x prefix if present
  const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  
  console.log("🚀 Deploying NFTTradingFHEV7 to Sepolia...");
  console.log("🔑 Using private key from command line argument");
  
  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  const wallet = new ethers.Wallet(cleanPrivateKey, provider);
  
  console.log("👤 Deploying with account:", wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (parseFloat(ethers.formatEther(balance)) < 0.02) {
    console.error("❌ Insufficient ETH for deployment! Need at least 0.02 ETH");
    console.log("💡 Get Sepolia ETH from: https://sepoliafaucet.com/");
    process.exit(1);
  }
  
  // Deploy contract
  console.log("\n📡 Deploying NFTTradingFHEV7 contract...");
  const NFTTradingFHEV7 = await ethers.getContractFactory("NFTTradingFHEV7", wallet);
  
  const contract = await NFTTradingFHEV7.deploy({
    gasLimit: 3000000,
    gasPrice: ethers.parseUnits("20", "gwei")
  });
  
  console.log("⏳ Waiting for deployment confirmation...");
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("✅ NFTTradingFHEV7 deployed to:", contractAddress);
  
  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  try {
    const tradeFee = await contract.tradeFee();
    const tradeCount = await contract.tradeCount();
    const isAdmin = await contract.isAdmin(wallet.address);
    
    console.log("📊 Contract Info:");
    console.log("   Trade Fee:", ethers.formatEther(tradeFee), "ETH");
    console.log("   Trade Count:", tradeCount.toString());
    console.log("   Deployer is Admin:", isAdmin);
    
    console.log("\n🎉 Deployment Successful!");
    console.log("📋 Copy this to lib/contracts.ts:");
    console.log(`export const FHEVM_NFT_TRADING_ADDRESS = "${contractAddress}";`);
    
    console.log("\n🔗 Contract Details:");
    console.log("   Address:", contractAddress);
    console.log("   Network: Sepolia Testnet");
    console.log("   Explorer: https://sepolia.etherscan.io/address/" + contractAddress);
    
    return contractAddress;
    
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    console.log("💡 Contract deployed but verification failed. Address:", contractAddress);
    return contractAddress;
  }
}

main()
  .then((address) => {
    console.log("\n✅ All done! Contract:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error.message);
    if (error.reason) console.error("Reason:", error.reason);
    process.exit(1);
  });
