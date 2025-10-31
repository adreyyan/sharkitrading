const { ethers } = require("ethers");

async function main() {
  const txHash = "0xa11cd31663ebe27036d0b8c2bc8360fcc06990cbfe7c8230706ed32c35980412";
  
  console.log("\n📋 TRANSACTION LOGS");
  console.log("=".repeat(70));
  console.log("TX:", txHash);
  
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/4Bf12QaQ6tjN7-92DiLEO');
  const receipt = await provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    console.log("❌ Transaction not found");
    return;
  }
  
  console.log("Status:", receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
  console.log("Block:", receipt.blockNumber);
  console.log("Gas Used:", receipt.gasUsed.toString());
  
  console.log("\n🔍 EVENT LOGS:");
  console.log("-".repeat(70));
  
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    console.log(`\nLog #${i + 1}:`);
    console.log(`  Contract: ${log.address}`);
    console.log(`  Topics:`);
    log.topics.forEach((topic, idx) => {
      console.log(`    [${idx}] ${topic}`);
    });
    if (log.data !== '0x') {
      console.log(`  Data: ${log.data}`);
    }
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("💡 To see decoded events, visit:");
  console.log(`https://sepolia.etherscan.io/tx/${txHash}#eventlog`);
  console.log("=".repeat(70));
}

main().then(() => process.exit(0)).catch(console.error);
