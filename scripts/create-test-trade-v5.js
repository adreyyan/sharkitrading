const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Creating Test Trade in V5 Contract...");
    console.log("=========================================");
    
    try {
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const MonadNFTTrading = await ethers.getContractFactory("MonadNFTTradingV5");
        const contract = MonadNFTTrading.attach(contractAddress);
        
        // Get signers
        const [deployer, user1, user2] = await ethers.getSigners();
        console.log("👥 Using signers:");
        console.log("Creator (deployer):", deployer.address);
        console.log("Counterparty (user1):", user1.address);
        
        // Create a test trade that matches the frontend screenshot
        // Offering: NFT from creator
        // Requesting: 1 MONAD from counterparty
        
        const offeredNFTs = [{
            contractAddress: "0x1234567890123456789012345678901234567890", // Mock NFT contract
            tokenId: 0, // Token ID #0 (matches the "Try" NFT in screenshot)
            amount: 1, // Amount for ERC1155, 1 for ERC721
            standard: 0 // TokenStandard.ERC721
        }];
        
        const requestedNFTs = []; // No NFTs requested
        
        const offeredMONAD = ethers.parseEther("0"); // No MONAD offered
        const requestedMONAD = ethers.parseEther("1"); // 1 MONAD requested
        
        const counterparty = user1.address; // Specific counterparty
        const message = "Test trade - NFT for 1 MONAD";
        
        console.log("📝 Creating trade with:");
        console.log("  Offered NFTs:", offeredNFTs.length);
        console.log("  Requested NFTs:", requestedNFTs.length);
        console.log("  Offered MONAD:", ethers.formatEther(offeredMONAD));
        console.log("  Requested MONAD:", ethers.formatEther(requestedMONAD));
        console.log("  Counterparty:", counterparty);
        
        // Create the trade (V5 signature: counterparty, offeredNFTs, requestedNFTs, offeredMONAD, requestedMONAD, message)
        const tx = await contract.createTrade(
            counterparty,
            offeredNFTs,
            requestedNFTs,
            offeredMONAD,
            requestedMONAD,
            message,
            { value: offeredMONAD + ethers.parseEther("0.3") } // Send offered MONAD + trade fee
        );
        
        console.log("⏳ Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Trade created successfully!");
        
        // Get the trade ID (should be 1)
        const tradeCount = await contract.tradeCount();
        const tradeId = tradeCount;
        console.log("🆔 Trade ID:", tradeId.toString());
        
        // Verify the trade
        const trade = await contract.getTrade(tradeId);
        console.log("🔍 Trade verification:");
        console.log("  Creator:", trade.creator);
        console.log("  Counterparty:", trade.counterparty);
        console.log("  Status:", trade.status.toString());
        console.log("  Requested MONAD:", ethers.formatEther(trade.requestedMONAD));
        console.log("  Offered MONAD:", ethers.formatEther(trade.offeredMONAD));
        
        console.log("\n🎉 Test trade created! The frontend should now be able to display and interact with trade ID 1");
        
    } catch (error) {
        console.error("❌ Script failed:", error);
    }
}

main().catch(console.error); 