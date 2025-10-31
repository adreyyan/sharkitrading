const { ethers } = require("hardhat");

async function main() {
  const tradeId = process.argv[2];
  
  if (!tradeId) {
    console.log("Usage: node scripts/check-trade.js <tradeId>");
    process.exit(1);
  }

  const contractAddress = "0xB4981E473Ad74a410b5479bf21635c47108D243a";
  
  const contract = await ethers.getContractAt("PrivateNFTTradingV1", contractAddress);
  
  console.log("\n🔍 CHECKING TRADE #" + tradeId);
  console.log("=".repeat(60));
  
  try {
    const trade = await contract.getTrade(tradeId);
    
    console.log("\n📊 TRADE DETAILS:");
    console.log("  ID:", trade.id.toString());
    console.log("  Creator:", trade.creator);
    console.log("  Counterparty:", trade.counterparty);
    console.log("  Status:", ["Pending", "Accepted", "Cancelled", "Declined"][trade.status]);
    console.log("\n💼 OFFERED BY CREATOR:");
    console.log("  Receipt IDs:", trade.offeredReceiptIds.map(id => id.toString()));
    console.log("  ETH:", ethers.formatEther(trade.offeredETH));
    console.log("\n💼 REQUESTED FROM COUNTERPARTY:");
    console.log("  Receipt IDs:", trade.requestedReceiptIds.map(id => id.toString()));
    console.log("  ETH:", ethers.formatEther(trade.requestedETH));
    
    const fee = await contract.tradeFee();
    console.log("\n💰 FEES:");
    console.log("  Trade Fee:", ethers.formatEther(fee));
    console.log("  Total ETH needed to accept:", ethers.formatEther(BigInt(trade.requestedETH) + fee));
    
    console.log("\n" + "=".repeat(60));
    
    if (trade.requestedReceiptIds.length > 0) {
      console.log("\n⚠️  NOTE: This trade requires the counterparty to own these receipts:");
      for (const id of trade.requestedReceiptIds) {
        console.log("    - Receipt #" + id.toString());
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
