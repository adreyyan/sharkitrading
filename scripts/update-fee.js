const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Updating trade fee to 0.001 ETH...");
  
  // Contract address from deployment
  const contractAddress = "0x695a59b769FcFD3Af710891fc24282772DCd6302";
  
  // Get the deployer account (admin)
  const [deployer] = await ethers.getSigners();
  console.log("Updating with admin account:", deployer.address);
  
  // Connect to the deployed contract
  const MonadNFTTradingFHE = await ethers.getContractFactory("MonadNFTTradingFHE");
  const contract = MonadNFTTradingFHE.attach(contractAddress);
  
  // Check current fee
  const currentFee = await contract.getTradeFee();
  console.log("Current trade fee:", ethers.formatEther(currentFee), "ETH");
  
  // Update to 0.001 ETH
  const newFee = ethers.parseEther("0.001");
  console.log("Setting new fee to:", ethers.formatEther(newFee), "ETH");
  
  const tx = await contract.setTradeFee(newFee, {
    gasLimit: 100000,
    gasPrice: ethers.parseUnits("20", "gwei")
  });
  console.log("Transaction hash:", tx.hash);
  
  // Wait for transaction to be mined
  await tx.wait();
  
  // Verify the update
  const updatedFee = await contract.getTradeFee();
  console.log("✅ Fee updated successfully!");
  console.log("New trade fee:", ethers.formatEther(updatedFee), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Fee update failed:", error);
    process.exit(1);
  });
