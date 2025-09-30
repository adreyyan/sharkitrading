const { ethers } = require('ethers');

const CONTRACT_ADDRESS = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678"; // ✅ V4 CONTRACT
const PRIVATE_KEY = "0x1b46c7e9b2df8b9e2e5b2e6b8e4c1e3f9d7c8a6b5e4f3d2c1a9b8e7f6d5c4b3a2"; // The correct counterparty key
const TRADE_ID = 6;

const CONTRACT_ABI = [
  "function getTrade(uint256 tradeId) view returns (uint256, address, address, uint256, uint256, uint256, uint8, string, uint256)",
  "function getOfferedNFTs(uint256 tradeId) view returns (tuple(address contractAddress, uint256 tokenId, uint256 amount, uint8 standard)[])",
  "function getRequestedNFTs(uint256 tradeId) view returns (tuple(address contractAddress, uint256 tokenId, uint256 amount, uint8 standard)[])",
  "function acceptTrade(uint256 tradeId) payable",
  "function expireTrade(uint256 tradeId)"
];

async function main() {
  try {
    console.log('🔍 Diagnosing Trade ID 6 Acceptance...');
    console.log('=====================================');
    
    const provider = new ethers.JsonRpcProvider('https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d');
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    
    console.log('👤 User Address:', wallet.address);
    console.log('🆔 Trade ID:', TRADE_ID);
    console.log('');
    
    // 1. Get trade details
    console.log('1️⃣ Fetching trade details...');
    const [id, creator, counterparty, offeredMONAD, requestedMONAD, expiryTime, status, message, createdAt] = await contract.getTrade(TRADE_ID);
    
    console.log('   Creator:', creator);
    console.log('   Counterparty:', counterparty);
    console.log('   Offered MONAD:', ethers.formatEther(offeredMONAD));
    console.log('   Requested MONAD:', ethers.formatEther(requestedMONAD));
    console.log('   Status:', status, status === 0 ? '(Pending)' : status === 1 ? '(Accepted)' : status === 2 ? '(Cancelled)' : '(Expired)');
    console.log('   Expiry:', new Date(Number(expiryTime) * 1000).toLocaleString());
    console.log('   Message:', message);
    console.log('');
    
    // 2. Check if user is counterparty
    console.log('2️⃣ Checking user permissions...');
    if (counterparty.toLowerCase() !== wallet.address.toLowerCase()) {
      console.log('❌ You are not the counterparty for this trade!');
      console.log('   Expected counterparty:', counterparty);
      console.log('   Your address:', wallet.address);
      return;
    }
    console.log('✅ You are the correct counterparty');
    console.log('');
    
    // 3. Check trade status
    console.log('3️⃣ Checking trade status...');
    if (status !== 0) {
      console.log('❌ Trade is not pending!');
      console.log('   Current status:', status === 1 ? 'Accepted' : status === 2 ? 'Cancelled' : 'Expired');
      
      // Check if it's marked expired but time hasn't passed
      const currentTime = Math.floor(Date.now() / 1000);
      const expiryTimeNumber = Number(expiryTime);
      
      if (status === 3 && currentTime <= expiryTimeNumber) {
        console.log('⚠️ Trade marked as expired but expiry time not reached!');
        console.log('   Current time:', new Date(currentTime * 1000).toLocaleString());
        console.log('   Expiry time:', new Date(expiryTimeNumber * 1000).toLocaleString());
        console.log('   Time until expiry:', Math.floor((expiryTimeNumber - currentTime) / 60), 'minutes');
      }
      return;
    }
    console.log('✅ Trade is pending');
    console.log('');
    
    // 4. Check expiry
    console.log('4️⃣ Checking expiry...');
    const currentTime = Math.floor(Date.now() / 1000);
    const expiryTimeNumber = Number(expiryTime);
    
    if (currentTime > expiryTimeNumber) {
      console.log('❌ Trade has expired!');
      console.log('   Expired:', Math.floor((currentTime - expiryTimeNumber) / 60), 'minutes ago');
      return;
    }
    console.log('✅ Trade is not expired');
    console.log('   Time until expiry:', Math.floor((expiryTimeNumber - currentTime) / 60), 'minutes');
    console.log('');
    
    // 5. Check MONAD balance
    console.log('5️⃣ Checking MONAD balance...');
    const userBalance = await provider.getBalance(wallet.address);
    console.log('   Required MONAD:', ethers.formatEther(requestedMONAD));
    console.log('   Your balance:', ethers.formatEther(userBalance));
    
    if (userBalance < requestedMONAD) {
      console.log('❌ Insufficient MONAD balance!');
      return;
    }
    console.log('✅ Sufficient MONAD balance');
    console.log('');
    
    // 6. Check NFT requirements
    console.log('6️⃣ Checking NFT requirements...');
    const requestedNFTs = await contract.getRequestedNFTs(TRADE_ID);
    console.log('   Requested NFTs count:', requestedNFTs.length);
    
    if (requestedNFTs.length === 0) {
      console.log('✅ No NFTs required');
    } else {
      for (let i = 0; i < requestedNFTs.length; i++) {
        const nft = requestedNFTs[i];
        console.log(`   NFT ${i + 1}:`, nft.contractAddress, 'Token ID:', nft.tokenId.toString(), 'Amount:', nft.amount.toString(), 'Standard:', nft.standard === 0 ? 'ERC721' : 'ERC1155');
        
        // Check ownership and approval
        if (nft.standard === 0) { // ERC721
          const erc721 = new ethers.Contract(nft.contractAddress, [
            'function ownerOf(uint256 tokenId) view returns (address)',
            'function getApproved(uint256 tokenId) view returns (address)',
            'function isApprovedForAll(address owner, address operator) view returns (bool)'
          ], wallet);
          
          try {
            const owner = await erc721.ownerOf(nft.tokenId);
            const approved = await erc721.getApproved(nft.tokenId);
            const isApprovedForAll = await erc721.isApprovedForAll(wallet.address, CONTRACT_ADDRESS);
            
            console.log('     Owner:', owner);
            console.log('     Approved:', approved);
            console.log('     ApprovedForAll:', isApprovedForAll);
            
            if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
              console.log('     ❌ You do not own this NFT');
            } else if (approved.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase() && !isApprovedForAll) {
              console.log('     ❌ NFT not approved for trading');
            } else {
              console.log('     ✅ NFT ownership and approval OK');
            }
          } catch (error) {
            console.log('     ❌ Error checking ERC721:', error.message);
          }
        } else { // ERC1155
          const erc1155 = new ethers.Contract(nft.contractAddress, [
            'function balanceOf(address account, uint256 id) view returns (uint256)',
            'function isApprovedForAll(address owner, address operator) view returns (bool)'
          ], wallet);
          
          try {
            const balance = await erc1155.balanceOf(wallet.address, nft.tokenId);
            const isApprovedForAll = await erc1155.isApprovedForAll(wallet.address, CONTRACT_ADDRESS);
            
            console.log('     Balance:', balance.toString());
            console.log('     Required:', nft.amount.toString());
            console.log('     ApprovedForAll:', isApprovedForAll);
            
            if (balance < nft.amount) {
              console.log('     ❌ Insufficient balance');
            } else if (!isApprovedForAll) {
              console.log('     ❌ Not approved for trading');
            } else {
              console.log('     ✅ Balance and approval OK');
            }
          } catch (error) {
            console.log('     ❌ Error checking ERC1155:', error.message);
          }
        }
      }
    }
    console.log('');
    
    // 7. Try gas estimation
    console.log('7️⃣ Testing gas estimation...');
    try {
      const gasEstimate = await contract.acceptTrade.estimateGas(TRADE_ID, { value: requestedMONAD });
      console.log('✅ Gas estimate successful:', gasEstimate.toString());
    } catch (gasError) {
      console.log('❌ Gas estimation failed:', gasError.message);
      console.log('   This indicates the transaction would revert');
      
      // Try to get more specific error
      if (gasError.message.includes('revert')) {
        console.log('   Likely contract requirement not met');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
  }
}

main().catch(console.error); 