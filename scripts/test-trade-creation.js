const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678"; // ✅ V4 CONTRACT

// Minimal ABI for testing trade creation
const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "counterparty", "type": "address"},
      {
        "components": [
          {"internalType": "address", "name": "contractAddress", "type": "address"},
          {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"},
          {"internalType": "enum MonadNFTTrading.TokenStandard", "name": "standard", "type": "uint8"}
        ],
        "internalType": "struct MonadNFTTrading.NFTItem[]",
        "name": "offeredNFTs",
        "type": "tuple[]"
      },
      {
        "components": [
          {"internalType": "address", "name": "contractAddress", "type": "address"},
          {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"},
          {"internalType": "enum MonadNFTTrading.TokenStandard", "name": "standard", "type": "uint8"}
        ],
        "internalType": "struct MonadNFTTrading.NFTItem[]",
        "name": "requestedNFTs",
        "type": "tuple[]"
      },
      {"internalType": "uint256", "name": "offeredMONAD", "type": "uint256"},
      {"internalType": "uint256", "name": "requestedMONAD", "type": "uint256"},
      {"internalType": "string", "name": "message", "type": "string"}
    ],
    "name": "createTrade",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "tradeId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "counterparty", "type": "address"}
    ],
    "name": "TradeCreated",
    "type": "event"
  }
];

async function main() {
  console.log("🧪 Testing Trade Creation");
  console.log("=========================");
  
  // Check if we have a private key
  if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY.length <= 10) {
    console.log("❌ No valid PRIVATE_KEY found in environment variables.");
    console.log("💡 Please set your PRIVATE_KEY to test trade creation.");
    return;
  }

  try {
    // Connect to the Monad testnet
    const provider = new ethers.JsonRpcProvider("https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d");
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    const userAddress = await signer.getAddress();
    console.log("👤 User Address:", userAddress);
    console.log("🏠 Contract Address:", CONTRACT_ADDRESS);
    console.log("");

    // Create a simple MONAD-only trade
    const counterparty = "0x1234567890123456789012345678901234567890"; // Dummy address
    const offeredNFTs = []; // No NFTs
    const requestedNFTs = []; // No NFTs
    const offeredMONAD = ethers.parseEther("1.0"); // 1 MONAD
    const requestedMONAD = ethers.parseEther("0.5"); // 0.5 MONAD
    const message = "Test trade creation";
    const tradeFee = ethers.parseEther("0.3"); // 0.3 MONAD fee
    const totalValue = offeredMONAD + tradeFee;

    console.log("📝 Creating test trade...");
    console.log("   Counterparty:", counterparty);
    console.log("   Offered MONAD:", ethers.formatEther(offeredMONAD));
    console.log("   Requested MONAD:", ethers.formatEther(requestedMONAD));
    console.log("   Total value to send:", ethers.formatEther(totalValue));
    console.log("");

    const tx = await contract.createTrade(
      counterparty,
      offeredNFTs,
      requestedNFTs,
      offeredMONAD,
      requestedMONAD,
      message,
      { value: totalValue }
    );

    console.log("✅ Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    console.log("📊 Total logs:", receipt.logs.length);
    console.log("");

    // Parse events
    console.log("🔍 Parsing events...");
    let tradeId = null;

    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      console.log(`Log ${i}:`, {
        address: log.address,
        topics: log.topics?.length || 0
      });

      try {
        if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
          const decoded = contract.interface.parseLog(log);
          console.log(`  ✅ Decoded event: ${decoded.name}`);
          console.log(`     Args:`, decoded.args.map(arg => arg.toString()));
          
          if (decoded.name === 'TradeCreated') {
            tradeId = decoded.args[0].toString();
            console.log(`  🎯 Trade ID found: ${tradeId}`);
          }
        }
      } catch (error) {
        console.log(`  ❌ Could not decode log ${i}:`, error.message);
      }
    }

    if (tradeId) {
      console.log("");
      console.log("🎉 Trade created successfully!");
      console.log("🆔 Trade ID:", tradeId);
      console.log("🔗 Transaction:", tx.hash);
    } else {
      console.log("");
      console.log("⚠️ Trade creation may have failed - no TradeCreated event found");
    }

  } catch (error) {
    console.error("❌ Error testing trade creation:", error);
    
    if (error.message?.includes('insufficient funds')) {
      console.log("💡 You need more MONAD to create this test trade");
    } else if (error.message?.includes('missing revert data')) {
      console.log("💡 The transaction was reverted by the contract");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 