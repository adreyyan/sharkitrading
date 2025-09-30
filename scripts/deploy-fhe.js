const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying MonadNFTTradingFHE to fhEVM Sepolia...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.log("❌ No ETH balance! Please get Sepolia ETH from a faucet first.");
    console.log("Faucets:");
    console.log("- https://www.alchemy.com/dapps/sepolia-faucet");
    console.log("- https://stakely.io/faucet/ethereum-sepolia-testnet-eth");
    return;
  }
  
  // Deploy the contract
  console.log("📦 Deploying contract...");
  const MonadNFTTradingFHE = await ethers.getContractFactory("MonadNFTTradingFHE");
  
  const contract = await MonadNFTTradingFHE.deploy();
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("✅ MonadNFTTradingFHE deployed to:", contractAddress);
  
  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const tradeFee = await contract.getTradeFee();
  const adminCount = await contract.getAdminCount();
  
  console.log("Trade fee:", ethers.formatEther(tradeFee), "ETH");
  console.log("Admin count:", adminCount.toString());
  console.log("Deployer is admin:", await contract.isAdmin(deployer.address));
  
  console.log("\n🎉 Deployment successful!");
  console.log("Contract address:", contractAddress);
  console.log("Network: fhEVM Sepolia");
  console.log("Explorer: https://sepolia.etherscan.io/address/" + contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
