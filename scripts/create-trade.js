const { ethers } = require("hardhat");

async function main() {
  console.log("\n🎫 CREATING VAULT RECEIPT TRADE");
  console.log("=".repeat(60));

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("Creator wallet:", signer.address);

  // Contract addresses
  const tradingAddress = "0xB4981E473Ad74a410b5479bf21635c47108D243a";
  const vaultAddress = "0xaABBC3d80b9C7e33Eaf2D148f52d60A5ebBc4084";

  // Get contracts
  const trading = await ethers.getContractAt("PrivateNFTTradingV1", tradingAddress);
  const vault = await ethers.getContractAt("PrivateNFTVault", vaultAddress);

  // Check balance
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("ETH Balance:", ethers.formatEther(balance));

  // Get trade fee
  const fee = await trading.tradeFee();
  console.log("Trade Fee:", ethers.formatEther(fee), "ETH");

  // Check if vault is approved
  const isApproved = await vault.isApprovedForAll(signer.address, tradingAddress);
  console.log("Vault approved for trading:", isApproved);

  if (!isApproved) {
    console.log("\n❌ Vault not approved! Approving now...");
    const approveTx = await vault.setApprovalForAll(tradingAddress, true);
    await approveTx.wait();
    console.log("✅ Vault approved!");
  }

  // Get user's receipts
  const filter = vault.filters.NFTDeposited(signer.address);
  const events = await vault.queryFilter(filter, 0, 'latest');
  console.log("\nYour vault receipts:", events.map(e => e.args.plainReceiptId.toString()));

  if (events.length === 0) {
    console.log("❌ No vault receipts found! Deposit an NFT first.");
    process.exit(1);
  }

  // Create trade parameters
  const counterparty = "0x6e1317c587160BeA45b30Ff201E34f76B63942a0"; // Change this
  const offeredReceiptIds = [events[0].args.plainReceiptId]; // Offer first receipt
  const requestedReceiptIds = []; // Request nothing (just for testing)
  const requestedETH = ethers.parseEther("0"); // Request 0 ETH
  const message = "Test trade from script";

  console.log("\n📋 TRADE PARAMETERS:");
  console.log("  Counterparty:", counterparty);
  console.log("  Offered Receipts:", offeredReceiptIds.map(id => id.toString()));
  console.log("  Requested Receipts:", requestedReceiptIds);
  console.log("  Requested ETH:", ethers.formatEther(requestedETH));
  console.log("  Message:", message);
  console.log("  Value (fee):", ethers.formatEther(fee));

  console.log("\n🚀 Creating trade...");

  try {
    const tx = await trading.createTrade(
      counterparty,
      offeredReceiptIds,
      requestedReceiptIds,
      requestedETH,
      message,
      { value: fee }
    );

    console.log("✅ Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("   Block:", receipt.blockNumber);

    // Find TradeCreated event
    for (const log of receipt.logs) {
      try {
        const parsed = trading.interface.parseLog(log);
        if (parsed.name === "TradeCreated") {
          console.log("\n🎉 TRADE CREATED!");
          console.log("   Trade ID:", parsed.args.tradeId.toString());
          console.log("   Creator:", parsed.args.creator);
          console.log("   Counterparty:", parsed.args.counterparty);
          
          const tradeId = parsed.args.tradeId.toString();
          console.log("\n✅ Share this link with the counterparty:");
          console.log(`   https://zamanfttrading.vercel.app/trade/${tradeId}`);
        }
      } catch {}
    }

  } catch (error) {
    console.error("\n❌ Error creating trade:");
    console.error(error.message);
    
    if (error.message.includes("Insufficient fee")) {
      console.log("\n💡 TIP: You need to send at least", ethers.formatEther(fee), "ETH as the trade fee");
    }
    if (error.message.includes("Nothing offered")) {
      console.log("\n💡 TIP: You need to offer at least one receipt or some ETH");
    }
    if (error.message.includes("Nothing requested")) {
      console.log("\n💡 TIP: You need to request at least one receipt or some ETH");
    }
  }

  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

