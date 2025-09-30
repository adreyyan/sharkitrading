const { ethers } = require("hardhat");

async function testUserAccept() {
  console.log("🧪 Testing User Accept Trade");
  console.log("=============================");
  
  // This should be the user's private key (the counterparty)
  const userPrivateKey = process.env.USER_PRIVATE_KEY;
  if (!userPrivateKey) {
    console.log("❌ No USER_PRIVATE_KEY found in environment variables.");
    console.log("💡 Please set USER_PRIVATE_KEY to the private key of address:");
    console.log("   0x9Ab9C57909A0FBc3E60B158BFFc7113fe7218425");
    console.log("\nExample:");
    console.log('   $env:USER_PRIVATE_KEY="0x..."; node scripts/test-user-accept.js');
    return;
  }
  
  // Create provider and signer for the user
  const provider = new ethers.JsonRpcProvider("https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d");
  const userSigner = new ethers.Wallet(userPrivateKey, provider);
  const userAddress = await userSigner.getAddress();
  
  console.log("👤 User Address:", userAddress);
  
  // V4 Contract
  const contractAddress = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678";
  
  // Get the contract ABI from artifacts
  const contractArtifact = await hre.artifacts.readArtifact("MonadNFTTradingV4");
  const contract = new ethers.Contract(contractAddress, contractArtifact.abi, userSigner);
  
  console.log("🏠 Contract Address:", contractAddress);
  
  // Test with the trade we just created
  const tradeId = "8";
  
  try {
    console.log("\n🔍 Testing trade ID:", tradeId);
    
    // First check if trade exists and user is counterparty
    console.log("\n📋 Getting trade details...");
    const trade = await contract.getTrade(tradeId);
    console.log("✅ Trade exists:", {
      creator: trade[1],
      counterparty: trade[2],
      offeredMONAD: ethers.formatEther(trade[3]),
      requestedMONAD: ethers.formatEther(trade[4]),
      status: trade[6] // 0=Pending, 1=Accepted, 2=Cancelled, 3=Expired, 4=Declined
    });
    
    // Check if user is the counterparty
    const isCounterparty = trade[2].toLowerCase() === userAddress.toLowerCase();
    console.log("🎯 User is counterparty:", isCounterparty);
    
    if (!isCounterparty) {
      console.log("❌ User is not the counterparty for this trade");
      console.log("Expected:", trade[2]);
      console.log("Got:", userAddress);
      return;
    }
    
    // Check user's balance
    const userBalance = await provider.getBalance(userAddress);
    const requiredMONAD = trade[4];
    console.log("\n💰 Balance check:");
    console.log("User balance:", ethers.formatEther(userBalance), "MONAD");
    console.log("Required MONAD:", ethers.formatEther(requiredMONAD), "MONAD");
    console.log("Sufficient balance:", userBalance >= requiredMONAD);
    
    if (userBalance < requiredMONAD) {
      console.log("❌ Insufficient balance to accept trade");
      return;
    }
    
    // Test BigInt conversion (this is what the frontend does)
    console.log("\n🔢 Testing BigInt conversion...");
    const tradeIdStr = String(tradeId);
    const tradeIdBigInt = BigInt(tradeIdStr);
    console.log("✅ BigInt conversion successful:", tradeIdBigInt.toString());
    
    // Test transaction data encoding
    console.log("\n📝 Testing transaction encoding...");
    const txData = await contract.acceptTrade.populateTransaction(tradeIdBigInt, {
      value: requiredMONAD
    });
    
    console.log("Transaction data:", {
      to: txData.to,
      data: txData.data,
      value: txData.value?.toString(),
      dataLength: txData.data?.length,
      isEmpty: !txData.data || txData.data === "0x"
    });
    
    if (!txData.data || txData.data === "0x") {
      console.error("❌ PROBLEM: Transaction data is empty!");
      return;
    } else {
      console.log("✅ Transaction data looks good");
    }
    
    // Test gas estimation
    console.log("\n⛽ Testing gas estimation...");
    try {
      const gasEstimate = await contract.acceptTrade.estimateGas(tradeIdBigInt, {
        value: requiredMONAD
      });
      console.log("✅ Gas estimate:", gasEstimate.toString());
      
      // If we get here, the transaction should work
      console.log("\n🚀 Ready to send transaction!");
      console.log("💡 The frontend should work with these parameters:");
      console.log("   - Trade ID:", tradeIdStr);
      console.log("   - Value:", ethers.formatEther(requiredMONAD), "MONAD");
      console.log("   - Gas limit:", gasEstimate.toString());
      
    } catch (gasError) {
      console.error("❌ Gas estimation failed:", gasError.message);
      return;
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testUserAccept().catch(console.error); 