const { ethers } = require("hardhat");

async function main() {
  const txHash = "0x163c0931f3ededabd7ca5a6e03a2f3212d946a2f28a70a9e4282557b62211a5";
  
  console.log("\n🔍 CHECKING TRANSACTION:", txHash);
  console.log("=".repeat(60));
  
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/4Bf12QaQ6tjN7-92DiLEO');
  const receipt = await provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    console.log("❌ Transaction not found");
    process.exit(1);
  }
  
  console.log("Block:", receipt.blockNumber);
  console.log("Status:", receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
  console.log("Gas used:", receipt.gasUsed.toString());
  
  const tradingAddress = "0xB4981E473Ad74a410b5479bf21635c47108D243a";
  const trading = await ethers.getContractAt("PrivateNFTTradingV1", tradingAddress, provider);
  
  console.log("\n📋 EVENTS:");
  for (const log of receipt.logs) {
    try {
      const parsed = trading.interface.parseLog(log);
      console.log("\n  Event:", parsed.name);
      console.log("  Args:", parsed.args);
      
      if (parsed.name === "TradeCreated") {
        const tradeId = parsed.args.tradeId.toString();
        console.log("\n🎉 TRADE CREATED!");
        console.log("   Trade ID:", tradeId);
        console.log("   Creator:", parsed.args.creator);
        console.log("   Counterparty:", parsed.args.counterparty);
        console.log("\n✅ SHARE THIS LINK:");
        console.log(`   https://zamanfttrading.vercel.app/trade/${tradeId}`);
      }
    } catch (e) {
      // Not a trading contract event
    }
  }
  
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

