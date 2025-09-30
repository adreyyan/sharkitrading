const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying NFTTradingBasic to Sepolia (no fhEVM)...");
  
  try {
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
      console.log("❌ No ETH balance! Please get Sepolia ETH from a faucet first.");
      return;
    }
    
    // Deploy the basic contract
    console.log("📦 Deploying basic contract...");
    const NFTTradingBasic = await ethers.getContractFactory("NFTTradingBasic");
    
    const contract = await NFTTradingBasic.deploy({
      gasLimit: 2000000,
      gasPrice: ethers.parseUnits("20", "gwei"),
    });
    
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log("✅ NFTTradingBasic deployed to:", contractAddress);
    
    // Verify deployment
    console.log("🔍 Verifying deployment...");
    const tradeFee = await contract.getTradeFee();
    const adminCount = await contract.getAdminCount();
    
    console.log("Trade fee:", ethers.formatEther(tradeFee), "ETH");
    console.log("Admin count:", adminCount.toString());
    console.log("Deployer is admin:", await contract.isAdmin(deployer.address));
    
    console.log("\n🎉 Basic deployment successful!");
    console.log("Contract address:", contractAddress);
    console.log("Network: Sepolia");
    console.log("Explorer: https://sepolia.etherscan.io/address/" + contractAddress);
    console.log("\n📝 Next: Once this works, we can add fhEVM features back!");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
