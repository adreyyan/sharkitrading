const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/4Bf12QaQ6tjN7-92DiLEO');
  
  const vaultAddress = "0xaABBC3d80b9C7e33Eaf2D148f52d60A5ebBc4084";
  const tradingAddress = "0xB4981E473Ad74a410b5479bf21635c47108D243a";
  
  console.log("\n📋 CONTRACT STATUS CHECK");
  console.log("=".repeat(70));
  
  // Check vault
  const vaultCode = await provider.getCode(vaultAddress);
  console.log("\n🏦 VAULT CONTRACT:");
  console.log(`   Address: ${vaultAddress}`);
  console.log(`   Status: ${vaultCode !== '0x' ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`);
  console.log(`   Etherscan: https://sepolia.etherscan.io/address/${vaultAddress}`);
  
  // Check trading
  const tradingCode = await provider.getCode(tradingAddress);
  console.log("\n💱 TRADING CONTRACT:");
  console.log(`   Address: ${tradingAddress}`);
  console.log(`   Status: ${tradingCode !== '0x' ? '✅ DEPLOYED' : '❌ NOT DEPLOYED'}`);
  console.log(`   Etherscan: https://sepolia.etherscan.io/address/${tradingAddress}`);
  
  // Get trade fee
  if (tradingCode !== '0x') {
    const trading = new ethers.Contract(
      tradingAddress,
      ["function tradeFee() view returns (uint256)"],
      provider
    );
    try {
      const fee = await trading.tradeFee();
      console.log(`   Trade Fee: ${ethers.formatEther(fee)} ETH`);
    } catch (e) {
      console.log(`   Trade Fee: ⚠️ Could not fetch`);
    }
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("✅ USE THESE ADDRESSES IN YOUR APP");
  console.log("=".repeat(70));
}

main().then(() => process.exit(0)).catch(console.error);
