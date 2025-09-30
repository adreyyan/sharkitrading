const hre = require("hardhat");

async function main() {
  console.log("🔍 Checking V6 Contract Trades...");
  console.log("===================================");
  
  const [signer] = await hre.ethers.getSigners();
  console.log("🔧 Using account:", signer.address);

  // V6 Contract address
  const contractAddress = "0x9e2c22E0D77500ddD9e15d5ff3D27F7643e1dCE3";
  
  try {
    // Get contract instance
    const contract = await hre.ethers.getContractAt("MonadNFTTradingV6", contractAddress);
    
    console.log("📊 Scanning for trades...");
    
    // Check trades from 1 to 50
    const maxTradeId = 50;
    const allTrades = [];
    const expiredTrades = [];
    const currentTime = Math.floor(Date.now() / 1000);
    
    for (let tradeId = 1; tradeId <= maxTradeId; tradeId++) {
      try {
        const trade = await contract.getTrade(tradeId);
        const [id, creator, counterparty, offeredMONAD, requestedMONAD, expiryTime, status, message, createdAt] = trade;
        
        // Skip if trade doesn't exist (creator is zero address)
        if (creator === "0x0000000000000000000000000000000000000000") {
          continue;
        }
        
        const tradeData = {
          id: Number(id),
          creator,
          counterparty,
          offeredMONAD: hre.ethers.formatEther(offeredMONAD),
          requestedMONAD: hre.ethers.formatEther(requestedMONAD),
          expiryTime: Number(expiryTime),
          status: Number(status),
          message,
          createdAt: Number(createdAt)
        };
        
        allTrades.push(tradeData);
        
        const isExpired = currentTime > Number(expiryTime);
        const isPending = status === 0; // 0 = Pending
        
        if (isExpired && isPending) {
          expiredTrades.push(tradeData);
        }
        
      } catch (error) {
        // Trade doesn't exist or error reading, skip
        continue;
      }
    }
    
    console.log(`📋 Found ${allTrades.length} total trades`);
    
    if (allTrades.length > 0) {
      console.log("\n📊 All Trades:");
      allTrades.forEach((trade, index) => {
        const expiryDate = new Date(trade.expiryTime * 1000);
        const createdDate = new Date(trade.createdAt * 1000);
        const isExpired = currentTime > trade.expiryTime;
        const statusText = ["Pending", "Accepted", "Cancelled", "Expired", "Declined"][trade.status] || "Unknown";
        
        console.log(`\n${index + 1}. Trade #${trade.id}`);
        console.log(`   Creator: ${trade.creator}`);
        console.log(`   Status: ${statusText} (${trade.status})`);
        console.log(`   Offered MONAD: ${trade.offeredMONAD}`);
        console.log(`   Requested MONAD: ${trade.requestedMONAD}`);
        console.log(`   Created: ${createdDate.toLocaleString()}`);
        console.log(`   Expires: ${expiryDate.toLocaleString()}`);
        console.log(`   Current: ${new Date().toLocaleString()}`);
        console.log(`   ${isExpired ? '❌ EXPIRED' : '✅ Active'}`);
        
        if (trade.message) {
          console.log(`   Message: "${trade.message}"`);
        }
      });
    }
    
    console.log(`\n🔥 Found ${expiredTrades.length} expired trades that need processing:`);
    
    if (expiredTrades.length > 0) {
      console.log("\n⚠️ Expired Trades:");
      expiredTrades.forEach((trade, index) => {
        const expiryDate = new Date(trade.expiryTime * 1000);
        const hoursExpired = Math.floor((currentTime - trade.expiryTime) / 3600);
        
        console.log(`\n${index + 1}. Trade #${trade.id} - EXPIRED ${hoursExpired}h ago`);
        console.log(`   Creator: ${trade.creator}`);
        console.log(`   Offered MONAD: ${trade.offeredMONAD}`);
        console.log(`   Expired: ${expiryDate.toLocaleString()}`);
        console.log(`   💡 This trade needs to be expired to return assets to creator`);
      });
      
      console.log("\n💡 These trades can be manually cancelled by their creators or declined by responders.");
      console.log("\n🔧 Or manually expire individual trades:");
      expiredTrades.forEach(trade => {
        console.log(`   node scripts/expire-stuck-trade.js ${trade.id}`);
      });
    } else {
      console.log("✨ No expired trades found - all good!");
    }
    
  } catch (error) {
    console.error("❌ Script failed:", error);
  }
}

main().catch(console.error); 