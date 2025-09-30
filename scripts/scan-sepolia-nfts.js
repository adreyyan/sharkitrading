const hre = require("hardhat");

async function main() {
  console.log("🔍 Scanning for NFTs on Sepolia...");
  
  const [deployer] = await hre.ethers.getSigners();
  const userAddress = deployer.address;
  
  console.log("👤 Scanning address:", userAddress);
  console.log("🌐 Network: Sepolia");
  
  // Common ERC721 ABI for balance checking
  const ERC721_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function tokenURI(uint256 tokenId) view returns (string)"
  ];
  
  // Let's check your recent transactions for contract creations
  console.log("\n📡 Checking your recent transactions for NFT contracts...");
  
  try {
    // Get your transaction count (nonce)
    const nonce = await deployer.provider.getTransactionCount(userAddress);
    console.log(`📊 Total transactions sent: ${nonce}`);
    
    const foundNFTs = [];
    
    // Check possible contract addresses you might have created
    for (let i = Math.max(0, nonce - 10); i < nonce; i++) {
      const contractAddress = hre.ethers.getCreateAddress({
        from: userAddress,
        nonce: i
      });
      
      try {
        // Try to check if it's an NFT contract
        const contract = new hre.ethers.Contract(contractAddress, ERC721_ABI, deployer.provider);
        
        // Check if we can call NFT functions
        const balance = await contract.balanceOf(userAddress);
        if (balance > 0) {
          const name = await contract.name();
          const symbol = await contract.symbol();
          
          console.log(`✅ Found NFT contract at nonce ${i}:`);
          console.log(`   📄 Address: ${contractAddress}`);
          console.log(`   🏷️  Name: ${name} (${symbol})`);
          console.log(`   🔢 You own: ${balance} NFTs`);
          
          // Get token IDs you own
          const tokenIds = [];
          for (let j = 0; j < Math.min(Number(balance), 10); j++) {
            try {
              const tokenId = await contract.tokenOfOwnerByIndex(userAddress, j);
              tokenIds.push(tokenId.toString());
            } catch (e) {
              // Not all contracts support tokenOfOwnerByIndex
              break;
            }
          }
          
          foundNFTs.push({
            address: contractAddress,
            name,
            symbol,
            balance: balance.toString(),
            tokenIds
          });
          
          console.log(`   🎯 Token IDs: ${tokenIds.join(", ") || "Unable to enumerate"}`);
          console.log(`   🔗 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
        }
      } catch (error) {
        // Not an NFT contract or other error - skip
        continue;
      }
    }
    
    if (foundNFTs.length === 0) {
      console.log("\n❌ No NFTs found in your deployed contracts");
      console.log("\n💡 Options:");
      console.log("1. Deploy a test NFT contract: npx hardhat run scripts/deploy-test-nft.js --network sepolia");
      console.log("2. Mint from existing Sepolia NFT collections");
      console.log("3. Check https://sepolia.etherscan.io/address/" + userAddress + " for recent transactions");
    } else {
      console.log(`\n🎉 Found ${foundNFTs.length} NFT contract(s)!`);
      
      console.log("\n📋 Ready to trade these NFTs with fhEVM:");
      foundNFTs.forEach(nft => {
        console.log(`\n🎨 ${nft.name} (${nft.symbol})`);
        console.log(`   Contract: ${nft.address}`);
        console.log(`   Balance: ${nft.balance} NFTs`);
        console.log(`   Token IDs: ${nft.tokenIds.join(", ") || "Check Etherscan"}`);
      });
      
      console.log("\n🔥 These will now appear in your fhEVM trading interface!");
      console.log("🔄 Refresh your browser to see them");
    }
    
  } catch (error) {
    console.error("❌ Error scanning NFTs:", error.message);
    console.log("\n💡 Manual check:");
    console.log("🔗 Go to: https://sepolia.etherscan.io/address/" + userAddress);
    console.log("📋 Look for 'Contract Creation' transactions to find your NFT contracts");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
