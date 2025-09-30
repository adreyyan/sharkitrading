const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging Wallet Client Issue...");
    console.log("====================================");
    
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
        
        console.log("📋 Trade Details:");
        console.log("  Trade ID:", tradeId);
        console.log("  Required MONAD:", ethers.formatEther(requestedMONAD));
        console.log("  Required MONAD (wei):", requestedMONAD.toString());
        
        // Test different ways of calling the function
        const counterpartyAddress = "0x9Ab9C57909A0FBc3E60B158BFFc7113fe7218425";
        
        console.log("\n🧪 Test 1: Direct provider call with correct value");
        try {
            const gasEstimate1 = await provider.estimateGas({
                to: contractAddress,
                data: contract.interface.encodeFunctionData("acceptTrade", [tradeId]),
                value: requestedMONAD,
                from: counterpartyAddress
            });
            console.log("✅ Test 1 passed:", gasEstimate1.toString());
        } catch (error1) {
            console.log("❌ Test 1 failed:", error1.message);
        }
        
        console.log("\n🧪 Test 2: Contract call with correct value");
        try {
            const contractWithProvider = contract.connect(provider);
            const gasEstimate2 = await contractWithProvider.acceptTrade.estimateGas(tradeId, {
                value: requestedMONAD,
                from: counterpartyAddress
            });
            console.log("✅ Test 2 passed:", gasEstimate2.toString());
        } catch (error2) {
            console.log("❌ Test 2 failed:", error2.message);
        }
        
        console.log("\n🧪 Test 3: Check if the issue is with BigInt conversion");
        try {
            // Convert to different formats
            const tradeIdBigInt = BigInt(tradeId);
            const tradeIdNumber = Number(tradeId);
            const tradeIdString = String(tradeId);
            
            console.log("Trade ID formats:", {
                original: tradeId,
                bigint: tradeIdBigInt.toString(),
                number: tradeIdNumber,
                string: tradeIdString
            });
            
            // Test with BigInt
            const gasEstimate3 = await provider.estimateGas({
                to: contractAddress,
                data: contract.interface.encodeFunctionData("acceptTrade", [tradeIdBigInt]),
                value: requestedMONAD,
                from: counterpartyAddress
            });
            console.log("✅ Test 3 (BigInt) passed:", gasEstimate3.toString());
        } catch (error3) {
            console.log("❌ Test 3 (BigInt) failed:", error3.message);
        }
        
        console.log("\n🧪 Test 4: Check transaction data encoding");
        try {
            const txData = contract.interface.encodeFunctionData("acceptTrade", [tradeId]);
            console.log("Transaction data:", txData);
            console.log("Expected data: 0xecb9fec30000000000000000000000000000000000000000000000000000000000000001");
            console.log("Data matches:", txData === "0xecb9fec30000000000000000000000000000000000000000000000000000000000000001");
        } catch (error4) {
            console.log("❌ Test 4 failed:", error4.message);
        }
        
        console.log("\n🧪 Test 5: Check if the issue is with value format");
        try {
            // Test different value formats
            const valueFormats = [
                requestedMONAD,
                requestedMONAD.toString(),
                ethers.parseEther("1"),
                "1000000000000000000"
            ];
            
            for (let i = 0; i < valueFormats.length; i++) {
                try {
                    const gasEstimate5 = await provider.estimateGas({
                        to: contractAddress,
                        data: contract.interface.encodeFunctionData("acceptTrade", [tradeId]),
                        value: valueFormats[i],
                        from: counterpartyAddress
                    });
                    console.log(`✅ Value format ${i + 1} (${typeof valueFormats[i]}) passed:`, gasEstimate5.toString());
                } catch (formatError) {
                    console.log(`❌ Value format ${i + 1} (${typeof valueFormats[i]}) failed:`, formatError.message);
                }
            }
        } catch (error5) {
            console.log("❌ Test 5 failed:", error5.message);
        }
        
        console.log("\n💡 Summary:");
        console.log("If all tests fail with 'Insufficient MONAD sent', the issue is likely:");
        console.log("1. The frontend wallet client is not properly sending the value");
        console.log("2. There's a bug in the RainbowKit/Wagmi integration");
        console.log("3. The Monad testnet has specific requirements for value transactions");
        
    } catch (error) {
        console.error("❌ Script failed:", error);
    }
}

main().catch(console.error); 