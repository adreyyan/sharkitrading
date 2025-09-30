const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Frontend Value Extraction...");
    console.log("=======================================");
    
    try {
        // Connect to Monad testnet
        const provider = new ethers.JsonRpcProvider("https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d");
        const contractAddress = "0x773C0fc7Ce0489B078A532123dd0D86131E1ACf9";
        
        // Create contract instance
        const MonadNFTTrading = await ethers.getContractFactory("MonadNFTTradingV5");
        const contract = new ethers.Contract(contractAddress, MonadNFTTrading.interface, provider);
        
        console.log("📋 Testing getTrade function...");
        
        const tradeId = 1;
        const tradeResult = await contract.getTrade(tradeId);
        
        console.log("Full getTrade result:", {
            id: tradeResult[0].toString(),
            creator: tradeResult[1],
            counterparty: tradeResult[2],
            offeredMONAD: ethers.formatEther(tradeResult[3]),
            requestedMONAD: ethers.formatEther(tradeResult[4]),
            expiryTime: tradeResult[5].toString(),
            status: tradeResult[6].toString(),
            message: tradeResult[7],
            createdAt: tradeResult[8].toString()
        });
        
        // Test the exact destructuring that the frontend does
        console.log("\n🔍 Testing frontend destructuring...");
        const [, , , , requestedMONAD] = await contract.getTrade(tradeId);
        console.log("Extracted requestedMONAD:", ethers.formatEther(requestedMONAD));
        console.log("requestedMONAD type:", typeof requestedMONAD);
        console.log("requestedMONAD value:", requestedMONAD.toString());
        
        // Test if the value is correct
        if (requestedMONAD.toString() === "1000000000000000000") { // 1 MONAD in wei
            console.log("✅ Correct MONAD amount extracted");
        } else {
            console.log("❌ Wrong MONAD amount extracted");
        }
        
        // Test transaction preparation like the frontend does
        console.log("\n📝 Testing transaction preparation...");
        const counterpartyAddress = "0x9Ab9C57909A0FBc3E60B158BFFc7113fe7218425";
        
        try {
            // Test gas estimation with the exact parameters
            const gasEstimate = await provider.estimateGas({
                to: contractAddress,
                data: contract.interface.encodeFunctionData("acceptTrade", [tradeId]),
                value: requestedMONAD,
                from: counterpartyAddress
            });
            
            console.log("✅ Gas estimation successful:", gasEstimate.toString());
            console.log("🎉 The frontend should work with these parameters!");
            
        } catch (error) {
            console.log("❌ Gas estimation failed:", error.message);
            
            // Check if it's the "Insufficient MONAD sent" error
            if (error.message.includes("Insufficient MONAD sent")) {
                console.log("💡 Issue: The frontend is not sending the MONAD value correctly");
                console.log("Expected value:", ethers.formatEther(requestedMONAD), "MONAD");
                console.log("Check if the frontend transaction includes { value: requestedMONAD }");
            }
        }
        
        // Also test with zero value to confirm the error
        console.log("\n🧪 Testing with zero value (should fail)...");
        try {
            await provider.estimateGas({
                to: contractAddress,
                data: contract.interface.encodeFunctionData("acceptTrade", [tradeId]),
                value: 0, // Zero value - should fail
                from: counterpartyAddress
            });
            console.log("❌ Unexpected: Zero value succeeded");
        } catch (zeroError) {
            if (zeroError.message.includes("Insufficient MONAD sent")) {
                console.log("✅ Confirmed: Zero value fails with 'Insufficient MONAD sent'");
                console.log("💡 This means the frontend is likely sending zero value instead of the required amount");
            }
        }
        
    } catch (error) {
        console.error("❌ Script failed:", error);
    }
}

main().catch(console.error); 