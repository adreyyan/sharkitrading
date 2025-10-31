const { ethers } = require("hardhat");

async function main() {
  console.log("\n🧪 TESTING FULL VAULT RECEIPT TRADING FLOW");
  console.log("=".repeat(70));

  const vaultAddress = "0xaABBC3d80b9C7e33Eaf2D148f52d60A5ebBc4084";
  const tradingAddress = "0xB4981E473Ad74a410b5479bf21635c47108D243a";
  
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/4Bf12QaQ6tjN7-92DiLEO');
  
  const trading = new ethers.Contract(
    tradingAddress,
    [
      "function getTrade(uint256) view returns (tuple(uint256 id, address creator, address counterparty, uint256[] offeredReceiptIds, uint256[] requestedReceiptIds, uint256 offeredETH, uint256 requestedETH, string message, uint8 status))",
      "function tradeFee() view returns (uint256)"
    ],
    provider
  );
  
  const vault = new ethers.Contract(
    vaultAddress,
    ["event NFTDeposited(address indexed user, uint256 plainReceiptId, address nftContract, uint256 tokenId, uint256 amount, bool isERC721)"],
    provider
  );

  // Step 1: Check wallet 1's receipts
  console.log("\n📋 STEP 1: Check Wallet 1 Receipts");
  console.log("-".repeat(70));
  
  const wallet1 = "0x6d0fC679FaffC0046eB82455282aeA3f2Ef0aF38";
  const currentBlock = await provider.getBlockNumber();
  const filter1 = vault.filters.NFTDeposited(wallet1);
  const events1 = await vault.queryFilter(filter1, Math.max(0, currentBlock - 100000), currentBlock);
  
  console.log(`Wallet 1 (${wallet1})`);
  console.log(`  Receipts found: ${events1.length}`);
  
  if (events1.length === 0) {
    console.log("\n❌ PROBLEM: Wallet 1 has NO vault receipts!");
    console.log("   Solution: Go to /vault and deposit an NFT first");
    return;
  }
  
  for (const e of events1) {
    console.log(`    - Receipt #${e.args.plainReceiptId} (block ${e.blockNumber})`);
  }
  
  // Step 2: Check existing trades
  console.log("\n📋 STEP 2: Check Existing Trades");
  console.log("-".repeat(70));
  
  let validTrades = [];
  for (let i = 1; i <= 20; i++) {
    try {
      const trade = await trading.getTrade(i);
      if (trade.id.toString() !== "0") {
        validTrades.push({ id: i, trade });
        const status = ["Pending", "Accepted", "Cancelled", "Declined"][trade.status];
        console.log(`  Trade #${i}: ${status}`);
        console.log(`    Creator: ${trade.creator}`);
        console.log(`    Counterparty: ${trade.counterparty}`);
        console.log(`    Offered Receipts: [${trade.offeredReceiptIds.join(", ")}]`);
      }
    } catch (e) {
      // Trade doesn't exist
    }
  }
  
  if (validTrades.length === 0) {
    console.log("  No trades exist on blockchain yet");
  }
  
  // Step 3: Instructions
  console.log("\n📋 STEP 3: What To Do Next");
  console.log("-".repeat(70));
  
  if (events1.length > 0) {
    const receiptToUse = events1[events1.length - 1].args.plainReceiptId.toString();
    console.log("✅ You have vault receipts! Here's how to trade:");
    console.log("\n1. Open browser at: https://zamanfttrading.vercel.app/swap");
    console.log(`2. Make sure you're connected as: ${wallet1.slice(0, 10)}...`);
    console.log(`3. Select vault receipt #${receiptToUse}`);
    console.log("4. Enter counterparty: 0x6e1317c587160BeA45b30Ff201E34f76B63942a0");
    console.log("5. Click 'Propose Trade'");
    console.log("6. WAIT for MetaMask popup → CONFIRM transaction");
    console.log("7. WAIT for 'Trade created!' success message");
    console.log("8. Copy the trade link");
    console.log("9. Switch to wallet 0x6e13...");
    console.log("10. Open the trade link and accept");
    
    console.log("\n⚠️  IMPORTANT:");
    console.log("  - Don't refresh the page while creating trade");
    console.log("  - Wait for blockchain confirmation before accepting");
    console.log("  - Check console logs for any errors");
  }
  
  // Step 4: Debug info
  const fee = await trading.tradeFee();
  console.log("\n📋 CONTRACT INFO:");
  console.log("-".repeat(70));
  console.log(`  Trading Contract: ${tradingAddress}`);
  console.log(`  Vault Contract: ${vaultAddress}`);
  console.log(`  Trade Fee: ${ethers.formatEther(fee)} ETH`);
  console.log(`  Current Block: ${currentBlock}`);
  
  console.log("\n" + "=".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

