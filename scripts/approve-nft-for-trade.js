const { ethers } = require('ethers');

// Configuration
const TRADING_CONTRACT = '0x773C0fc7Ce0489B078A532123dd0D86131E1ACf9';

async function approveNFTForTrading(nftContract, tokenId, privateKey, standard = 'ERC721') {
  console.log('🔓 APPROVING NFT FOR TRADING');
  console.log('============================');
  console.log(`NFT Contract: ${nftContract}`);
  console.log(`Token ID: ${tokenId}`);
  console.log(`Standard: ${standard}`);
  console.log(`Trading Contract: ${TRADING_CONTRACT}`);
  console.log('');

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider('https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d');
  const signer = new ethers.Wallet(privateKey, provider);
  const userAddress = await signer.getAddress();
  
  console.log(`👤 User Address: ${userAddress}`);
  console.log('');

  try {
    if (standard === 'ERC721') {
      const erc721Contract = new ethers.Contract(
        nftContract,
        [
          'function ownerOf(uint256 tokenId) view returns (address)',
          'function getApproved(uint256 tokenId) view returns (address)',
          'function isApprovedForAll(address owner, address operator) view returns (bool)',
          'function setApprovalForAll(address operator, bool approved)'
        ],
        signer
      );

      // Verify ownership
      console.log('🔍 Verifying ownership...');
      const owner = await erc721Contract.ownerOf(tokenId);
      if (owner.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error(`❌ You don't own this NFT. Owner: ${owner}`);
      }
      console.log('✅ Ownership confirmed');

      // Check current approval
      console.log('📋 Checking current approval status...');
      const currentApproved = await erc721Contract.getApproved(tokenId);
      const isApprovedForAll = await erc721Contract.isApprovedForAll(userAddress, TRADING_CONTRACT);
      
      console.log(`Current getApproved: ${currentApproved}`);
      console.log(`Current isApprovedForAll: ${isApprovedForAll}`);

      if (currentApproved.toLowerCase() === TRADING_CONTRACT.toLowerCase() || isApprovedForAll) {
        console.log('✅ NFT is already approved for trading!');
        return;
      }

      // Approve for all (recommended)
      console.log('📝 Calling setApprovalForAll...');
      const tx = await erc721Contract.setApprovalForAll(TRADING_CONTRACT, true);
      console.log(`⏳ Transaction sent: ${tx.hash}`);
      
      console.log('⏳ Waiting for confirmation...');
      await tx.wait();
      console.log('✅ ERC721 approval successful!');

    } else if (standard === 'ERC1155') {
      const erc1155Contract = new ethers.Contract(
        nftContract,
        [
          'function balanceOf(address account, uint256 id) view returns (uint256)',
          'function isApprovedForAll(address account, address operator) view returns (bool)',
          'function setApprovalForAll(address operator, bool approved)'
        ],
        signer
      );

      // Check balance
      console.log('🔍 Checking balance...');
      const balance = await erc1155Contract.balanceOf(userAddress, tokenId);
      console.log(`Balance: ${balance.toString()}`);
      
      if (balance.toString() === '0') {
        throw new Error(`❌ You don't own any copies of this ERC1155 token`);
      }

      // Check approval
      console.log('📋 Checking approval status...');
      const isApproved = await erc1155Contract.isApprovedForAll(userAddress, TRADING_CONTRACT);
      console.log(`Current approval: ${isApproved}`);

      if (isApproved) {
        console.log('✅ ERC1155 collection is already approved for trading!');
        return;
      }

      // Approve
      console.log('📝 Calling setApprovalForAll...');
      const tx = await erc1155Contract.setApprovalForAll(TRADING_CONTRACT, true);
      console.log(`⏳ Transaction sent: ${tx.hash}`);
      
      console.log('⏳ Waiting for confirmation...');
      await tx.wait();
      console.log('✅ ERC1155 approval successful!');
    }

    console.log('');
    console.log('🎉 SUCCESS! Your NFT is now approved for trading.');
    console.log('You can now create trades with this NFT.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: node approve-nft-for-trade.js <nft_contract> <token_id> <private_key> [standard]');
    console.log('');
    console.log('Example:');
    console.log('  node approve-nft-for-trade.js 0x87E1F1824C9356733A25d6beD6b9c87A3b31E107 2296 your_private_key ERC721');
    process.exit(1);
  }
  
  const [nftContract, tokenId, privateKey, standard = 'ERC721'] = args;
  approveNFTForTrading(nftContract, tokenId, privateKey, standard);
}

module.exports = { approveNFTForTrading }; 