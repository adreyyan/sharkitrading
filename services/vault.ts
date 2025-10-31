import { ethers } from 'ethers';
import { CONTRACT_VAULT_CONFIG } from '@/lib/contracts';
import { walletClientToSigner } from './blockchain';

/**
 * PRIVATE NFT VAULT SERVICE
 * 
 * This service handles interactions with the PrivateNFTVault contract
 * which provides full NFT privacy by:
 * 1. Depositing real NFTs and getting encrypted receipt IDs
 * 2. Trading encrypted receipt IDs (NFT details stay private)
 * 3. Withdrawing real NFTs using receipt IDs after trade
 */

export interface VaultReceipt {
  receiptId: string;
  nftContract: string;
  tokenId: string;
  amount: string;
  isERC1155: boolean;
  isWithdrawn: boolean;
}

/**
 * Deposit an NFT into the vault and get an encrypted receipt ID
 */
export async function depositNFTToVault(
  nftContract: string,
  tokenId: string,
  amount: number,
  isERC1155: boolean,
  walletClient: any
): Promise<string> {
  console.log('🏦 Depositing NFT to vault:', { nftContract, tokenId, amount, isERC1155 });
  
  const signer = await walletClientToSigner(walletClient);
  const vaultContract = new ethers.Contract(
    CONTRACT_VAULT_CONFIG.address,
    CONTRACT_VAULT_CONFIG.abi,
    signer
  );

  try {
    // First, approve the vault to take the NFT
    if (isERC1155) {
      const erc1155 = new ethers.Contract(
        nftContract,
        ['function setApprovalForAll(address operator, bool approved)'],
        signer
      );
      const tx = await erc1155.setApprovalForAll(CONTRACT_VAULT_CONFIG.address, true);
      await tx.wait();
    } else {
      const erc721 = new ethers.Contract(
        nftContract,
        ['function approve(address to, uint256 tokenId)'],
        signer
      );
      const tx = await erc721.approve(CONTRACT_VAULT_CONFIG.address, tokenId);
      await tx.wait();
    }

    // Deposit the NFT
    console.log('📤 Sending deposit transaction...');
    const depositTx = await vaultContract.deposit(
      nftContract,
      tokenId,
      amount,
      isERC1155 ? 1 : 0 // Convert boolean to standard enum (0 = ERC721, 1 = ERC1155)
    );
    
    console.log('⏳ Waiting for confirmation...', depositTx.hash);
    const receipt = await depositTx.wait();
    
    // Get the receipt ID from the event
    const depositEvent = receipt.logs
      .map((log: any) => {
        try {
          return vaultContract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event: any) => event?.name === 'NFTDeposited');

    if (!depositEvent) {
      throw new Error('Deposit event not found in transaction receipt');
    }

    const receiptId = depositEvent.args.receiptId.toString();
    console.log('✅ NFT deposited! Receipt ID:', receiptId);
    
    return receiptId;
  } catch (error) {
    console.error('❌ Vault deposit failed:', error);
    throw new Error(`Failed to deposit NFT: ${error.message}`);
  }
}

/**
 * Withdraw an NFT from the vault using a receipt ID
 * NOTE: This is ASYNC - the oracle will decrypt and send NFT back automatically
 */
export async function withdrawNFTFromVault(
  receiptId: string,
  walletClient: any
): Promise<void> {
  console.log('🏦 Initiating NFT withdrawal from vault:', receiptId);
  
  const signer = await walletClientToSigner(walletClient);
  const vaultContract = new ethers.Contract(
    CONTRACT_VAULT_CONFIG.address,
    CONTRACT_VAULT_CONFIG.abi,
    signer
  );

  try {
    console.log('📥 Initiating withdrawal (requesting decryption)...');
    console.log('   Receipt ID (plain):', receiptId);
    
    // Use the new initiateWithdrawById function that takes plain uint256
    // This is much simpler - just pass the receipt ID as a number!
    const withdrawTx = await vaultContract.initiateWithdrawById(receiptId);
    
    console.log('⏳ Waiting for transaction confirmation...', withdrawTx.hash);
    const receipt = await withdrawTx.wait();
    
    console.log('✅ Withdrawal initiated!');
    console.log('⏳ Oracle will decrypt and send NFT automatically (~30-60 seconds)');
    
    // Get the request ID from the event
    const event = receipt.logs
      .map((log: any) => {
        try {
          return vaultContract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'WithdrawInitiated');

    if (event) {
      console.log('🎫 Decryption Request ID:', event.args.requestId.toString());
    }
  } catch (error) {
    console.error('❌ Vault withdrawal failed:', error);
    throw new Error(`Failed to initiate withdrawal: ${error.message}`);
  }
}

/**
 * Check if an NFT is deposited in the vault
 */
export async function isNFTInVault(
  nftContract: string,
  tokenId: string,
  userAddress: string
): Promise<{ isDeposited: boolean; receiptId?: string }> {
  try {
    const provider = new ethers.JsonRpcProvider(
      'https://eth-sepolia.g.alchemy.com/v2/4Bf12QaQ6tjN7-92DiLEO'
    );
    
    const vaultContract = new ethers.Contract(
      CONTRACT_VAULT_CONFIG.address,
      CONTRACT_VAULT_CONFIG.abi,
      provider
    );

    // This would need to be implemented in the contract or we track deposits client-side
    // For now, return false (not deposited)
    return { isDeposited: false };
  } catch (error) {
    console.error('Error checking vault status:', error);
    return { isDeposited: false };
  }
}

/**
 * Get all vault receipts for a user
 */
export async function getUserVaultReceipts(
  userAddress: string
): Promise<VaultReceipt[]> {
  try {
    const provider = new ethers.JsonRpcProvider(
      'https://eth-sepolia.g.alchemy.com/v2/4Bf12QaQ6tjN7-92DiLEO'
    );
    
    const vaultContract = new ethers.Contract(
      CONTRACT_VAULT_CONFIG.address,
      CONTRACT_VAULT_CONFIG.abi,
      provider
    );

    // Query deposit events for this user (only user is indexed)
    console.log('\n🔍 QUERYING VAULT DEPOSITS');
    console.log('============================');
    console.log('User:', userAddress);
    console.log('Vault:', CONTRACT_VAULT_CONFIG.address);
    
    // Get current block
    const currentBlock = await provider.getBlockNumber();
    console.log('Current block:', currentBlock);
    
    // Try different block ranges to find deposits
    const blockRanges = [
      { from: Math.max(0, currentBlock - 10000), to: currentBlock, label: 'Last 10k blocks (~1.5 days)' },
      { from: Math.max(0, currentBlock - 100000), to: currentBlock, label: 'Last 100k blocks (~14 days)' },
    ];
    
    let allEvents: any[] = [];
    
    for (const range of blockRanges) {
      try {
        console.log(`\n🔎 Searching ${range.label}: blocks ${range.from} to ${range.to}`);
        const filter = vaultContract.filters.NFTDeposited(userAddress);
        const events = await vaultContract.queryFilter(filter, range.from, range.to);
        
        console.log(`   ✅ Found ${events.length} events in this range`);
        
        if (events.length > 0) {
          allEvents = events;
          break; // Found events, no need to search further
        }
      } catch (rangeError) {
        console.warn(`   ⚠️ Error searching range:`, rangeError.message);
      }
    }
    
    // Also try without block range (all history)
    if (allEvents.length === 0) {
      try {
        console.log(`\n🔎 Searching ALL blocks (no range)`);
        const filter = vaultContract.filters.NFTDeposited(userAddress);
        allEvents = await vaultContract.queryFilter(filter);
        console.log(`   ✅ Found ${allEvents.length} events in full history`);
      } catch (fullError) {
        console.error(`   ❌ Error searching full history:`, fullError);
      }
    }
    
    console.log(`\n📊 TOTAL EVENTS FOUND: ${allEvents.length}`);
    
    const receipts: VaultReceipt[] = [];
    
    for (const event of allEvents) {
      const args = event.args;
      const receiptIdStr = args.receiptId?.toString() || 'unknown';
      
      console.log('\n📦 Processing deposit event:');
      console.log('   Receipt ID:', receiptIdStr);
      console.log('   User:', args.user);
      console.log('   Block:', event.blockNumber);
      console.log('   Tx:', event.transactionHash);
      
      // Add all deposits (they're encrypted so we can't check details)
      receipts.push({
        receiptId: receiptIdStr,
        nftContract: '🔐 Encrypted', // Encrypted, we don't know
        tokenId: '🔐 Private', // Encrypted, we don't know  
        amount: '1',
        isERC1155: false,
        isWithdrawn: false,
      });
    }
    
    console.log(`\n✅ FINAL RESULT: ${receipts.length} vault receipts for ${userAddress}`);
    console.log('============================\n');
    return receipts;
  } catch (error) {
    console.error('\n❌ ERROR GETTING VAULT RECEIPTS:');
    console.error(error);
    console.error('============================\n');
    return [];
  }
}

