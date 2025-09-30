const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678"; // ✅ V4 CONTRACT
const NFT_CONTRACT = "0x4c718854BbD7502D230b48E2EbD3A8CB4CdD7c57"; // Try NFT contract

async function main() {
  console.log('🔧 Approve ERC1155 NFT for Trading');
  console.log('==================================');
  console.log('🏠 Trading Contract:', CONTRACT_ADDRESS);
  console.log('🎨 NFT Contract:', NFT_CONTRACT);
  console.log('');

  try {
    // Get signer
    const [signer] = await ethers.getSigners();
    const userAddress = await signer.getAddress();
    
    console.log('👤 User Address:', userAddress);
    console.log('💰 User Balance:', ethers.formatEther(await signer.provider.getBalance(userAddress)), 'MONAD');
    console.log('');

    // ERC1155 contract
    const erc1155Abi = [
      'function balanceOf(address account, uint256 id) view returns (uint256)',
      'function isApprovedForAll(address owner, address operator) view returns (bool)',
      'function setApprovalForAll(address operator, bool approved)'
    ];
    
    const nftContract = new ethers.Contract(NFT_CONTRACT, erc1155Abi, signer);
    
    console.log('1️⃣ Checking current approval status...');
    const isApproved = await nftContract.isApprovedForAll(userAddress, CONTRACT_ADDRESS);
    console.log(`   Currently approved: ${isApproved}`);
    
    if (isApproved) {
      console.log('   ✅ Already approved! You can accept trades now.');
      return;
    }
    
    console.log('');
    console.log('2️⃣ Approving trading contract...');
    console.log('   📤 Sending approval transaction...');
    
    const tx = await nftContract.setApprovalForAll(CONTRACT_ADDRESS, true);
    console.log('   Transaction hash:', tx.hash);
    console.log('   ⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('   ✅ Approval confirmed!');
    console.log('   Block number:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    
    console.log('');
    console.log('3️⃣ Verifying approval...');
    const newApprovalStatus = await nftContract.isApprovedForAll(userAddress, CONTRACT_ADDRESS);
    console.log(`   Approval status: ${newApprovalStatus}`);
    
    if (newApprovalStatus) {
      console.log('   🎉 Success! You can now accept NFT trades.');
      console.log('   💡 Go back to the trading interface and try accepting the trade again.');
    } else {
      console.log('   ❌ Approval failed. Please try again.');
    }

  } catch (error) {
    console.error('❌ Error approving NFT:', error);
    
    if (error.message?.includes('insufficient funds')) {
      console.log('💡 Make sure you have enough MONAD for gas fees');
    } else if (error.message?.includes('user rejected')) {
      console.log('💡 Transaction was rejected. Please try again and confirm the transaction.');
    }
  }
}

main().catch(console.error); 