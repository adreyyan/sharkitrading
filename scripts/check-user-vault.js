const { ethers } = require("hardhat");

async function main() {
  const userAddress = process.argv[2];
  
  if (!userAddress) {
    console.log("Usage: node scripts/check-user-vault.js <userAddress>");
    process.exit(1);
  }

  const vaultAddress = "0xaABBC3d80b9C7e33Eaf2D148f52d60A5ebBc4084";
  
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/4Bf12QaQ6tjN7-92DiLEO');
  const vault = new ethers.Contract(
    vaultAddress,
    [
      "event NFTDeposited(address indexed user, uint256 plainReceiptId, address nftContract, uint256 tokenId, uint256 amount, bool isERC721)"
    ],
    provider
  );
  
  console.log("\n🏦 CHECKING VAULT FOR:", userAddress);
  console.log("=".repeat(60));
  
  // Get current block
  const currentBlock = await provider.getBlockNumber();
  console.log(`Current block: ${currentBlock}`);
  
  // Check last 100k blocks
  const fromBlock = Math.max(0, currentBlock - 100000);
  console.log(`Checking blocks ${fromBlock} to ${currentBlock}...\n`);
  
  // Get deposit events
  const filter = vault.filters.NFTDeposited(userAddress);
  const events = await vault.queryFilter(filter, fromBlock, currentBlock);
  
  console.log(`\n📊 Found ${events.length} deposits\n`);
  
  for (const event of events) {
    console.log(`  Receipt ID: ${event.args.plainReceiptId}`);
    console.log(`  NFT Contract: ${event.args.nftContract}`);
    console.log(`  Token ID: ${event.args.tokenId}`);
    console.log(`  Block: ${event.blockNumber}`);
    console.log(`  TX: ${event.transactionHash}`);
    console.log("");
  }
  
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

