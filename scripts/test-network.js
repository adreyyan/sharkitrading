const hre = require("hardhat");

async function main() {
  console.log("🔧 Testing Monad Testnet Connection");
  console.log("===================================");
  
  try {
    // Test network connection
    console.log("📡 Testing network connection...");
    const provider = hre.ethers.provider;
    const network = await provider.getNetwork();
    console.log("✅ Connected to network:", network.name, "Chain ID:", network.chainId);
    
    // Test signers
    console.log("\n👤 Testing signers...");
    const signers = await hre.ethers.getSigners();
    console.log("📊 Number of signers:", signers.length);
    
    if (signers.length > 0) {
      const signer = signers[0];
      console.log("🔑 First signer address:", signer.address);
      
      // Test balance
      const balance = await provider.getBalance(signer.address);
      console.log("💰 Balance:", hre.ethers.formatEther(balance), "MONAD");
      
      if (balance > 0) {
        console.log("✅ Account has funds for deployment");
      } else {
        console.log("❌ Account has no funds - deployment will fail");
      }
    } else {
      console.log("❌ No signers available - check PRIVATE_KEY in .env.local");
    }
    
    // Test latest block
    console.log("\n🔗 Testing blockchain access...");
    const blockNumber = await provider.getBlockNumber();
    console.log("📦 Latest block:", blockNumber);
    
    console.log("\n🎉 Network test completed successfully!");
    
  } catch (error) {
    console.error("❌ Network test failed:", error.message);
    
    if (error.message.includes("could not detect network")) {
      console.log("💡 Solution: Check your internet connection and RPC URL");
    } else if (error.message.includes("invalid private key")) {
      console.log("💡 Solution: Check PRIVATE_KEY format in .env.local");
    } else if (error.message.includes("insufficient funds")) {
      console.log("💡 Solution: Add MONAD to your account");
    }
  }
}

main().catch(console.error); 