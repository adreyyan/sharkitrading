const { ethers } = require("hardhat");

async function main() {
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/4Bf12QaQ6tjN7-92DiLEO');
  const vaultAddress = "0xaABBC3d80b9C7e33Eaf2D148f52d60A5ebBc4084";
  const tradingAddress = "0xB4981E473Ad74a410b5479bf21635c47108D243a";
  
  const vault = new ethers.Contract(
    vaultAddress,
    ["event NFTDeposited(address indexed user, uint256 plainReceiptId, address nftContract, uint256 tokenId, uint256 amount, bool isERC721)"],
    provider
  );
  
  console.log("\n🔍 FINDING YOUR ACTUAL VAULT RECEIPTS...");
  console.log("=".repeat(60));
  
  const user1 = "0x6d0fC679FaffC0046eB82455282aeA3f2Ef0aF38";
  
  // Check all vault events EVER
  const currentBlock = await provider.getBlockNumber();
  console.log("Scanning from block 0 to", currentBlock);
  
  const filter = vault.filters.NFTDeposited(user1);
  const events = await vault.queryFilter(filter, 0, currentBlock);
  
  console.log(`\nFound ${events.length} deposits for ${user1}:`);
  
  if (events.length === 0) {
    console.log("\n❌ NO RECEIPTS FOUND!");
    console.log("You need to deposit an NFT first at /vault");
    return;
  }
  
  for (const event of events) {
    console.log(`\n  Receipt ID: ${event.args.plainReceiptId}`);
    console.log(`  NFT: ${event.args.nftContract}:${event.args.tokenId}`);
    console.log(`  Block: ${event.blockNumber}`);
    console.log(`  TX: ${event.transactionHash}`);
  }
  
  // Use the LAST receipt (most recent)
  const latestReceipt = events[events.length - 1].args.plainReceiptId.toString();
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ USE THIS RECEIPT ID IN YOUR TRADE:", latestReceipt);
  console.log("=".repeat(60));
  console.log("\n📋 STEPS:");
  console.log("1. Go to /swap page");
  console.log("2. Select the vault receipt that shows:", latestReceipt);
  console.log("3. Enter counterparty: 0x6e1317c587160BeA45b30Ff201E34f76B63942a0");
  console.log("4. Click 'Propose Trade'");
  console.log("5. It should work!");
}

main().then(() => process.exit(0)).catch(console.error);
