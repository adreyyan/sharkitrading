const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Verifying Correct V5 Contract...");
    console.log("===================================");
    
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
        
        console.log("✅ Contract exists at this address");
        
        // Try to connect to the contract
        const MonadNFTTrading = await ethers.getContractFactory("MonadNFTTradingV5");
        const contract = MonadNFTTrading.attach(contractAddress);
        
        // Check contract balance
        const contractBalance = await provider.getBalance(contractAddress);
        console.log("💰 Contract Balance:", ethers.formatEther(contractBalance), "MONAD");
        
        // Try to get trade ID 1
        console.log("\n📋 Checking trade ID 1...");
        
        try {
            const trade = await contract.getTrade(1);
            console.log("✅ Trade 1 found!");
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
            
            // Now test the acceptTrade function with the counterparty
            console.log("\n🧪 Testing acceptTrade gas estimation...");
            const [deployer, user1, user2] = await ethers.getSigners();
            
            let counterpartySigner;
            if (trade.counterparty.toLowerCase() === user1.address.toLowerCase()) {
                counterpartySigner = user1;
                console.log("✅ Using user1 as counterparty");
            } else if (trade.counterparty.toLowerCase() === user2.address.toLowerCase()) {
                counterpartySigner = user2;
                console.log("✅ Using user2 as counterparty");
            } else {
                console.log("❌ Counterparty not found in available signers");
                console.log("Trade counterparty:", trade.counterparty);
                console.log("Available signers:", [deployer.address, user1.address, user2.address]);
                return;
            }
            
            // Check counterparty balance
            const counterpartyBalance = await provider.getBalance(counterpartySigner.address);
            console.log("💰 Counterparty Balance:", ethers.formatEther(counterpartyBalance), "MONAD");
            
            const requiredMONAD = trade.requestedMONAD;
            console.log("💸 Required MONAD to send:", ethers.formatEther(requiredMONAD));
            
            if (requiredMONAD > 0n && counterpartyBalance < requiredMONAD) {
                console.log("❌ Counterparty doesn't have enough MONAD");
                return;
            }
            
            // Test gas estimation
            const contractWithSigner = contract.connect(counterpartySigner);
            
            try {
                const gasEstimate = await contractWithSigner.acceptTrade.estimateGas(1, {
                    value: requiredMONAD
                });
                console.log("✅ Gas estimation successful:", gasEstimate.toString());
                console.log("🎉 acceptTrade should work!");
                
            } catch (error) {
                console.log("❌ Gas estimation failed:");
                console.log("Error message:", error.message);
                
                if (error.data) {
                    console.log("Error data:", error.data);
                }
                
                // Try to decode the error
                try {
                    const iface = contract.interface;
                    const decodedError = iface.parseError(error.data);
                    console.log("Decoded error:", decodedError);
                } catch (decodeError) {
                    console.log("Could not decode error data");
                }
            }
            
        } catch (error) {
            console.log("❌ Error getting trade 1:", error.message);
        }
        
    } catch (error) {
        console.error("❌ Script failed:", error);
    }
}

main().catch(console.error); 