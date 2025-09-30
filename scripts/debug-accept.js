const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678"; // ✅ V4 CONTRACT
const TRADE_ID = 4; // Change this to the trade ID you want to accept

// Full contract ABI for debugging
const CONTRACT_ABI = [
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
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "string", "name": "message", "type": "string"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tradeId", "type": "uint256"}],
    "name": "getRequestedNFTs",
    "outputs": [
      {"components": [
        {"internalType": "address", "name": "contractAddress", "type": "address"},
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"},
        {"internalType": "uint8", "name": "standard", "type": "uint8"}
      ], "internalType": "struct MonadNFTTrading.NFTItem[]", "name": "", "type": "tuple[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tradeId", "type": "uint256"}],
    "name": "getOfferedNFTs",
    "outputs": [
      {"components": [
        {"internalType": "address", "name": "contractAddress", "type": "address"},
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"},
        {"internalType": "uint8", "name": "standard", "type": "uint8"}
      ], "internalType": "struct MonadNFTTrading.NFTItem[]", "name": "", "type": "tuple[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tradeId", "type": "uint256"}],
    "name": "acceptTrade",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

async function main() {
  console.log("🔍 Debug Accept Trade Issues");
  console.log("=============================");
  
  // Check if we have a private key
  if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY.length <= 10) {
    console.log("❌ No valid PRIVATE_KEY found in environment variables.");
    console.log("💡 Please set your PRIVATE_KEY in the .env file to debug accept issues.");
    console.log("");
    console.log("   Example .env file:");
    console.log("   PRIVATE_KEY=0x1234567890abcdef...");
    console.log("");
    console.log("   This should be the private key of the counterparty (person accepting the trade).");
    return;
  }

  // Connect to the Monad testnet
  let signer;
  try {
    const provider = new ethers.JsonRpcProvider("https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d");
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  } catch (error) {
    console.log("❌ Error connecting to network:", error.message);
    return;
  }

  const userAddress = await signer.getAddress();
  
  console.log("👤 User Address:", userAddress);
  console.log("🏠 Contract Address:", CONTRACT_ADDRESS);
  console.log("🆔 Trade ID:", TRADE_ID);
  console.log("");
  
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  
  try {
    // 1. Check trade details
    console.log("1️⃣ Fetching trade details...");
    const [id, creator, counterparty, offeredMONAD, requestedMONAD, expiryTime, status, message, createdAt] = await contract.getTrade(TRADE_ID);
    
    if (!creator || creator === ethers.ZeroAddress) {
      console.log("❌ Trade does not exist!");
      return;
    }
    
    console.log("✅ Trade found!");
    console.log("   Creator:", creator);
    console.log("   Counterparty:", counterparty);
    console.log("   Offered MONAD:", ethers.formatEther(offeredMONAD));
    console.log("   Requested MONAD:", ethers.formatEther(requestedMONAD));
    console.log("   Status:", status === 0 ? "Pending" : status === 1 ? "Accepted" : status === 2 ? "Cancelled" : "Expired");
    console.log("   Expiry:", new Date(Number(expiryTime) * 1000).toLocaleString());
    console.log("");
    
    // 2. Check user permissions
    console.log("2️⃣ Checking user permissions...");
    if (counterparty.toLowerCase() !== userAddress.toLowerCase()) {
      console.log("❌ You are not the counterparty for this trade!");
      console.log("   Expected counterparty:", counterparty);
      console.log("   Your address:", userAddress);
      return;
    }
    console.log("✅ You are the designated counterparty");
    
    // 3. Check trade status
    console.log("3️⃣ Checking trade status...");
    if (status !== 0) {
      console.log("❌ Trade is not pending!");
      const statusText = status === 1 ? "Accepted" : status === 2 ? "Cancelled" : "Expired";
      console.log("   Current status:", statusText);
      return;
    }
    console.log("✅ Trade is pending");
    
    // 4. Check expiry
    console.log("4️⃣ Checking trade expiry...");
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > Number(expiryTime)) {
      console.log("❌ Trade has expired!");
      console.log("   Expired at:", new Date(Number(expiryTime) * 1000).toLocaleString());
      return;
    }
    console.log("✅ Trade has not expired");
    
    // 5. Check MONAD balance
    console.log("5️⃣ Checking MONAD balance...");
    const userBalance = await signer.provider.getBalance(userAddress);
    console.log("   Your balance:", ethers.formatEther(userBalance), "MONAD");
    console.log("   Required:", ethers.formatEther(requestedMONAD), "MONAD");
    
    if (userBalance < requestedMONAD) {
      console.log("❌ Insufficient MONAD balance!");
      const shortfall = requestedMONAD - userBalance;
      console.log("   Shortfall:", ethers.formatEther(shortfall), "MONAD");
      return;
    }
    console.log("✅ Sufficient MONAD balance");
    console.log("");
    
    // 6. Check requested NFTs
    console.log("6️⃣ Checking requested NFTs (NFTs you need to provide)...");
    const requestedNFTs = await contract.getRequestedNFTs(TRADE_ID);
    
    if (requestedNFTs.length === 0) {
      console.log("✅ No NFTs requested");
    } else {
      console.log(`   Found ${requestedNFTs.length} requested NFT(s):`);
      
      for (let i = 0; i < requestedNFTs.length; i++) {
        const nft = requestedNFTs[i];
        console.log(`   NFT ${i + 1}:`);
        console.log(`     Contract: ${nft.contractAddress}`);
        console.log(`     Token ID: ${nft.tokenId}`);
        console.log(`     Amount: ${nft.amount}`);
        console.log(`     Standard: ${nft.standard === 0 ? 'ERC721' : 'ERC1155'}`);
        
        try {
          if (nft.standard === 0) { // ERC721
            const erc721 = new ethers.Contract(
              nft.contractAddress,
              [
                'function ownerOf(uint256 tokenId) view returns (address)',
                'function getApproved(uint256 tokenId) view returns (address)',
                'function isApprovedForAll(address owner, address operator) view returns (bool)'
              ],
              signer
            );
            
            // Check ownership
            const owner = await erc721.ownerOf(nft.tokenId);
            console.log(`     Owner: ${owner}`);
            
            if (owner.toLowerCase() !== userAddress.toLowerCase()) {
              console.log("     ❌ You don't own this NFT!");
              continue;
            }
            console.log("     ✅ You own this NFT");
            
            // Check approvals
            const approved = await erc721.getApproved(nft.tokenId);
            const isApprovedForAll = await erc721.isApprovedForAll(userAddress, CONTRACT_ADDRESS);
            
            console.log(`     Approved for: ${approved}`);
            console.log(`     Approved for all: ${isApprovedForAll}`);
            
            if (approved.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase() && !isApprovedForAll) {
              console.log("     ❌ NFT not approved for trading contract!");
              console.log("     💡 Run: setApprovalForAll or approve for this specific token");
            } else {
              console.log("     ✅ NFT is approved for trading");
            }
            
          } else if (nft.standard === 1) { // ERC1155
            const erc1155 = new ethers.Contract(
              nft.contractAddress,
              [
                'function balanceOf(address account, uint256 id) view returns (uint256)',
                'function isApprovedForAll(address owner, address operator) view returns (bool)'
              ],
              signer
            );
            
            // Check balance
            const balance = await erc1155.balanceOf(userAddress, nft.tokenId);
            console.log(`     Your balance: ${balance}`);
            console.log(`     Required: ${nft.amount}`);
            
            if (balance < nft.amount) {
              console.log("     ❌ Insufficient balance!");
              continue;
            }
            console.log("     ✅ Sufficient balance");
            
            // Check approval
            const isApprovedForAll = await erc1155.isApprovedForAll(userAddress, CONTRACT_ADDRESS);
            console.log(`     Approved for all: ${isApprovedForAll}`);
            
            if (!isApprovedForAll) {
              console.log("     ❌ ERC1155 collection not approved for trading contract!");
              console.log("     💡 Run: setApprovalForAll(tradingContract, true)");
            } else {
              console.log("     ✅ ERC1155 collection is approved for trading");
            }
          }
          
        } catch (nftError) {
          console.log(`     ❌ Error checking NFT: ${nftError.message}`);
        }
        
        console.log("");
      }
    }
    
    // 7. Test gas estimation
    console.log("7️⃣ Testing gas estimation for acceptTrade...");
    try {
      const gasEstimate = await contract.acceptTrade.estimateGas(TRADE_ID, { 
        value: requestedMONAD 
      });
      console.log("✅ Gas estimation successful:", gasEstimate.toString());
    } catch (gasError) {
      console.log("❌ Gas estimation failed:", gasError.message);
      console.log("   This indicates the transaction would fail");
      
      if (gasError.message?.includes('missing revert data')) {
        console.log("   💡 This usually means:");
        console.log("     - NFT ownership issues");
        console.log("     - Missing NFT approvals");
        console.log("     - Insufficient MONAD balance");
        console.log("     - Trade status issues");
      }
      
      return;
    }
    
    console.log("");
    console.log("8️⃣ Summary:");
    console.log("✅ All checks passed! The trade should be acceptable.");
    console.log("");
    console.log("💡 To accept this trade:");
    console.log("   1. Make sure your wallet is connected");
    console.log("   2. Ensure you have enough MONAD for gas fees");
    console.log("   3. Click 'Accept Trade' in the web interface");
    console.log("   4. Or run: node scripts/accept-trade.js");
    
  } catch (error) {
    console.error("❌ Error debugging trade acceptance:", error);
    
    if (error.message?.includes('BAD_DATA')) {
      console.log("");
      console.log("💡 This error might indicate:");
      console.log("   - The trade ID doesn't exist");
      console.log("   - Network connection issues");
      console.log("   - Contract address is incorrect");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 