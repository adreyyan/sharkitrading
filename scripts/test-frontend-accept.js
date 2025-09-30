const { ethers } = require("hardhat");

async function testFrontendAccept() {
  console.log("🧪 Testing Frontend Accept Trade Flow");
  console.log("=====================================");
  
  const [signer] = await ethers.getSigners();
  const userAddress = await signer.getAddress();
  console.log("👤 User Address:", userAddress);
  
  // V4 Contract
  const contractAddress = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678";
  
  // Get the contract ABI from artifacts
  const contractArtifact = await hre.artifacts.readArtifact("MonadNFTTradingV4");
  const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);
  
  console.log("🏠 Contract Address:", contractAddress);
  
  // Test with the latest trade ID
  const tradeId = "4"; // From the recent test trade creation
  
  try {
    console.log("\n🔍 Testing trade ID:", tradeId);
    console.log("Trade ID type:", typeof tradeId);
    
    // First check if trade exists
    console.log("\n📋 Getting trade details...");
    const trade = await contract.getTrade(tradeId);
    console.log("✅ Trade exists:", {
      creator: trade[1],
      counterparty: trade[2],
      status: trade[6] // 0=Pending, 1=Accepted, 2=Cancelled, 3=Expired, 4=Declined
    });
    
    // Test BigInt conversion (this is what the frontend does)
    console.log("\n🔢 Testing BigInt conversion...");
    const tradeIdStr = String(tradeId);
    console.log("String conversion:", tradeIdStr);
    
    let tradeIdBigInt;
    try {
      tradeIdBigInt = BigInt(tradeIdStr);
      console.log("✅ BigInt conversion successful:", tradeIdBigInt.toString());
    } catch (error) {
      console.error("❌ BigInt conversion failed:", error.message);
      return;
    }
    
    // Test transaction data encoding
    console.log("\n📝 Testing transaction encoding...");
    try {
      const txData = await contract.acceptTrade.populateTransaction(tradeIdBigInt, {
        value: trade[4] // requestedMONAD
      });
      
      console.log("Transaction data:", {
        to: txData.to,
        data: txData.data,
        value: txData.value?.toString(),
        dataLength: txData.data?.length,
        isEmpty: !txData.data || txData.data === "0x"
      });
      
      if (!txData.data || txData.data === "0x") {
        console.error("❌ PROBLEM FOUND: Transaction data is empty!");
        console.log("This is why the frontend transaction fails.");
        return;
      } else {
        console.log("✅ Transaction data looks good");
      }
      
    } catch (encodeError) {
      console.error("❌ Transaction encoding failed:", encodeError.message);
      return;
    }
    
    // Test gas estimation
    console.log("\n⛽ Testing gas estimation...");
    try {
      const gasEstimate = await contract.acceptTrade.estimateGas(tradeIdBigInt, {
        value: trade[4],
        from: userAddress
      });
      console.log("✅ Gas estimate:", gasEstimate.toString());
    } catch (gasError) {
      console.error("❌ Gas estimation failed:", gasError.message);
      console.log("This might be the root cause of the frontend issue");
      
      // Try to get more specific error
      try {
        await contract.acceptTrade.staticCall(tradeIdBigInt, {
          value: trade[4],
          from: userAddress
        });
      } catch (staticError) {
        console.error("Static call error:", staticError.message);
        
        if (staticError.message.includes("Not trade counterparty")) {
          console.log("💡 Issue: You are not the counterparty for this trade");
          console.log("Expected counterparty:", trade[2]);
          console.log("Your address:", userAddress);
        } else if (staticError.message.includes("Trade not acceptable")) {
          console.log("💡 Issue: Trade is not in acceptable state");
          console.log("Trade status:", trade[6]);
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testFrontendAccept().catch(console.error); 