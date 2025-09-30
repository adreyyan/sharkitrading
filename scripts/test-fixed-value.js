const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Fixed Value (RequestedMONAD + Trade Fee)...");
    console.log("====================================================");
    
    try {
        // Connect to Monad testnet
        const provider = new ethers.JsonRpcProvider("https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d");
        const contractAddress = "0x773C0fc7Ce0489B078A532123dd0D86131E1ACf9";
        
        // Create contract instance
        const MonadNFTTrading = await ethers.getContractFactory("MonadNFTTradingV5");
        const contract = new ethers.Contract(contractAddress, MonadNFTTrading.interface, provider);
        
        // Get trade details
        const tradeId = 1;
        const [, , , , requestedMONAD] = await contract.getTrade(tradeId);
        
        // Calculate total required (requestedMONAD + trade fee)
        const tradeFee = ethers.parseEther("0.3"); // 0.3 MONAD trade fee
        const totalRequired = requestedMONAD + tradeFee;
        
        console.log("📋 Value Calculation:");
        console.log("  Requested MONAD:", ethers.formatEther(requestedMONAD));
        console.log("  Trade Fee:", ethers.formatEther(tradeFee));
        console.log("  Total Required:", ethers.formatEther(totalRequired));
        console.log("  Total Required (wei):", totalRequired.toString());
        
        // Test with the correct total value
        const counterpartyAddress = "0x9Ab9C57909A0FBc3E60B158BFFc7113fe7218425";
        
        console.log("\n🧪 Testing with correct total value...");
        try {
            const gasEstimate = await provider.estimateGas({
                to: contractAddress,
                data: contract.interface.encodeFunctionData("acceptTrade", [tradeId]),
                value: totalRequired,
                from: counterpartyAddress
            });
            
            console.log("✅ Gas estimation successful:", gasEstimate.toString());
            console.log("🎉 The acceptTrade function should now work!");
            
            // Check if the counterparty has enough balance
            const counterpartyBalance = await provider.getBalance(counterpartyAddress);
            console.log("\n💰 Balance Check:");
            console.log("  Counterparty balance:", ethers.formatEther(counterpartyBalance), "MONAD");
            console.log("  Required amount:", ethers.formatEther(totalRequired), "MONAD");
            console.log("  Has enough balance:", counterpartyBalance >= totalRequired);
            
            if (counterpartyBalance < totalRequired) {
                console.log("⚠️  Warning: Counterparty doesn't have enough MONAD for the transaction + gas fees");
                console.log("   Shortfall:", ethers.formatEther(totalRequired - counterpartyBalance), "MONAD");
            }
            
        } catch (error) {
            console.log("❌ Gas estimation still failed:", error.message);
            
            // Check if it's still the insufficient MONAD error
            if (error.message.includes("Insufficient MONAD sent")) {
                console.log("💡 Still getting 'Insufficient MONAD sent' - there might be another issue");
            }
        }
        
        // Also test the exact frontend logic
        console.log("\n🔍 Testing exact frontend logic...");
        try {
            // Simulate the frontend acceptTrade function
            console.log("Simulating frontend acceptTrade call...");
            console.log("Parameters:", {
                tradeId: tradeId,
                requestedMONAD: ethers.formatEther(requestedMONAD),
                tradeFee: ethers.formatEther(tradeFee),
                totalRequired: ethers.formatEther(totalRequired)
            });
            
            const frontendGasEstimate = await contract.acceptTrade.estimateGas(tradeId, {
                value: totalRequired,
                from: counterpartyAddress
            });
            
            console.log("✅ Frontend simulation successful:", frontendGasEstimate.toString());
            console.log("🎉 The frontend fix should work!");
            
        } catch (frontendError) {
            console.log("❌ Frontend simulation failed:", frontendError.message);
        }
        
    } catch (error) {
        console.error("❌ Script failed:", error);
    }
}

main().catch(console.error); 