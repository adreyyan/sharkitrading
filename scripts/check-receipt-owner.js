const hre = require("hardhat");

async function main() {
  const vaultAddress = "0x71dB9b7BBEA15936Ae1d1ce8178F34E7eF6f1d07";
  const creatorAddress = "0x6d0fC679FaffC0046eB82455282aeA3f2Ef0aF38";
  const receiptId = 4;
  
  console.log('\n🔍 CHECKING RECEIPT OWNERSHIP');
  console.log('================================');
  console.log('Vault:', vaultAddress);
  console.log('Receipt ID:', receiptId);
  console.log('Expected Owner:', creatorAddress);
  
  const vault = await hre.ethers.getContractAt("PrivateNFTVault", vaultAddress);
  
  try {
    // Convert to euint256 format
    const FHE = await hre.ethers.getContractAt("FHE", vaultAddress);
    
    // Get receipt details
    console.log('\n📦 Checking receipt details...');
    
    // Query all deposits for this user
    const filter = vault.filters.NFTDeposited(creatorAddress);
    const events = await vault.queryFilter(filter, 0, 'latest');
    
    console.log(`\nFound ${events.length} deposits for this user:`);
    events.forEach((event, i) => {
      console.log(`  ${i + 1}. Receipt ID: ${event.args.receiptId.toString()}`);
    });
    
    const hasReceipt4 = events.some(e => e.args.receiptId.toString() === '4');
    
    if (hasReceipt4) {
      console.log('\n✅ Creator owns receipt #4!');
    } else {
      console.log('\n❌ PROBLEM: Creator does NOT own receipt #4!');
      console.log('Receipt might have been withdrawn or traded already.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('================================\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


