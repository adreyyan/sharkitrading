const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0xB4981E473Ad74a410b5479bf21635c47108D243a";
  
  const contract = await ethers.getContractAt("PrivateNFTTradingV1", contractAddress);
  
  console.log("\n📋 LISTING ALL TRADES");
  console.log("=".repeat(60));
  
  console.log(`\n  Checking trades 1-10...`);
  
  for (let i = 1; i <= 10; i++) {
    try {
      const trade = await contract.getTrade(i);
      
      if (trade.id.toString() === "0") {
        console.log(`\n❌ Trade #${i}: Does not exist`);
        continue;
      }
      
      const status = ["Pending", "Accepted", "Cancelled", "Declined"][trade.status];
      console.log(`\n✅ Trade #${i}: ${status}`);
      console.log(`  Creator: ${trade.creator}`);
      console.log(`  Counterparty: ${trade.counterparty}`);
      console.log(`  Offered Receipts: ${trade.offeredReceiptIds.length}`);
      console.log(`  Requested Receipts: ${trade.requestedReceiptIds.length}`);
      console.log(`  Offered ETH: ${ethers.formatEther(trade.offeredETH)}`);
      console.log(`  Requested ETH: ${ethers.formatEther(trade.requestedETH)}`);
      
    } catch (error) {
      console.log(`\n❌ Trade #${i}: Error - ${error.message}`);
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

