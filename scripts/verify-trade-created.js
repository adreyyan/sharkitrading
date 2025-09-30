const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Verifying Trade Creation in V5 Contract...");
    console.log("==============================================");
    
    try {
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const MonadNFTTrading = await ethers.getContractFactory("MonadNFTTradingV5");
        const contract = MonadNFTTrading.attach(contractAddress);
        
        // Try to get trade ID 1
        console.log("📋 Checking trade ID 1...");
        
        try {
            const trade = await contract.getTrade(1);
            console.log("✅ Trade found!");
            console.log("Trade details:", {
                id: trade.id.toString(),
                creator: trade.creator,
                counterparty: trade.counterparty,
                status: trade.status.toString(),
                requestedMONAD: ethers.formatEther(trade.requestedMONAD),
                offeredMONAD: ethers.formatEther(trade.offeredMONAD),
                message: trade.message,
                createdAt: new Date(Number(trade.createdAt) * 1000).toLocaleString(),
                // expiryTime: new Date(Number(trade.expiryTime) * 1000).toLocaleString()
            });
            
            // Check offered NFTs
            console.log("\n🎁 Checking offered NFTs...");
            try {
                const offeredNFTs = await contract.getTradeOfferedNFTs(1);
                console.log("Offered NFTs:", offeredNFTs.length);
                offeredNFTs.forEach((nft, idx) => {
                    console.log(`  ${idx + 1}. Contract: ${nft.contractAddress}, Token: ${nft.tokenId}, Amount: ${nft.amount}, Standard: ${nft.standard}`);
                });
            } catch (error) {
                console.log("❌ Error getting offered NFTs:", error.message);
            }
            
            // Check requested NFTs
            console.log("\n🎯 Checking requested NFTs...");
            try {
                const requestedNFTs = await contract.getTradeRequestedNFTs(1);
                console.log("Requested NFTs:", requestedNFTs.length);
                requestedNFTs.forEach((nft, idx) => {
                    console.log(`  ${idx + 1}. Contract: ${nft.contractAddress}, Token: ${nft.tokenId}, Amount: ${nft.amount}, Standard: ${nft.standard}`);
                });
            } catch (error) {
                console.log("❌ Error getting requested NFTs:", error.message);
            }
            
            console.log("\n🎉 Trade verification complete!");
            console.log("💡 The frontend should now be able to display this trade at /trade/1");
            
        } catch (error) {
            console.log("❌ Error getting trade:", error.message);
            console.log("This might mean the trade doesn't exist or there's a contract issue");
        }
        
    } catch (error) {
        console.error("❌ Script failed:", error);
    }
}

main().catch(console.error); 