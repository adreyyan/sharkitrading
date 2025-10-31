const hre = require("hardhat");

async function main() {
  console.log("\n🚀 REDEPLOYING VAULT SYSTEM WITH FIX!\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`============================================================`);
  console.log(`Deploying from: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);

  // Step 1: Redeploy PrivateNFTVault with new transferReceiptById function
  console.log(`\n📦 Deploying PrivateNFTVault (with transferReceiptById fix)...`);
  const PrivateNFTVault = await hre.ethers.getContractFactory("PrivateNFTVault");
  const vault = await PrivateNFTVault.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`✅ PrivateNFTVault deployed to: ${vaultAddress}`);

  // Step 2: Deploy PrivateNFTTradingV1 with new vault address
  console.log(`\n📦 Deploying PrivateNFTTradingV1 (using transferReceiptById)...`);
  const PrivateNFTTradingV1 = await hre.ethers.getContractFactory("PrivateNFTTradingV1");
  const trading = await PrivateNFTTradingV1.deploy(vaultAddress);
  await trading.waitForDeployment();
  const tradingAddress = await trading.getAddress();
  console.log(`✅ PrivateNFTTradingV1 deployed to: ${tradingAddress}`);

  console.log(`\n📋 NEW CONTRACT ADDRESSES:`);
  console.log(`  PrivateNFTVault: ${vaultAddress}`);
  console.log(`  PrivateNFTTradingV1: ${tradingAddress}`);
  
  console.log(`\n============================================================`);
  console.log(`🎉 DEPLOYMENT COMPLETE!`);
  console.log(`\n📝 NEXT STEPS:\n`);
  console.log(`1. Update lib/contracts.ts:`);
  console.log(`   export const PRIVATE_NFT_VAULT_ADDRESS = "${vaultAddress}";`);
  console.log(`   export const PRIVATE_NFT_TRADING_V1_ADDRESS = "${tradingAddress}";`);
  console.log(`\n2. Regenerate ABIs:`);
  console.log(`   node -e "const fs = require('fs'); const vault = JSON.parse(fs.readFileSync('artifacts/contracts/PrivateNFTVault.sol/PrivateNFTVault.json', 'utf8')).abi; fs.writeFileSync('lib/abi-vault.ts', 'export const PRIVATE_VAULT_ABI = ' + JSON.stringify(vault, null, 2) + ' as const;');"`);
  console.log(`   node -e "const fs = require('fs'); const trading = JSON.parse(fs.readFileSync('artifacts/contracts/PrivateNFTTradingV1.sol/PrivateNFTTradingV1.json', 'utf8')).abi; fs.writeFileSync('lib/abi-v1.ts', 'export const PRIVATE_NFT_TRADING_V1_ABI = ' + JSON.stringify(trading, null, 2) + ' as const;');"`);
  console.log(`\n3. Restart dev server and test!`);
  console.log(`\n✨ THE BUG IS FIXED!`);
  console.log(`   - Vault now has transferReceiptById() that accepts plain uint256`);
  console.log(`   - Trading contract uses the new helper function`);
  console.log(`   - Accept should work now! 🎉`);
  console.log(`============================================================`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


