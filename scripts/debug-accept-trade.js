const { ethers } = require("hardhat");

async function main() {
  const tradeId = process.argv[2];
  const acceptorAddress = process.argv[3];
  
  if (!tradeId || !acceptorAddress) {
    console.log("Usage: node scripts/debug-accept-trade.js <tradeId> <acceptorAddress>");
    process.exit(1);
  }

  const tradingAddress = "0xB4981E473Ad74a410b5479bf21635c47108D243a";
  const vaultAddress = "0xaABBC3d80b9C7e33Eaf2D148f52d60A5ebBc4084";
  
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/4Bf12QaQ6tjN7-92DiLEO');
  const trading = await ethers.getContractAt("PrivateNFTTradingV1", tradingAddress, provider);
  const vault = await ethers.getContractAt("PrivateNFTVault", vaultAddress, provider);

  console.log("\n🔍 DEBUGGING TRADE ACCEPTANCE");
  console.log("=".repeat(60));
  console.log("Trade ID:", tradeId);
  console.log("Acceptor:", acceptorAddress);
  
  try {
    // Get trade details
    const trade = await trading.getTrade(tradeId);
    
    console.log("\n📋 TRADE DETAILS:");
    console.log("  Creator:", trade.creator);
    console.log("  Counterparty:", trade.counterparty);
    console.log("  Status:", ["Pending", "Accepted", "Cancelled", "Declined"][trade.status]);
    console.log("  Offered Receipt IDs:", trade.offeredReceiptIds.map(id => id.toString()));
    console.log("  Requested Receipt IDs:", trade.requestedReceiptIds.map(id => id.toString()));
    console.log("  Offered ETH:", ethers.formatEther(trade.offeredETH));
    console.log("  Requested ETH:", ethers.formatEther(trade.requestedETH));
    
    // Check if acceptor is the correct counterparty
    console.log("\n✅ VALIDATION CHECKS:");
    if (trade.counterparty.toLowerCase() !== acceptorAddress.toLowerCase()) {
      console.log("❌ ERROR: Acceptor is not the counterparty!");
      console.log("   Expected:", trade.counterparty);
      console.log("   Trying:", acceptorAddress);
    } else {
      console.log("✅ Acceptor is the correct counterparty");
    }
    
    if (trade.status !== 0) {
      console.log("❌ ERROR: Trade is not pending!");
      console.log("   Status:", ["Pending", "Accepted", "Cancelled", "Declined"][trade.status]);
    } else {
      console.log("✅ Trade is pending");
    }
    
    // Check if offered receipts exist in vault
    console.log("\n🏦 CHECKING VAULT RECEIPTS:");
    for (const receiptId of trade.offeredReceiptIds) {
      console.log(`\n  Checking receipt #${receiptId}...`);
      
      // Get all NFTDeposited events for this receipt
      const filter = vault.filters.NFTDeposited();
      const events = await vault.queryFilter(filter, 0, 'latest');
      
      const receiptEvent = events.find(e => e.args.plainReceiptId.toString() === receiptId.toString());
      
      if (!receiptEvent) {
        console.log(`    ❌ Receipt #${receiptId} not found in vault!`);
      } else {
        console.log(`    ✅ Receipt exists`);
        console.log(`       Owner: ${receiptEvent.args.user}`);
        console.log(`       Block: ${receiptEvent.blockNumber}`);
        
        // Check if owner matches creator
        if (receiptEvent.args.user.toLowerCase() !== trade.creator.toLowerCase()) {
          console.log(`    ❌ WARNING: Receipt owner doesn't match trade creator!`);
        } else {
          console.log(`    ✅ Receipt owned by trade creator`);
        }
      }
    }
    
    // Check vault approval
    console.log("\n🔑 CHECKING VAULT APPROVALS:");
    const creatorApproved = await vault.isApprovedForAll(trade.creator, tradingAddress);
    console.log(`  Creator approved trading contract: ${creatorApproved ? '✅' : '❌'}`);
    
    if (trade.requestedReceiptIds.length > 0) {
      const acceptorApproved = await vault.isApprovedForAll(acceptorAddress, tradingAddress);
      console.log(`  Acceptor approved trading contract: ${acceptorApproved ? '✅' : '❌'}`);
    }
    
    // Calculate ETH needed
    const fee = await trading.tradeFee();
    const totalNeeded = BigInt(trade.requestedETH) + fee;
    console.log("\n💰 ETH REQUIREMENTS:");
    console.log(`  Trade fee: ${ethers.formatEther(fee)} ETH`);
    console.log(`  Requested ETH: ${ethers.formatEther(trade.requestedETH)} ETH`);
    console.log(`  TOTAL NEEDED: ${ethers.formatEther(totalNeeded)} ETH`);
    
    const acceptorBalance = await provider.getBalance(acceptorAddress);
    console.log(`  Acceptor balance: ${ethers.formatEther(acceptorBalance)} ETH`);
    
    if (acceptorBalance < totalNeeded) {
      console.log(`  ❌ Insufficient balance!`);
    } else {
      console.log(`  ✅ Sufficient balance`);
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY:");
    const canAccept = 
      trade.counterparty.toLowerCase() === acceptorAddress.toLowerCase() &&
      trade.status === 0 &&
      creatorApproved &&
      acceptorBalance >= totalNeeded;
    
    if (canAccept) {
      console.log("✅ Trade CAN be accepted!");
    } else {
      console.log("❌ Trade CANNOT be accepted - fix the issues above");
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

