const { ethers } = require("hardhat");

async function debugV4Accept() {
  console.log("🔍 Debugging V4 Accept Trade...");
  
  const [signer] = await ethers.getSigners();
  const userAddress = await signer.getAddress();
  console.log("User address:", userAddress);
  
  // V4 Contract
  const contractAddress = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678";
  
  // Get the contract ABI from artifacts
  const contractArtifact = await hre.artifacts.readArtifact("MonadNFTTradingV4");
  const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);
  
  console.log("Contract address:", contractAddress);
  console.log("Contract connected:", !!contract);
  
  // Test trade ID (replace with actual trade ID)
  const tradeId = "7"; // Replace with your actual trade ID
  
  try {
    console.log("\n📋 Getting trade details...");
    const trade = await contract.getTrade(tradeId);
    console.log("Trade details:", {
      id: trade[0].toString(),
      creator: trade[1],
      counterparty: trade[2],
      offeredMONAD: ethers.formatEther(trade[3]),
      requestedMONAD: ethers.formatEther(trade[4]),
      expiryTime: trade[5].toString(),
      status: trade[6], // 0=Pending, 1=Accepted, 2=Cancelled, 3=Expired, 4=Declined
      message: trade[7],
      createdAt: trade[8].toString()
    });
    
    // Check if user is counterparty
    console.log("\n🔍 Checking user permissions...");
    console.log("User is counterparty:", trade[2].toLowerCase() === userAddress.toLowerCase());
    
    // Check balance
    const userBalance = await signer.provider.getBalance(userAddress);
    const requiredMONAD = trade[4];
    console.log("User balance:", ethers.formatEther(userBalance));
    console.log("Required MONAD:", ethers.formatEther(requiredMONAD));
    console.log("Sufficient balance:", userBalance >= requiredMONAD);
    
    // Try to estimate gas
    console.log("\n⛽ Estimating gas...");
    try {
      const gasEstimate = await contract.acceptTrade.estimateGas(tradeId, { 
        value: requiredMONAD,
        from: userAddress
      });
      console.log("Gas estimate:", gasEstimate.toString());
      
      // Try to get transaction data
      console.log("\n📝 Getting transaction data...");
      const txData = await contract.acceptTrade.populateTransaction(tradeId, {
        value: requiredMONAD
      });
      console.log("Transaction data:", {
        to: txData.to,
        data: txData.data,
        value: txData.value?.toString(),
        dataLength: txData.data?.length
      });
      
      if (!txData.data || txData.data === "0x") {
        console.error("❌ Transaction data is empty!");
        return;
      }
      
      // Try to send the transaction
      console.log("\n🚀 Sending transaction...");
      const tx = await contract.acceptTrade(tradeId, {
        value: requiredMONAD,
        gasLimit: gasEstimate + (gasEstimate / 10n) // Add 10% buffer
      });
      
      console.log("Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
      
    } catch (gasError) {
      console.error("❌ Gas estimation failed:", gasError.message);
      
      // Try to get the revert reason
      try {
        await contract.acceptTrade.staticCall(tradeId, { 
          value: requiredMONAD,
          from: userAddress
        });
      } catch (staticError) {
        console.error("Static call error:", staticError.message);
        
        // Check common issues
        if (staticError.message.includes("Not trade counterparty")) {
          console.error("❌ You are not the counterparty for this trade");
        } else if (staticError.message.includes("Trade not acceptable")) {
          console.error("❌ Trade is not in acceptable state");
        } else if (staticError.message.includes("insufficient funds")) {
          console.error("❌ Insufficient MONAD balance");
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

debugV4Accept().catch(console.error); 