const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678"; // ✅ V4 CONTRACT
const NFT_CONTRACT = "0x4c718854BbD7502D230b48E2EbD3A8CB4CdD7c57"; // Try NFT contract
const TOKEN_ID = 0; // Try NFT token ID
const USER_ADDRESS = "0x9Ab9C57909A0FBc3E60B158BFFc7113fe7218425"; // Counterparty address

async function main() {
  console.log('🔍 NFT Ownership & Approval Check');
  console.log('==================================');
  console.log('🏠 Trading Contract:', CONTRACT_ADDRESS);
  console.log('🎨 NFT Contract:', NFT_CONTRACT);
  console.log('🆔 Token ID:', TOKEN_ID);
  console.log('👤 User Address:', USER_ADDRESS);
  console.log('');

  try {
    // Connect to provider
    const provider = new ethers.JsonRpcProvider('https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d');
    
    // ERC1155 contract
    const erc1155Abi = [
      'function balanceOf(address account, uint256 id) view returns (uint256)',
      'function isApprovedForAll(address owner, address operator) view returns (bool)',
      'function setApprovalForAll(address operator, bool approved)'
    ];
    
    const nftContract = new ethers.Contract(NFT_CONTRACT, erc1155Abi, provider);
    
    console.log('1️⃣ Checking NFT ownership...');
    const balance = await nftContract.balanceOf(USER_ADDRESS, TOKEN_ID);
    console.log(`   Balance: ${balance.toString()} copies of token ${TOKEN_ID}`);
    
    if (balance.toString() === "0") {
      console.log('   ❌ User does not own this NFT!');
      console.log('   💡 You need to own the "Try" NFT to accept this trade');
      return;
    } else {
      console.log('   ✅ User owns this NFT');
    }
    
    console.log('');
    console.log('2️⃣ Checking NFT approval...');
    const isApproved = await nftContract.isApprovedForAll(USER_ADDRESS, CONTRACT_ADDRESS);
    console.log(`   Approved for trading: ${isApproved}`);
    
    if (!isApproved) {
      console.log('   ❌ NFT not approved for trading!');
      console.log('   💡 You need to approve the trading contract first');
      console.log('');
      console.log('🔧 To approve your NFT for trading:');
      console.log('   1. Go to the trading interface');
      console.log('   2. Click "Approve ERC1155" button');
      console.log('   3. Confirm the approval transaction');
      console.log('   4. Then try accepting the trade again');
    } else {
      console.log('   ✅ NFT is approved for trading');
      console.log('   💡 You should be able to accept the trade now');
    }
    
    console.log('');
    console.log('📋 Summary:');
    console.log(`   NFT Ownership: ${balance.toString() > "0" ? "✅" : "❌"}`);
    console.log(`   NFT Approval: ${isApproved ? "✅" : "❌"}`);
    console.log(`   Ready to trade: ${balance.toString() > "0" && isApproved ? "✅" : "❌"}`);

  } catch (error) {
    console.error('❌ Error checking NFT status:', error);
  }
}

main().catch(console.error); 