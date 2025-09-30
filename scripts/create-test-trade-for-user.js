const { ethers } = require("hardhat");

async function createTestTradeForUser() {
  console.log("🧪 Creating Test Trade for User to Accept");
  console.log("==========================================");
  
  const [signer] = await ethers.getSigners();
  const creatorAddress = await signer.getAddress();
  console.log("👤 Creator Address:", creatorAddress);
  
  // User from the error message who should be able to accept
  const counterpartyAddress = "0x9Ab9C57909A0FBc3E60B158BFFc7113fe7218425";
  console.log("🎯 Counterparty Address:", counterpartyAddress);
  
  // V4 Contract
  const contractAddress = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678";
  
  // Get the contract ABI from artifacts
  const contractArtifact = await hre.artifacts.readArtifact("MonadNFTTradingV4");
  const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);
  
  console.log("🏠 Contract Address:", contractAddress);

  try {
    console.log("\n📝 Creating test trade...");
    console.log("   Creator (you):", creatorAddress);
    console.log("   Counterparty (user):", counterpartyAddress);
    console.log("   Offered MONAD: 0.5");
    console.log("   Requested MONAD: 0.3");
    console.log("   Total value to send: 0.8 (0.5 + 0.3 fee)");

    const tx = await contract.createTrade(
      counterpartyAddress,     // counterparty
      [],                      // offeredNFTs (empty array)
      [],                      // requestedNFTs (empty array)
      ethers.parseEther("0.5"), // offeredMONAD
      ethers.parseEther("0.3"), // requestedMONAD
      "Test trade for user to accept", // message
      {
        value: ethers.parseEther("0.8") // offeredMONAD + TRADE_FEE
      }
    );

    console.log("✅ Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    
    // Parse the TradeCreated event to get the trade ID
    const tradeCreatedEvent = receipt.logs.find(log => {
      try {
        const decoded = contract.interface.parseLog(log);
        return decoded.name === 'TradeCreated';
      } catch {
        return false;
      }
    });
    
    if (tradeCreatedEvent) {
      const decoded = contract.interface.parseLog(tradeCreatedEvent);
      const tradeId = decoded.args[0].toString();
      
      console.log("\n🎉 Trade created successfully!");
      console.log("🆔 Trade ID:", tradeId);
      console.log("🔗 Transaction:", tx.hash);
      
      console.log("\n💡 Now the user can accept this trade:");
      console.log("   1. User connects wallet:", counterpartyAddress);
      console.log("   2. User navigates to the trade");
      console.log("   3. User clicks 'Accept Trade'");
      console.log("   4. User needs 0.3 MONAD to complete the trade");
      
    } else {
      console.log("⚠️ Could not find TradeCreated event in transaction logs");
    }
    
  } catch (error) {
    console.error("❌ Error creating trade:", error.message);
  }
}

createTestTradeForUser().catch(console.error); 