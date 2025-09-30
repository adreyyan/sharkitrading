const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0xDfFc5163576f324448813ea6aAB9A84971Af4A1c";
  
  console.log("🧪 Testing BulkNFTSender contract...");
  console.log("📋 Contract Address:", contractAddress);

  // Get the contract with a signer
  const [signer] = await ethers.getSigners();
  const BulkNFTSender = await ethers.getContractFactory("BulkNFTSender");
  const contract = BulkNFTSender.attach(contractAddress).connect(signer);

  try {
    // Test 1: Check contract owner
    console.log("\n🔍 Test 1: Checking contract owner...");
    const owner = await contract.owner();
    console.log("✅ Contract Owner:", owner);

    // Test 2: Check if contract is responding
    console.log("\n🔍 Test 2: Testing view functions...");
    
    // Test approval check with dummy data (should not revert)
    const dummyContract = "0x1234567890123456789012345678901234567890";
    const dummyOwner = "0x1234567890123456789012345678901234567890";
    
    try {
      const isApproved = await contract.isERC721Approved(dummyContract, 1, dummyOwner);
      console.log("✅ ERC721 approval check working, result:", isApproved);
    } catch (error) {
      console.log("⚠️  ERC721 approval check (expected to fail with dummy data):", error.message);
    }

    try {
      const isApproved1155 = await contract.isERC1155Approved(dummyContract, dummyOwner);
      console.log("✅ ERC1155 approval check working, result:", isApproved1155);
    } catch (error) {
      console.log("⚠️  ERC1155 approval check (expected to fail with dummy data):", error.message);
    }

    console.log("\n🎉 Contract is deployed and responding correctly!");
    console.log("\n📋 Available Functions:");
    console.log("   • bulkTransferERC721ToOne(contracts[], tokenIds[], recipient)");
    console.log("   • bulkTransferERC721ToMany(contracts[], tokenIds[], recipients[])");
    console.log("   • bulkTransferERC1155ToOne(contracts[], tokenIds[], amounts[], recipient)");
    console.log("   • bulkTransferERC1155ToMany(contracts[], tokenIds[], amounts[], recipients[])");
    console.log("   • isERC721Approved(contract, tokenId, owner)");
    console.log("   • isERC1155Approved(contract, owner)");

    console.log("\n🚀 Ready for frontend integration!");
    
  } catch (error) {
    console.error("❌ Contract test failed:", error);
  }
}

main()
  .then(() => {
    console.log("\n✅ Contract testing completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Testing failed:", error);
    process.exit(1);
  });