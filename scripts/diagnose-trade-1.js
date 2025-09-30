const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Diagnosing Trade ID 1 Acceptance...");
    console.log("=====================================");
    
    try {
        // Connect to the V5 contract
        const contractAddress = "0x773C0fc7Ce0489B078A532123dd0D86131E1ACf9";
        const MonadNFTTrading = await ethers.getContractFactory("MonadNFTTradingV5");
        const contract = MonadNFTTrading.attach(contractAddress);
        
        const tradeId = 1;
        
        // Get trade details
        console.log("📋 Trade Details:");
        const trade = await contract.getTrade(tradeId);
        console.log("Trade:", {
            creator: trade.creator,
            counterparty: trade.counterparty,
            status: trade.status.toString(),
            requestedMONAD: ethers.formatEther(trade.requestedMONAD),
            offeredMONAD: ethers.formatEther(trade.offeredMONAD),
            createdAt: new Date(Number(trade.createdAt) * 1000).toLocaleString(),
            expiresAt: new Date(Number(trade.expiresAt) * 1000).toLocaleString()
        });
        
        // Check contract balance
        const provider = ethers.provider;
        const contractBalance = await provider.getBalance(contractAddress);
        console.log("\n💰 Contract Balance:", ethers.formatEther(contractBalance), "MONAD");
        
        // Get signers
        const [deployer, user1, user2] = await ethers.getSigners();
        console.log("\n👥 Available Signers:");
        console.log("Deployer:", deployer.address);
        console.log("User1:", user1.address);
        console.log("User2:", user2.address);
        
        // Check which signer should accept the trade
        const counterpartyAddress = trade.counterparty;
        console.log("\n🎯 Trade Counterparty:", counterpartyAddress);
        
        let signer;
        if (counterpartyAddress.toLowerCase() === user1.address.toLowerCase()) {
            signer = user1;
            console.log("✅ Using User1 as counterparty");
        } else if (counterpartyAddress.toLowerCase() === user2.address.toLowerCase()) {
            signer = user2;
            console.log("✅ Using User2 as counterparty");
        } else {
            console.log("❌ Counterparty not found in available signers");
            console.log("Available addresses:", [deployer.address, user1.address, user2.address]);
            return;
        }
        
        // Check counterparty balance
        const counterpartyBalance = await provider.getBalance(signer.address);
        console.log("💰 Counterparty Balance:", ethers.formatEther(counterpartyBalance), "MONAD");
        
        // Check if counterparty needs to send MONAD
        const requiredMONAD = trade.requestedMONAD;
        console.log("💸 Required MONAD to send:", ethers.formatEther(requiredMONAD));
        
        if (requiredMONAD > 0n && counterpartyBalance < requiredMONAD) {
            console.log("❌ Counterparty doesn't have enough MONAD");
            return;
        }
        
        // Try to estimate gas for acceptTrade
        console.log("\n🔧 Testing acceptTrade gas estimation...");
        const contractWithSigner = contract.connect(signer);
        
        try {
            const gasEstimate = await contractWithSigner.acceptTrade.estimateGas(tradeId, {
                value: requiredMONAD
            });
            console.log("✅ Gas estimate successful:", gasEstimate.toString());
            
            // Try to simulate the call
            console.log("\n🔄 Simulating acceptTrade call...");
            const result = await contractWithSigner.acceptTrade.staticCall(tradeId, {
                value: requiredMONAD
            });
            console.log("✅ Static call successful");
            
        } catch (error) {
            console.log("❌ Gas estimation failed:");
            console.log("Error:", error.message);
            
            // Try to get more details
            if (error.data) {
                console.log("Error data:", error.data);
            }
            
            // Check if it's a revert with reason
            if (error.reason) {
                console.log("Revert reason:", error.reason);
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
        console.error("❌ Script failed:", error);
    }
}

main().catch(console.error); 