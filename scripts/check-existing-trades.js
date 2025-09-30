const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking for Existing Trades...");
    console.log("===================================");
    
    try {
        // V4 contract address
        const v4Address = "0x7e8F18D6a98B9c7A57B6c5A1c0b0A9F3e4D2C8B1";
        // V5 contract address
        const v5Address = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        
        const MonadNFTTrading = await ethers.getContractFactory("MonadNFTTradingV4");
        const v4Contract = MonadNFTTrading.attach(v4Address);
        
        console.log("📊 Checking V4 contract trades...");
        
        try {
            const v4TradeCount = await v4Contract.tradeCount();
            console.log("V4 Trade Count:", v4TradeCount.toString());
            
            if (v4TradeCount > 0n) {
                console.log("\n📋 V4 Trades:");
                for (let i = 1; i <= Number(v4TradeCount); i++) {
                    try {
                        const trade = await v4Contract.getTrade(i);
                        console.log(`Trade ${i}:`, {
                            creator: trade.creator,
                            counterparty: trade.counterparty,
                            status: trade.status.toString(),
                            requestedMONAD: ethers.formatEther(trade.requestedMONAD),
                            offeredMONAD: ethers.formatEther(trade.offeredMONAD),
                            createdAt: new Date(Number(trade.createdAt) * 1000).toLocaleString()
                        });
                        
                        // Show NFTs involved
                        console.log(`  Offered NFTs (${trade.offeredNFTs.length}):`);
                        trade.offeredNFTs.forEach((nft, idx) => {
                            console.log(`    ${idx + 1}. ${nft.contractAddress} #${nft.tokenId}`);
                        });
                        
                        console.log(`  Requested NFTs (${trade.requestedNFTs.length}):`);
                        trade.requestedNFTs.forEach((nft, idx) => {
                            console.log(`    ${idx + 1}. ${nft.contractAddress} #${nft.tokenId}`);
                        });
                        
                        console.log("---");
                    } catch (error) {
                        console.log(`❌ Error getting trade ${i}:`, error.message);
                    }
                }
                
                console.log("\n💡 Found existing trades in V4 contract!");
                console.log("🔄 These trades need to be recreated in V5 contract for the frontend to work.");
                console.log("📝 Consider creating a migration script or recreating the active trades.");
                
            } else {
                console.log("📭 No trades found in V4 contract");
            }
            
        } catch (error) {
            console.log("❌ Error checking V4 contract:", error.message);
        }
        
        // Check V5 contract
        console.log("\n📊 Checking V5 contract trades...");
        const MonadNFTTradingV5 = await ethers.getContractFactory("MonadNFTTradingV5");
        const v5Contract = MonadNFTTradingV5.attach(v5Address);
        
        try {
            const v5TradeCount = await v5Contract.tradeCount();
            console.log("V5 Trade Count:", v5TradeCount.toString());
            
            if (v5TradeCount === 0n) {
                console.log("📝 V5 contract has no trades yet");
                console.log("💡 You may need to create a test trade or migrate existing trades");
            }
            
        } catch (error) {
            console.log("❌ Error checking V5 contract:", error.message);
        }
        
    } catch (error) {
        console.error("❌ Script failed:", error);
    }
}

main().catch(console.error); 