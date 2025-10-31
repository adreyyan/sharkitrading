const hre = require("hardhat");

async function main() {
  const vaultAddress = "0x71dB9b7BBEA15936Ae1d1ce8178F34E7eF6f1d07";
  const tradingAddress = "0x862E12Dd307c334E0A970c2c72639Bc6CEd71EC2";
  const creatorAddress = "0x6d0fC679FaffC0046eB82455282aeA3f2Ef0aF38";
  
  console.log('\n🔍 CHECKING VAULT APPROVAL');
  console.log('================================');
  console.log('Vault:', vaultAddress);
  console.log('Trading Contract:', tradingAddress);
  console.log('Creator:', creatorAddress);
  
  const vault = await hre.ethers.getContractAt("PrivateNFTVault", vaultAddress);
  
  try {
    const isApproved = await vault.isApprovedForAll(creatorAddress, tradingAddress);
    console.log('\n✅ Is Trading Contract Approved?', isApproved);
    
    if (!isApproved) {
      console.log('\n❌ PROBLEM FOUND!');
      console.log('The creator has NOT approved the trading contract to transfer vault receipts!');
      console.log('\nThe creator needs to call:');
      console.log(`vault.setApprovalForAll("${tradingAddress}", true)`);
    } else {
      console.log('\n✅ Approval is correct! Problem must be elsewhere.');
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


