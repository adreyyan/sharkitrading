const { ethers } = require("hardhat");

// 🔑 PASTE YOUR PRIVATE KEY HERE (without 0x prefix)
const PRIVATE_KEY = "paste_your_private_key_here";

async function main() {
  console.log("🚀 Deploying NFTTradingBasic to Sepolia...");
  
  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("👤 Deploying with account:", wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (parseFloat(ethers.formatEther(balance)) < 0.02) {
    console.error("❌ Insufficient ETH for deployment! Need at least 0.02 ETH");
    console.log("💡 Get Sepolia ETH from: https://sepoliafaucet.com/");
    process.exit(1);
  }
  
  // Read contract bytecode
  console.log("\n📡 Preparing NFTTradingBasic contract...");
  
  // Contract factory setup
  const contractCode = `
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.24;
  
  import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
  import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
  import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
  import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
  import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
  import "@openzeppelin/contracts/utils/Pausable.sol";
  `;
  
  // Use Hardhat's contract factory
  const NFTTradingBasic = await ethers.getContractFactory("NFTTradingBasic", wallet);
  
  console.log("⏳ Deploying contract...");
  const contract = await NFTTradingBasic.deploy({
    gasLimit: 3000000,
    gasPrice: ethers.parseUnits("20", "gwei")
  });
  
  console.log("🔄 Waiting for deployment confirmation...");
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("✅ NFTTradingBasic deployed to:", contractAddress);
  
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
    console.log("📋 Copy this line to lib/contracts.ts:");
    console.log(`export const BASIC_NFT_TRADING_ADDRESS = "${contractAddress}";`);
    
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

if (PRIVATE_KEY === "paste_your_private_key_here") {
  console.error("❌ Please paste your private key in the PRIVATE_KEY variable at the top of this file!");
  console.log("💡 Edit scripts/deploy-with-key.js and replace 'paste_your_private_key_here' with your actual private key");
  process.exit(1);
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
