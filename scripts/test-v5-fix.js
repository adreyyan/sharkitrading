const { ethers } = require("hardhat");

async function testV5Fix() {
  console.log("🧪 Testing MonadNFTTradingV5 Fix");
  console.log("================================");
  
  // V5 Contract Address (deployed)
  const CONTRACT_ADDRESS = "0x773C0fc7Ce0489B078A532123dd0D86131E1ACf9";
  
  // Connect to Monad testnet
  const provider = new ethers.JsonRpcProvider("https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d");
  
  // Load ABI from compiled contract
  const contractArtifact = require("../artifacts/contracts/MonadNFTTradingV5.sol/MonadNFTTradingV5.json");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, contractArtifact.abi, provider);
  
  try {
    console.log("📊 Contract Info:");
    console.log("   Address:", CONTRACT_ADDRESS);
    
    // Check contract balance
    const contractBalance = await provider.getBalance(CONTRACT_ADDRESS);
    console.log("   Balance:", ethers.formatEther(contractBalance), "MONAD");
    
    // Get trade fee
    const tradeFee = await contract.TRADE_FEE();
    console.log("   Trade Fee:", ethers.formatEther(tradeFee), "MONAD");
    
    console.log("\n✅ Key Fixes in V5:");
    console.log("1. acceptTrade now requires: msg.value >= trade.requestedMONAD + TRADE_FEE");
    console.log("2. MONAD transfers use msg.value directly, not contract balance");
    console.log("3. Proper fee handling in acceptTrade function");
    
    console.log("\n🔧 Fixed Logic Flow:");
    console.log("When counterparty accepts trade requiring 1.0 MONAD:");
    console.log("1. Counterparty sends msg.value = 1.0 + 0.3 = 1.3 MONAD");
    console.log("2. Contract sends 0.3 MONAD fee to collector");
    console.log("3. Contract sends 1.0 MONAD (from msg.value) to creator");
    console.log("4. Contract sends any offered MONAD to counterparty");
    console.log("5. ✅ No dependency on contract balance!");
    
    console.log("\n📋 To test the fix:");
    console.log("1. Update lib/contracts.ts with new address");
    console.log("2. Create a trade where creator offers 0 MONAD, requests 1 MONAD");
    console.log("3. Try to accept it - should work now!");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testV5Fix().catch(console.error); 