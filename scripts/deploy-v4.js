const { ethers } = require('hardhat');

async function main() {
  console.log("🚀 Deploying MonadNFTTradingV4 with Decline Functionality...");
  console.log("====================================================================");

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "MONAD");
  console.log("");

  // Deploy the contract
  console.log("📝 Deploying contract...");
  const MonadNFTTradingV4 = await ethers.getContractFactory("MonadNFTTradingV4");
  const contract = await MonadNFTTradingV4.deploy();
  
  console.log("⏳ Waiting for deployment confirmation...");
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("✅ MonadNFTTradingV4 deployed to:", contractAddress);
  console.log("");

  // Verify contract details
  console.log("🔍 Verifying contract details...");
  const version = await contract.getVersion();
  console.log("📋 Contract version:", version);
  
  // Test basic functionality
  console.log("🧪 Testing basic functionality...");
  
  try {
    // Test detectTokenStandard with a known ERC721 contract
    const testERC721 = "0x6341c537a6fc563029d8e8caa87da37f227358f4"; // Molandaks
    const standard = await contract.detectTokenStandard(testERC721);
    console.log("✅ Token standard detection works:", standard === 0 ? "ERC721" : "ERC1155");
  } catch (error) {
    console.log("⚠️ Token standard detection test failed (this is normal if the test contract doesn't exist)");
  }

  console.log("");
  console.log("🎉 Deployment Summary:");
  console.log("========================");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🏷️ Version:", version);
  console.log("🆕 New Features:");
  console.log("   ✅ declineTrade() - Counterparty can decline and return assets immediately");
  console.log("   ✅ TradeStatus.Declined - New status for declined trades");
  console.log("   ✅ TradeDeclined event - Emitted when trade is declined");
  console.log("   ✅ _returnAssetsToCreator() - Shared logic for returning assets");
  console.log("");
  console.log("📝 Next Steps:");
  console.log("1. Update lib/contracts.ts with new contract address");
  console.log("2. Add declineTrade function to services/blockchain.ts");
  console.log("3. Update frontend to use declineTrade instead of expireTrade");
  console.log("4. Test the new decline functionality");
  console.log("");
  console.log("🔗 Contract Address for .env:");
  console.log(`MONAD_NFT_TRADING_ADDRESS=${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 