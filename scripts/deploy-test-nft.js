const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying TestNFT contract on Sepolia...");
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance < hre.ethers.parseEther("0.01")) {
    console.log("⚠️  Low balance! You may need more Sepolia ETH from a faucet");
  }

  try {
    // Deploy TestNFT contract
    console.log("\n📦 Deploying TestNFT contract...");
    const TestNFT = await hre.ethers.getContractFactory("TestNFT");
    
    const testNFT = await TestNFT.deploy({
      gasLimit: 3000000,
      gasPrice: hre.ethers.parseUnits("20", "gwei")
    });
    
    await testNFT.waitForDeployment();
    const contractAddress = await testNFT.getAddress();
    
    console.log("✅ TestNFT deployed to:", contractAddress);
    console.log("🔗 Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);

    // Wait for a few confirmations
    console.log("\n⏳ Waiting for confirmations...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Mint 10 test NFTs
    console.log("\n🎨 Minting 10 test NFTs...");
    
    const nftNames = [
      "Crypto Cat",
      "Digital Dragon", 
      "Pixel Penguin",
      "Blockchain Bear",
      "Ethereum Eagle",
      "Solidity Shark",
      "fhEVM Fox",
      "Zama Zebra",
      "Sepolia Snake",
      "Test Tiger"
    ];

    const mintedTokens = [];
    
    for (let i = 0; i < 10; i++) {
      try {
        console.log(`🔨 Minting NFT #${i + 1}: ${nftNames[i]}...`);
        
        const tx = await testNFT.mint(deployer.address, nftNames[i], {
          gasLimit: 200000,
          gasPrice: hre.ethers.parseUnits("20", "gwei")
        });
        
        const receipt = await tx.wait();
        const tokenId = i + 1;
        mintedTokens.push(tokenId);
        
        console.log(`   ✅ Minted "${nftNames[i]}" as Token #${tokenId}`);
        console.log(`   📄 Tx: https://sepolia.etherscan.io/tx/${receipt.hash}`);
        
        // Small delay between mints
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`   ❌ Failed to mint NFT #${i + 1}:`, error.message);
      }
    }

    // Get total supply
    const totalSupply = await testNFT.totalSupply();
    console.log(`\n🎯 Total minted NFTs: ${totalSupply}`);
    
    // Display summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT & MINTING COMPLETE!");
    console.log("=".repeat(60));
    console.log(`📄 Contract: ${contractAddress}`);
    console.log(`🔗 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
    console.log(`👤 Owner: ${deployer.address}`);
    console.log(`🎨 Total NFTs: ${totalSupply}`);
    console.log(`📋 Token IDs: ${mintedTokens.join(", ")}`);
    console.log("\n🔥 Ready to test fhEVM NFT trading!");
    console.log("💡 Use this contract address in your trading interface");
    
    return {
      contractAddress,
      totalSupply: totalSupply.toString(),
      mintedTokens,
      deployerAddress: deployer.address
    };

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
