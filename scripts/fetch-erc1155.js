const { ethers } = require('hardhat');

// Common ERC1155 contracts on Monad testnet
const ERC1155_CONTRACTS = [
  {
    name: "Try NFT",
    address: "0x4c718854BbD7502D230b48E2EbD3A8CB4CdD7c57",
    tokenIds: [0, 1, 2, 3, 4, 5] // Check multiple token IDs
  }
  // Add more contracts here as needed
];

const USER_ADDRESS = "0x9Ab9C57909A0FBc3E60B158BFFc7113fe7218425"; // Update with your address

async function main() {
  console.log('🔍 Manual ERC1155 NFT Fetcher');
  console.log('=============================');
  console.log('👤 User Address:', USER_ADDRESS);
  console.log('');

  try {
    // Connect to provider
    const provider = new ethers.JsonRpcProvider('https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d');
    
    // ERC1155 ABI
    const erc1155Abi = [
      'function balanceOf(address account, uint256 id) view returns (uint256)',
      'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
      'function uri(uint256 id) view returns (string)',
      'function supportsInterface(bytes4 interfaceId) view returns (bool)',
      'function isApprovedForAll(address owner, address operator) view returns (bool)'
    ];

    const allNFTs = [];

    for (const contractInfo of ERC1155_CONTRACTS) {
      console.log(`📦 Checking ${contractInfo.name} (${contractInfo.address})`);
      console.log('─'.repeat(60));
      
      try {
        const contract = new ethers.Contract(contractInfo.address, erc1155Abi, provider);
        
        // Check if it's actually an ERC1155 contract
        const isERC1155 = await contract.supportsInterface('0xd9b67a26'); // ERC1155 interface ID
        if (!isERC1155) {
          console.log('   ⚠️  Not an ERC1155 contract, skipping...');
          continue;
        }

        // Check balances for multiple token IDs
        const accounts = contractInfo.tokenIds.map(() => USER_ADDRESS);
        const balances = await contract.balanceOfBatch(accounts, contractInfo.tokenIds);
        
        for (let i = 0; i < contractInfo.tokenIds.length; i++) {
          const tokenId = contractInfo.tokenIds[i];
          const balance = balances[i];
          
          if (balance.toString() !== "0") {
            console.log(`   🎨 Token ID ${tokenId}: ${balance.toString()} copies`);
            
            // Try to get metadata URI
            try {
              const uri = await contract.uri(tokenId);
              console.log(`      📄 URI: ${uri}`);
            } catch (uriError) {
              console.log(`      📄 URI: Unable to fetch`);
            }
            
            // Add to our NFT list
            allNFTs.push({
              contractAddress: contractInfo.address,
              contractName: contractInfo.name,
              tokenId: tokenId.toString(),
              balance: balance.toString(),
              standard: 'ERC1155'
            });
          }
        }
        
        // Check approval status
        const tradingContract = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678"; // ✅ V4 CONTRACT
        const isApproved = await contract.isApprovedForAll(USER_ADDRESS, tradingContract);
        console.log(`   ✅ Approved for trading: ${isApproved}`);
        
      } catch (contractError) {
        console.log(`   ❌ Error checking contract: ${contractError.message}`);
      }
      
      console.log('');
    }

    console.log('📋 Summary of Your ERC1155 NFTs');
    console.log('===============================');
    
    if (allNFTs.length === 0) {
      console.log('❌ No ERC1155 NFTs found');
      console.log('💡 This could mean:');
      console.log('   • You don\'t own any ERC1155 NFTs');
      console.log('   • The contracts are not in our list');
      console.log('   • There\'s a network issue');
    } else {
      allNFTs.forEach((nft, index) => {
        console.log(`${index + 1}. ${nft.contractName}`);
        console.log(`   Contract: ${nft.contractAddress}`);
        console.log(`   Token ID: ${nft.tokenId}`);
        console.log(`   Balance: ${nft.balance} copies`);
        console.log(`   Standard: ${nft.standard}`);
        console.log('');
      });
    }

    console.log('🔧 To add more ERC1155 contracts:');
    console.log('1. Edit this script');
    console.log('2. Add contract addresses to ERC1155_CONTRACTS array');
    console.log('3. Run the script again');

  } catch (error) {
    console.error('❌ Error fetching ERC1155 NFTs:', error);
  }
}

// Allow running with custom address
if (process.argv.length > 2) {
  const customAddress = process.argv[2];
  if (ethers.isAddress(customAddress)) {
    USER_ADDRESS = customAddress;
    console.log(`Using custom address: ${customAddress}`);
  }
}

main().catch(console.error); 