const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking V5 Contract Status...");
    console.log("==================================");
    
    try {
        const contractAddress = "0x773C0fc7Ce0489B078A532123dd0D86131E1ACf9";
        
        // Check if contract exists
        const provider = ethers.provider;
        const code = await provider.getCode(contractAddress);
        console.log("📋 Contract code length:", code.length);
        
        if (code === "0x") {
            console.log("❌ No contract deployed at this address!");
            return;
        }
        
        // Try to connect to the contract
        const MonadNFTTrading = await ethers.getContractFactory("MonadNFTTradingV5");
        const contract = MonadNFTTrading.attach(contractAddress);
        
        // Check contract balance
        const contractBalance = await provider.getBalance(contractAddress);
        console.log("💰 Contract Balance:", ethers.formatEther(contractBalance), "MONAD");
        
        // Try to get trade count
        try {
            const tradeCount = await contract.tradeCount();
            console.log("📊 Trade Count:", tradeCount.toString());
            
            if (tradeCount > 0n) {
                console.log("\n📋 Checking existing trades:");
                for (let i = 1; i <= Number(tradeCount); i++) {
                    try {
                        const trade = await contract.getTrade(i);
                        console.log(`Trade ${i}:`, {
                            creator: trade.creator,
                            counterparty: trade.counterparty,
                            status: trade.status.toString(),
                            requestedMONAD: ethers.formatEther(trade.requestedMONAD),
                            offeredMONAD: ethers.formatEther(trade.offeredMONAD)
                        });
                    } catch (error) {
                        console.log(`❌ Error getting trade ${i}:`, error.message);
                    }
                }
            } else {
                console.log("📭 No trades found in V5 contract");
                
                // Check if there are trades in the old V4 contract
                console.log("\n🔄 Checking V4 contract for comparison...");
                const v4Address = "0x7e8F18D6a98B9c7A57B6c5A1c0b0A9F3e4D2C8B1";
                const v4Contract = MonadNFTTrading.attach(v4Address);
                
                try {
                    const v4TradeCount = await v4Contract.tradeCount();
                    console.log("📊 V4 Trade Count:", v4TradeCount.toString());
                    
                    if (v4TradeCount > 0n) {
                        console.log("✅ Trades exist in V4 contract");
                        console.log("💡 The frontend might still be pointing to V4 or trades need to be migrated");
                    }
                } catch (error) {
                    console.log("❌ Error checking V4 contract:", error.message);
                }
            }
            
        } catch (error) {
            console.log("❌ Error getting trade count:", error.message);
        }
        
        // Check if contract has the expected functions
        console.log("\n🔧 Checking contract interface:");
        const contractInterface = contract.interface;
        const functions = Object.keys(contractInterface.functions);
        console.log("Available functions:", functions.slice(0, 10)); // Show first 10
        
    } catch (error) {
        console.error("❌ Script failed:", error);
    }
}

main().catch(console.error); 