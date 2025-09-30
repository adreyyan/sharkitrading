const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying MonadNFTTrading V3.0.0 with ERC1155 support...");
  
  // Get the ContractFactory and Signers here.
  const MonadNFTTrading = await hre.ethers.getContractFactory("MonadNFTTrading");
  
  console.log("📦 Deploying contract...");
  
  // Deploy the contract
  const contract = await MonadNFTTrading.deploy();
  
  // Wait for deployment to finish
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  
  console.log("✅ Contract deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  
  // Verify contract details
  console.log("\n🔍 Verifying contract details...");
  
  try {
    const version = await contract.getVersion();
    const tradeFee = await contract.TRADE_FEE();
    const feeCollector = await contract.FEE_COLLECTOR();
    const maxNFTs = await contract.MAX_NFTS_PER_TRADE();
    
    console.log("📋 Contract Details:");
    console.log("   Version:", version);
    console.log("   Trade Fee:", hre.ethers.formatEther(tradeFee), "MONAD");
    console.log("   Fee Collector:", feeCollector);
    console.log("   Max NFTs per Trade:", maxNFTs.toString());
    
    // Test ERC165 support
    const supportsERC721 = await contract.supportsInterface("0x80ac58cd"); // ERC721
    const supportsERC1155 = await contract.supportsInterface("0xd9b67a26"); // ERC1155
    
    console.log("🎯 Token Support:");
    console.log("   ERC721 Support:", supportsERC721);
    console.log("   ERC1155 Support:", supportsERC1155);
    
  } catch (error) {
    console.log("⚠️  Could not verify all contract details:", error.message);
  }
  
  console.log("\n🎉 Deployment Complete!");
  console.log("📝 Update your frontend with the new contract address:");
  console.log(`   CONTRACT_ADDRESS = "${contractAddress}"`);
  
  return contractAddress;
}

main()
  .then((address) => {
    console.log(`\n✨ Contract deployed at: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 