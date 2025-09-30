const { ethers } = require("hardhat");

async function approveERC1155Collection() {
  console.log("🔓 APPROVING ERC1155 COLLECTION FOR TRADING");
  console.log("===========================================");
  
  // The problematic contract from the error
  const contractAddress = "0xc29b98DCa561295bd18AC269d3D9FFDfcc8aD426"; // Monadverse Chapter 7
  const tradingContract = "0x9e2c22E0D77500ddD9e15d5ff3D27F7643e1dCE3"; // V6 Trading Contract
  
  try {
    const [signer] = await ethers.getSigners();
    const userAddress = await signer.getAddress();
    
    console.log(`👤 User Address: ${userAddress}`);
    console.log(`🎨 NFT Contract: ${contractAddress} (Monadverse: Chapter 7)`);
    console.log(`🤝 Trading Contract: ${tradingContract}`);
    
    // Create contract instance
    const erc1155Contract = new ethers.Contract(
      contractAddress,
      [
        'function setApprovalForAll(address operator, bool approved)',
        'function isApprovedForAll(address account, address operator) view returns (bool)'
      ],
      signer
    );
    
    // Check current approval status
    console.log("\n1️⃣ Checking current approval status...");
    let isCurrentlyApproved = false;
    try {
      isCurrentlyApproved = await erc1155Contract.isApprovedForAll(userAddress, tradingContract);
      console.log(`📝 Current approval status: ${isCurrentlyApproved}`);
    } catch (error) {
      console.log(`⚠️ Could not check current approval status: ${error.message}`);
      console.log("Proceeding with approval attempt...");
    }
    
    if (isCurrentlyApproved) {
      console.log("✅ Collection is already approved for trading!");
      console.log("You should be able to create trades with these NFTs now.");
      return;
    }
    
    // Approve the collection
    console.log("\n2️⃣ Approving collection for trading...");
    console.log("📝 Calling setApprovalForAll(tradingContract, true)...");
    
    const tx = await erc1155Contract.setApprovalForAll(tradingContract, true);
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
    
    // Verify approval was successful
    console.log("\n3️⃣ Verifying approval...");
    try {
      const isNowApproved = await erc1155Contract.isApprovedForAll(userAddress, tradingContract);
      if (isNowApproved) {
        console.log("🎉 SUCCESS! Collection is now approved for trading!");
        console.log("");
        console.log("✅ You can now:");
        console.log("   • Create trades with your Monadverse Chapter 7 NFTs");
        console.log("   • Offer multiple NFTs from this collection");
        console.log("   • The approval covers ALL tokens in this collection");
        console.log("");
        console.log("💡 This was a one-time approval. You won't need to approve");
        console.log("   this collection again for future trades.");
      } else {
        console.log("❌ Approval verification failed. Please try again.");
      }
    } catch (verifyError) {
      console.log("⚠️ Could not verify approval, but transaction was successful.");
      console.log("Try creating your trade - it should work now!");
    }
    
  } catch (error) {
    console.error("❌ Approval failed:", error);
    
    if (error.message?.includes('user rejected')) {
      console.log("\n💡 The transaction was rejected in your wallet.");
      console.log("Please try running the script again and approve the transaction.");
    } else if (error.message?.includes('insufficient funds')) {
      console.log("\n💡 You don't have enough MONAD to pay for gas fees.");
      console.log("Please ensure you have some MONAD in your wallet for gas.");
    } else {
      console.log("\n💡 Possible solutions:");
      console.log("1. Check your network connection");
      console.log("2. Try increasing gas limit in your wallet");
      console.log("3. Wait a few minutes and try again (network might be congested)");
    }
  }
}

// Also provide a function to check approval status without approving
async function checkApprovalStatus() {
  console.log("🔍 CHECKING ERC1155 APPROVAL STATUS");
  console.log("===================================");
  
  const contractAddress = "0xc29b98DCa561295bd18AC269d3D9FFDfcc8aD426";
  const tradingContract = "0x9e2c22E0D77500ddD9e15d5ff3D27F7643e1dCE3";
  
  try {
    const [signer] = await ethers.getSigners();
    const userAddress = await signer.getAddress();
    
    const erc1155Contract = new ethers.Contract(
      contractAddress,
      ['function isApprovedForAll(address account, address operator) view returns (bool)'],
      signer
    );
    
    const isApproved = await erc1155Contract.isApprovedForAll(userAddress, tradingContract);
    
    console.log(`👤 User: ${userAddress}`);
    console.log(`🎨 Collection: ${contractAddress}`);
    console.log(`🤝 Trading Contract: ${tradingContract}`);
    console.log(`📝 Approved: ${isApproved ? '✅ YES' : '❌ NO'}`);
    
    if (!isApproved) {
      console.log("\n💡 To approve this collection, run:");
      console.log("npx hardhat run scripts/approve-erc1155-collection.js --network monadTestnet");
    }
    
  } catch (error) {
    console.error("❌ Failed to check approval status:", error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--check-only')) {
    await checkApprovalStatus();
  } else {
    await approveERC1155Collection();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 