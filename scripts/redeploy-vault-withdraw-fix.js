const { ethers } = require("hardhat");

async function main() {
  console.log("\n🚀 REDEPLOYING PRIVATE NFT VAULT (WITH WITHDRAW FIX)");
  console.log("=====================================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying from:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy PrivateNFTVault
  console.log("📦 Deploying PrivateNFTVault...");
  const PrivateNFTVault = await ethers.getContractFactory("PrivateNFTVault");
  const vault = await PrivateNFTVault.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log("✅ PrivateNFTVault deployed to:", vaultAddress);
  console.log("\n📋 UPDATE THESE IN lib/contracts.ts:");
  console.log("=====================================");
  console.log(`export const PRIVATE_NFT_VAULT_ADDRESS = "${vaultAddress}";`);
  
  console.log("\n✅ DEPLOYMENT COMPLETE!");
  console.log("=======================\n");
  console.log("⚠️  IMPORTANT: Update the addresses in lib/contracts.ts!");
  console.log("⚠️  Then update the ABIs by running: node scripts/export-vault-abi.js\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


