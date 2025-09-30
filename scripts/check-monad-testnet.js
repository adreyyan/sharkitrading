const { ethers } = require("hardhat");

async function main() {
    console.log("🌐 Connecting to Monad Testnet...");
    console.log("==================================");
    
    try {
        // Connect to Monad testnet
        const provider = new ethers.JsonRpcProvider("https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d");
        const contractAddress = "0x773C0fc7Ce0489B078A532123dd0D86131E1ACf9";
        
        console.log("🔗 Connected to:", await provider.getNetwork());
        
        // Check if contract exists
        const code = await provider.getCode(contractAddress);
        console.log("📋 Contract code length:", code.length);
        
        if (code === "0x" || code.length <= 2) {
            console.log("❌ No contract deployed at this address on Monad testnet!");
            return;
        }
        
        console.log("✅ Contract exists on Monad testnet");
        
        // Create contract instance
        const MonadNFTTrading = await ethers.getContractFactory("MonadNFTTradingV5");
        const contract = new ethers.Contract(contractAddress, MonadNFTTrading.interface, provider);
        
        // Check contract balance
        const contractBalance = await provider.getBalance(contractAddress);
        console.log("💰 Contract Balance:", ethers.formatEther(contractBalance), "MONAD");
        
        // Try to get trade ID 1
        console.log("\n📋 Checking trade ID 1 on Monad testnet...");
        
        try {
            const trade = await contract.getTrade(1);
            console.log("✅ Trade 1 found on Monad testnet!");
            console.log("Trade details:", {
                id: trade.id.toString(),
                creator: trade.creator,
                counterparty: trade.counterparty,
                status: trade.status.toString(),
                requestedMONAD: ethers.formatEther(trade.requestedMONAD),
                offeredMONAD: ethers.formatEther(trade.offeredMONAD),
                message: trade.message || "No message",
                createdAt: new Date(Number(trade.createdAt) * 1000).toLocaleString(),
                expiryTime: new Date(Number(trade.expiryTime) * 1000).toLocaleString()
            });
            
            // Check if trade is expired
            const now = Math.floor(Date.now() / 1000);
            const isExpired = now > Number(trade.expiryTime);
            console.log("⏰ Trade expired:", isExpired);
            
            // Check the offered NFTs
            try {
                console.log("\n🎁 Checking offered NFTs...");
                const offeredNFTs = await contract.getTradeOfferedNFTs(1);
                console.log("Offered NFTs count:", offeredNFTs.length);
                offeredNFTs.forEach((nft, idx) => {
                    console.log(`  ${idx + 1}. Contract: ${nft.contractAddress}, Token: ${nft.tokenId}, Amount: ${nft.amount}, Standard: ${nft.standard}`);
                });
            } catch (error) {
                console.log("❌ Error getting offered NFTs:", error.message);
            }
            
            // Check the requested NFTs
            try {
                console.log("\n🎯 Checking requested NFTs...");
                const requestedNFTs = await contract.getTradeRequestedNFTs(1);
                console.log("Requested NFTs count:", requestedNFTs.length);
                requestedNFTs.forEach((nft, idx) => {
                    console.log(`  ${idx + 1}. Contract: ${nft.contractAddress}, Token: ${nft.tokenId}, Amount: ${nft.amount}, Standard: ${nft.standard}`);
                });
            } catch (error) {
                console.log("❌ Error getting requested NFTs:", error.message);
            }
            
            console.log("\n💡 Analysis:");
            console.log("- Trade exists on Monad testnet");
            console.log("- Creator:", trade.creator);
            console.log("- Counterparty:", trade.counterparty);
            console.log("- Status:", trade.status.toString(), "(0=Pending, 1=Accepted, 2=Cancelled, 3=Expired, 4=Declined)");
            console.log("- Required MONAD to accept:", ethers.formatEther(trade.requestedMONAD));
            
            if (trade.status.toString() !== "0") {
                console.log("⚠️  Trade is not in Pending status - that's why acceptTrade is failing!");
            }
            
            if (isExpired) {
                console.log("⚠️  Trade has expired - that's why acceptTrade is failing!");
            }
            
        } catch (error) {
            console.log("❌ Error getting trade 1:", error.message);
            console.log("This suggests trade ID 1 doesn't exist on the testnet");
        }
        
    } catch (error) {
        console.error("❌ Script failed:", error);
    }
}

main().catch(console.error); 