const hre = require("hardhat");

async function main() {
  console.log("🔍 Checking your NFTs on Sepolia...");
  
  const [deployer] = await hre.ethers.getSigners();
  const userAddress = deployer.address;
  
  console.log("👤 Checking NFTs for:", userAddress);
  console.log("🌐 Network: Sepolia Testnet");
  
  // Add known NFT contract addresses here
  const nftContracts = [
    // Add any NFT contract addresses you want to check
    // We'll scan for common ones and any you specify
  ];
  
  // If you know your TestNFT contract address, add it here
  const testNFTAddress = process.argv[2]; // Pass as argument
  
  if (testNFTAddress) {
    console.log(`\n📄 Checking TestNFT contract: ${testNFTAddress}`);
    
    try {
      // Create contract instance
      const TestNFT = await hre.ethers.getContractFactory("TestNFT");
      const testNFT = TestNFT.attach(testNFTAddress);
      
      // Get total supply
      const totalSupply = await testNFT.totalSupply();
      console.log(`📊 Total supply: ${totalSupply}`);
      
      // Check which NFTs you own
      const ownedNFTs = [];
      
      for (let tokenId = 1; tokenId <= Number(totalSupply); tokenId++) {
        try {
          const owner = await testNFT.ownerOf(tokenId);
          if (owner.toLowerCase() === userAddress.toLowerCase()) {
            const tokenName = await testNFT.getTokenName(tokenId);
            const tokenURI = await testNFT.tokenURI(tokenId);
            
            ownedNFTs.push({
              tokenId,
              name: tokenName,
              uri: tokenURI
            });
            
            console.log(`✅ You own Token #${tokenId}: "${tokenName}"`);
          }
        } catch (error) {
          // Token might not exist or other error
          continue;
        }
      }
      
      if (ownedNFTs.length === 0) {
        console.log("❌ You don't own any NFTs from this contract");
      } else {
        console.log(`\n🎉 You own ${ownedNFTs.length} NFT(s) from this contract!`);
        console.log("\n📋 Your NFTs:");
        ownedNFTs.forEach(nft => {
          console.log(`   • Token #${nft.tokenId}: "${nft.name}"`);
          console.log(`     Contract: ${testNFTAddress}`);
          console.log(`     OpenSea: https://testnets.opensea.io/assets/sepolia/${testNFTAddress}/${nft.tokenId}`);
          console.log(`     Etherscan: https://sepolia.etherscan.io/token/${testNFTAddress}?a=${nft.tokenId}`);
        });
        
        // Ready for trading message
        console.log("\n🔥 Ready for fhEVM encrypted trading!");
        console.log("💡 Use these NFT details in your trading interface:");
        console.log(`   Contract Address: ${testNFTAddress}`);
        console.log(`   Token IDs: ${ownedNFTs.map(n => n.tokenId).join(", ")}`);
      }
      
    } catch (error) {
      console.error("❌ Error checking NFTs:", error.message);
    }
  } else {
    console.log("\n💡 Usage: npx hardhat run scripts/check-my-nfts.js --network sepolia CONTRACT_ADDRESS");
    console.log("Example: npx hardhat run scripts/check-my-nfts.js --network sepolia 0x1234567890123456789012345678901234567890");
  }
  
  // Also check ETH balance
  const balance = await deployer.provider.getBalance(userAddress);
  console.log(`\n💰 Your ETH balance: ${hre.ethers.formatEther(balance)} ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
