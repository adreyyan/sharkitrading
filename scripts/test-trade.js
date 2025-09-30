const { ethers } = require('hardhat');
const readline = require('readline');

const CONTRACT_ADDRESS = "0x1339936Bc691b9E5fDacfB02C36552C96DcaC031";

// Contract ABI (just the functions we need)
const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "counterparty", "type": "address"},
      {"components": [{"internalType": "address", "name": "contractAddress", "type": "address"}, {"internalType": "uint256", "name": "tokenId", "type": "uint256"}], "internalType": "struct MonadNFTTrading.NFTItem[]", "name": "offeredNFTs", "type": "tuple[]"},
      {"components": [{"internalType": "address", "name": "contractAddress", "type": "address"}, {"internalType": "uint256", "name": "tokenId", "type": "uint256"}], "internalType": "struct MonadNFTTrading.NFTItem[]", "name": "requestedNFTs", "type": "tuple[]"},
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
    "inputs": [{"internalType": "uint256", "name": "tradeId", "type": "uint256"}],
    "name": "getTrade",
    "outputs": [
      {"internalType": "uint256", "name": "id", "type": "uint256"},
      {"internalType": "address", "name": "creator", "type": "address"},
      {"internalType": "address", "name": "counterparty", "type": "address"},
      {"internalType": "uint256", "name": "offeredMONAD", "type": "uint256"},
      {"internalType": "uint256", "name": "requestedMONAD", "type": "uint256"},
      {"internalType": "uint256", "name": "expiryTime", "type": "uint256"},
      {"internalType": "enum MonadNFTTrading.TradeStatus", "name": "status", "type": "uint8"},
      {"internalType": "string", "name": "message", "type": "string"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "tradeId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "counterparty", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "expiryTime", "type": "uint256"},
      {"indexed": false, "internalType": "string", "name": "message", "type": "string"}
    ],
    "name": "TradeCreated",
    "type": "event"
  }
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log("🧪 Testing MonadNFTTrading Contract");
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log();

  // Get private key securely
  const privateKey = await question('Enter your private key (with or without 0x prefix): ');
  
  // Validate and format private key
  let formattedKey = privateKey.trim();
  if (!formattedKey.startsWith('0x')) {
    formattedKey = '0x' + formattedKey;
  }
  
  if (formattedKey.length !== 66) {
    console.error('❌ Invalid private key length. Expected 64 characters (plus 0x prefix)');
    process.exit(1);
  }

  try {
    // Connect to Monad testnet
    const provider = new ethers.JsonRpcProvider('https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d');
    const wallet = new ethers.Wallet(formattedKey, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    console.log("👤 Wallet Address:", wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "MONAD");
    
    if (parseFloat(ethers.formatEther(balance)) < 0.4) {
      console.log("⚠️  Warning: Balance might be too low for testing (need at least 0.4 MONAD for fee + test amount)");
    }

    console.log();
    
    // Get counterparty address
    const counterparty = await question('Enter counterparty address: ');
    if (!ethers.isAddress(counterparty)) {
      console.error('❌ Invalid counterparty address');
      process.exit(1);
    }

    // Create a simple MONAD-only trade
    console.log("🔄 Creating test trade...");
    console.log("- Offering: 0.1 MONAD");
    console.log("- Requesting: 0.2 MONAD");
    console.log("- Message: Test trade from script");
    
    const offeredAmount = ethers.parseEther("0.1");
    const requestedAmount = ethers.parseEther("0.2");
    const fee = ethers.parseEther("0.3");
    const totalValue = offeredAmount + fee; // 0.1 + 0.3 = 0.4 MONAD
    
    const tx = await contract.createTrade(
      counterparty,
      [], // No offered NFTs
      [], // No requested NFTs
      offeredAmount,
      requestedAmount,
      "Test trade from script",
      { value: totalValue }
    );
    
    console.log("📝 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    
    // Extract trade ID from logs
    const tradeCreatedEvent = receipt.logs.find(log => {
      try {
        const decoded = contract.interface.parseLog(log);
        return decoded?.name === 'TradeCreated';
      } catch {
        return false;
      }
    });

    if (tradeCreatedEvent) {
      const decoded = contract.interface.parseLog(tradeCreatedEvent);
      const tradeId = decoded.args[0].toString();
      
      console.log("🎉 Trade created successfully!");
      console.log("Trade ID:", tradeId);
      console.log("Block Number:", receipt.blockNumber);
      console.log("Gas Used:", receipt.gasUsed.toString());
      
      // Verify the trade
      console.log("\n🔍 Verifying trade details...");
      const tradeDetails = await contract.getTrade(tradeId);
      
      console.log("Trade Details:");
      console.log("- ID:", tradeDetails[0].toString());
      console.log("- Creator:", tradeDetails[1]);
      console.log("- Counterparty:", tradeDetails[2]);
      console.log("- Offered MONAD:", ethers.formatEther(tradeDetails[3]));
      console.log("- Requested MONAD:", ethers.formatEther(tradeDetails[4]));
      console.log("- Status:", tradeDetails[6] === 0 ? "Pending" : tradeDetails[6] === 1 ? "Accepted" : "Cancelled");
      console.log("- Message:", tradeDetails[7]);
      
    } else {
      console.log("⚠️  Trade created but couldn't extract trade ID from logs");
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.reason) {
      console.error('Reason:', error.reason);
    }
  } finally {
    rl.close();
  }
}

main().catch(console.error); 