const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing acceptTrade on Monad Testnet...");
    console.log("==========================================");
    
    try {
        // Connect to Monad testnet
        const provider = new ethers.JsonRpcProvider("https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d");
        const contractAddress = "0x773C0fc7Ce0489B078A532123dd0D86131E1ACf9";
        
        // Create contract instance
        const MonadNFTTrading = await ethers.getContractFactory("MonadNFTTradingV5");
        const contract = new ethers.Contract(contractAddress, MonadNFTTrading.interface, provider);
        
        // Get trade details
        const trade = await contract.getTrade(1);
        console.log("📋 Trade Details:");
        console.log("  Creator:", trade.creator);
        console.log("  Counterparty:", trade.counterparty);
        console.log("  Status:", trade.status.toString());
        console.log("  Required MONAD:", ethers.formatEther(trade.requestedMONAD));
        
        // The counterparty from the screenshot
        const counterpartyAddress = "0x9Ab9C57909A0FBc3E60B158BFFc7113fe7218425";
        console.log("\n👤 Counterparty from screenshot:", counterpartyAddress);
        console.log("👤 Trade counterparty:", trade.counterparty);
        console.log("✅ Addresses match:", counterpartyAddress.toLowerCase() === trade.counterparty.toLowerCase());
        
        // Check counterparty balance on testnet
        const counterpartyBalance = await provider.getBalance(counterpartyAddress);
        console.log("💰 Counterparty balance:", ethers.formatEther(counterpartyBalance), "MONAD");
        
        const requiredMONAD = trade.requestedMONAD;
        console.log("💸 Required MONAD to send:", ethers.formatEther(requiredMONAD));
        
        if (counterpartyBalance < requiredMONAD) {
            console.log("❌ ISSUE FOUND: Counterparty doesn't have enough MONAD!");
            console.log("   Needed:", ethers.formatEther(requiredMONAD), "MONAD");
            console.log("   Has:", ethers.formatEther(counterpartyBalance), "MONAD");
            console.log("   Shortfall:", ethers.formatEther(requiredMONAD - counterpartyBalance), "MONAD");
            return;
        }
        
        // Try to estimate gas for the exact call that's failing
        console.log("\n🔧 Testing gas estimation for acceptTrade(1)...");
        console.log("   Call data: 0xecb9fec30000000000000000000000000000000000000000000000000000000000000001");
        
        try {
            // Simulate the call without a signer (read-only)
            const gasEstimate = await provider.estimateGas({
                to: contractAddress,
                data: "0xecb9fec30000000000000000000000000000000000000000000000000000000000000001",
                value: requiredMONAD,
                from: counterpartyAddress
            });
            
            console.log("✅ Gas estimation successful:", gasEstimate.toString());
            console.log("🎉 The acceptTrade call should work!");
            
        } catch (error) {
            console.log("❌ Gas estimation failed:");
            console.log("Error message:", error.message);
            
            if (error.data) {
                console.log("Error data:", error.data);
            }
            
            if (error.reason) {
                console.log("Revert reason:", error.reason);
            }
            
            // Check for common issues
            if (error.message.includes("insufficient funds")) {
                console.log("💡 Issue: User doesn't have enough MONAD for the transaction + gas fees");
            } else if (error.message.includes("execution reverted")) {
                console.log("💡 Issue: Contract execution reverted - check contract logic");
            } else if (error.message.includes("missing revert data")) {
                console.log("💡 Issue: Contract call failed without specific reason - could be:");
                console.log("   - NFT approval issues");
                console.log("   - Contract state issues");
                console.log("   - Network connectivity issues");
            }
        }
        
        // Also check if there are any NFTs that need to be transferred
        console.log("\n🎁 Checking if NFTs need approval...");
        console.log("   Note: If this trade involves NFTs, the counterparty needs to approve them first");
        
    } catch (error) {
        console.error("❌ Script failed:", error);
    }
}

main().catch(console.error); 