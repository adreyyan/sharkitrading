import { ethers } from 'ethers';
import { CONTRACT_CONFIG, TRADE_FEE, getOptimalProvider, HYPER_RPC_SUPPORTED_METHODS, ACTIVE_NETWORK } from '@/lib/contracts';
import { NFT } from '@/types/nft';
import { TradeData } from '@/types/trade';

// Simple rate limiter to prevent hitting QuickNode limits
class RateLimiter {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;
  private readonly delay = 50; // 50ms between calls = max 20 calls/second (under 25/sec limit)
  private cache = new Map<string, { result: any; timestamp: number }>();
  private readonly cacheTimeout = 60000; // 1 minute cache

  async execute<T>(fn: () => Promise<T>, cacheKey?: string): Promise<T> {
    // Check cache first if key provided
    if (cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`📋 Cache hit for ${cacheKey}`);
        return cached.result;
      }
    }

    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          
          // Cache result if key provided
          if (cacheKey) {
            this.cache.set(cacheKey, { result, timestamp: Date.now() });
            console.log(`💾 Cached result for ${cacheKey}`);
          }
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const fn = this.queue.shift()!;
      await fn();
      
      // Add delay between calls to respect rate limits
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }
    
    this.processing = false;
  }
}

// Create global rate limiter instance
const rateLimiter = new RateLimiter();

// Smart provider that routes to optimal endpoint
class OptimalProvider {
  private hyperRpcProvider: ethers.JsonRpcProvider;
  private standardRpcProvider: ethers.JsonRpcProvider;

  constructor() {
    const providers = getOptimalProvider();
    this.hyperRpcProvider = new ethers.JsonRpcProvider(providers.hyperRpc);
    this.standardRpcProvider = new ethers.JsonRpcProvider(providers.standardRpc);
  }

  // Route method to optimal provider
  getProvider(method?: string): ethers.JsonRpcProvider {
    if (method && HYPER_RPC_SUPPORTED_METHODS.includes(method as any)) {
      console.log(`🚀 Using HyperRPC for ${method} (5x faster!)`);
      return this.hyperRpcProvider;
    }
    console.log(`📡 Using standard RPC for ${method || 'general use'}`);
    return this.standardRpcProvider;
  }

  // Get contract with optimal provider for the operation
  getContract(method?: string) {
    const provider = this.getProvider(method);
    return new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_CONFIG.abi, provider);
  }

  // Rate-limited getCode function with caching
  async getCode(address: string): Promise<string> {
    return rateLimiter.execute(async () => {
      const provider = this.getProvider();
      return provider.getCode(address);
    }, `getCode:${address}`);
  }
}

// Create singleton instance
export const optimalProvider = new OptimalProvider();

// Enhanced ERC1155 balance checking
export async function getERC1155Balance(
  contractAddress: string, 
  tokenId: string, 
  userAddress: string, 
  provider: ethers.Provider
): Promise<string> {
  try {
    const contract = new ethers.Contract(
      contractAddress,
      ['function balanceOf(address account, uint256 id) view returns (uint256)'],
      provider
    );
    
    const balance = await contract.balanceOf(userAddress, tokenId);
    return balance.toString();
  } catch (error) {
    console.error(`❌ Failed to get ERC1155 balance for ${contractAddress}:${tokenId}:`, error);
    return '0';
  }
}

// Check if contract supports ERC1155
export async function isERC1155Contract(contractAddress: string, provider: ethers.Provider): Promise<boolean> {
  try {
    const contract = new ethers.Contract(
      contractAddress,
      ['function supportsInterface(bytes4 interfaceId) view returns (bool)'],
      provider
    );
    
    const erc1155InterfaceId = '0xd9b67a26';
    return await contract.supportsInterface(erc1155InterfaceId);
  } catch (error) {
    return false;
  }
}

// Helper function to convert wallet client to ethers signer
export async function walletClientToSigner(walletClient: any): Promise<ethers.Signer> {
  const provider = new ethers.BrowserProvider(walletClient as any);
  return provider.getSigner();
}

// Helper function to get read-only contract instance
export function getContract(signer?: ethers.Signer) {
  if (signer) {
    return new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_CONFIG.abi, signer);
  }
  return null;
}

export interface CreateTradeParams {
  counterpartyAddress: string;
  userNFTs: Array<{ contractAddress: string; tokenId: string; amount?: string; standard?: number }>;
  counterpartyNFTs: Array<{ contractAddress: string; tokenId: string; amount?: string; standard?: number }>;
  userMonadAmount: string;
  counterpartyMonadAmount: string;
  message: string;
  // expiryHours removed - now fixed at 1 day
}

// Create a new trade on the blockchain
export async function createTrade(params: CreateTradeParams, walletClient: any): Promise<string> {
  const signer = await walletClientToSigner(walletClient);
  const contract = getContract(signer);
  if (!contract) throw new Error('Contract not available');

  let offeredNFTs: any[] = [];
  let requestedNFTs: any[] = [];

  try {
    console.log('🔍 STARTING TRADE CREATION WITH APPROVAL CHECKS');
    console.log('================================================');

    // Calculate total ETH needed (user amount + dynamic fee from FHEV7 contract)
    const userAmount = parseFloat(params.userMonadAmount) || 0;
    
    // Get dynamic trade fee from FHEV7 contract
    let feeAmount: number;
    try {
      const tradeFeeWei = await contract.tradeFee();
      feeAmount = parseFloat(ethers.formatEther(tradeFeeWei));
      console.log(`💰 Dynamic trade fee from contract: ${feeAmount} ETH`);
    } catch (error) {
      console.warn('⚠️ Could not fetch dynamic fee, using default 0.01 ETH');
      feeAmount = parseFloat(TRADE_FEE); // Fallback to hardcoded fee
    }
    
    const totalValue = ethers.parseEther((userAmount + feeAmount).toString());

    const userAddress = await signer.getAddress();
    console.log(`👤 User Address: ${userAddress}`);
    console.log(`💰 Total Value Required: ${ethers.formatEther(totalValue)} ETH`);

    // Prepare NFT arrays for the new contract format with ERC1155 support
    offeredNFTs = await Promise.all(params.userNFTs.map(async (nft) => {
      let standard = nft.standard;
      let amount = nft.amount || "1";
      
      console.log(`\n🔍 Processing offered NFT: ${nft.contractAddress}:${nft.tokenId}`);
      
      // Auto-detect token standard if not provided
      if (standard === undefined) {
        try {
          standard = await contract.detectTokenStandard(nft.contractAddress);
          console.log(`✅ Detected token standard: ${standard === 0 ? 'ERC721' : 'ERC1155'}`);
        } catch (error) {
          console.warn(`⚠️ Could not detect token standard, defaulting to ERC721`);
          standard = 0; // Default to ERC721
        }
      }

      // COMPREHENSIVE APPROVAL AND OWNERSHIP CHECKS
      if (standard === 0) { // ERC721
        console.log(`📋 Verifying ERC721 NFT...`);
        
        const erc721Contract = new ethers.Contract(
          nft.contractAddress,
          [
            'function ownerOf(uint256 tokenId) view returns (address)',
            'function getApproved(uint256 tokenId) view returns (address)',
            'function isApprovedForAll(address owner, address operator) view returns (bool)',
            'function approve(address to, uint256 tokenId)',
            'function setApprovalForAll(address operator, bool approved)'
          ],
          signer
        );

        // Check ownership
        try {
          const owner = await erc721Contract.ownerOf(nft.tokenId);
          if (owner.toLowerCase() !== userAddress.toLowerCase()) {
            throw new Error(`❌ You don't own this NFT. Owner: ${owner}, You: ${userAddress}`);
          }
          console.log(`✅ Ownership confirmed`);
        } catch (error) {
          throw new Error(`❌ Failed to verify ownership: ${error.message}`);
        }

        // Check approval status with enhanced error handling
        try {
          let approvedAddress = ethers.ZeroAddress;
          let isApprovedForAll = false;
          
          try {
            approvedAddress = await erc721Contract.getApproved(nft.tokenId);
          } catch (getApprovedError) {
            console.warn(`⚠️ Could not check getApproved:`, getApprovedError.message);
          }
          
          try {
            isApprovedForAll = await erc721Contract.isApprovedForAll(userAddress, CONTRACT_CONFIG.address);
          } catch (isApprovedForAllError) {
            console.warn(`⚠️ Could not check isApprovedForAll:`, isApprovedForAllError.message);
          }
          
          console.log(`📝 Current approval status:`);
          console.log(`   - getApproved: ${approvedAddress}`);
          console.log(`   - isApprovedForAll: ${isApprovedForAll}`);

          const isApproved = (
            approvedAddress.toLowerCase() === CONTRACT_CONFIG.address.toLowerCase() ||
            isApprovedForAll
          );

          if (!isApproved) {
            throw new Error(
              `❌ ERC721 NFT not approved for trading!\n\n` +
              `To fix this:\n` +
              `1. Approve the trading contract for this specific token:\n` +
              `   approve("${CONTRACT_CONFIG.address}", ${nft.tokenId})\n\n` +
              `OR\n\n` +
              `2. Approve the trading contract for all your tokens (recommended):\n` +
              `   setApprovalForAll("${CONTRACT_CONFIG.address}", true)\n\n` +
              `Contract: ${nft.contractAddress}\n` +
              `Token ID: ${nft.tokenId}\n` +
              `Trading Contract: ${CONTRACT_CONFIG.address}`
            );
          }
          console.log(`✅ ERC721 approval confirmed`);
        } catch (error) {
          if (error.message.includes('ERC721 NFT not approved')) {
            throw error;
          }
          
          // Enhanced error handling for approval check failures
          throw new Error(
            `❌ Failed to verify ERC721 approval status!\n\n` +
            `This could be due to:\n` +
            `• Network connectivity issues\n` +
            `• Contract compatibility issues\n` +
            `• RPC rate limiting\n\n` +
            `To fix this:\n` +
            `1. Try refreshing the page and attempting again\n` +
            `2. Ensure your NFT is approved: approve("${CONTRACT_CONFIG.address}", ${nft.tokenId})\n` +
            `3. Or approve all: setApprovalForAll("${CONTRACT_CONFIG.address}", true)\n` +
            `4. Check your network connection\n\n` +
            `Contract: ${nft.contractAddress}\n` +
            `Token ID: ${nft.tokenId}\n` +
            `Trading Contract: ${CONTRACT_CONFIG.address}\n\n` +
            `Error: ${error.message}`
          );
        }

        // Ensure amount is 1 for ERC721
        amount = "1";
      }
      
      // Smart handling for ERC1155 open editions
      if (standard === 1) {
        console.log(`📦 Verifying ERC1155 NFT...`);
        
        try {
          const erc1155Contract = new ethers.Contract(
            nft.contractAddress,
            [
              'function balanceOf(address account, uint256 id) view returns (uint256)',
              'function isApprovedForAll(address account, address operator) view returns (bool)',
              'function setApprovalForAll(address operator, bool approved)'
            ],
            signer
          );
          
          // Check balance
          const balance = await erc1155Contract.balanceOf(userAddress, nft.tokenId);
          console.log(`💰 User balance for token ${nft.tokenId}: ${balance.toString()}`);
          
          if (balance.toString() === "0") {
            throw new Error(`❌ You don't own any copies of token ID ${nft.tokenId} in this collection`);
          }
          
          // Check if trading contract is approved with enhanced error handling
          let isApproved = false;
          try {
            isApproved = await erc1155Contract.isApprovedForAll(userAddress, CONTRACT_CONFIG.address);
            console.log(`📝 ERC1155 approval status: ${isApproved}`);
          } catch (approvalCheckError) {
            console.error(`❌ Failed to check approval status:`, approvalCheckError);
            
            // If we can't check approval, assume it's not approved and provide guidance
            throw new Error(
              `❌ Unable to verify ERC1155 approval status!\n\n` +
              `This could be due to:\n` +
              `• Network connectivity issues\n` +
              `• Contract compatibility issues\n` +
              `• RPC rate limiting\n\n` +
              `To fix this:\n` +
              `1. Try refreshing the page and attempting again\n` +
              `2. Ensure your NFTs are approved: setApprovalForAll("${CONTRACT_CONFIG.address}", true)\n` +
              `3. Check your network connection\n\n` +
              `Contract: ${nft.contractAddress}\n` +
              `Token ID: ${nft.tokenId}\n` +
              `Trading Contract: ${CONTRACT_CONFIG.address}\n\n` +
              `Error: ${approvalCheckError.message}`
            );
          }
          
          if (!isApproved) {
            throw new Error(
              `❌ ERC1155 NFT not approved for trading!\n\n` +
              `To fix this:\n` +
              `Call setApprovalForAll("${CONTRACT_CONFIG.address}", true)\n\n` +
              `This will allow the trading contract to transfer your ERC1155 tokens.\n` +
              `This is a one-time approval per collection.\n\n` +
              `Contract: ${nft.contractAddress}\n` +
              `Token ID: ${nft.tokenId}\n` +
              `Trading Contract: ${CONTRACT_CONFIG.address}`
            );
          }
          console.log(`✅ ERC1155 approval confirmed`);
          
        } catch (approvalError) {
          console.error('❌ ERC1155 validation failed:', approvalError);
          throw approvalError;
        }
        
        // Ensure amount is at least 1 for ERC1155
        if (!amount || amount === "0") {
          amount = "1";
        }
        
        // Validate requested amount doesn't exceed balance
        const requestedAmount = parseInt(amount);
        const balance = await new ethers.Contract(
          nft.contractAddress,
          ['function balanceOf(address account, uint256 id) view returns (uint256)'],
          signer
        ).balanceOf(userAddress, nft.tokenId);
        
        if (requestedAmount > parseInt(balance.toString())) {
          throw new Error(`❌ Insufficient balance. You have ${balance} but trying to trade ${requestedAmount}`);
        }
      }
      
      return {
        contractAddress: nft.contractAddress,
        tokenId: nft.tokenId,
        amount: amount,
        standard: standard
      };
    }));
    
    requestedNFTs = await Promise.all(params.counterpartyNFTs.map(async (nft) => {
      let standard = nft.standard;
      let amount = nft.amount || "1";
      
      console.log(`\n🔍 Processing requested NFT: ${nft.contractAddress}:${nft.tokenId}`);
      
      // Auto-detect token standard if not provided
      if (standard === undefined) {
        try {
          standard = await contract.detectTokenStandard(nft.contractAddress);
          console.log(`✅ Detected token standard: ${standard === 0 ? 'ERC721' : 'ERC1155'}`);
        } catch (error) {
          console.warn(`⚠️ Could not detect token standard, defaulting to ERC721`);
          standard = 0; // Default to ERC721
        }
      }

      // Basic validation for requested NFTs (no approval needed)
      try {
        const code = await optimalProvider.getCode(nft.contractAddress);
        if (code === '0x') {
          throw new Error(`❌ Requested NFT contract does not exist: ${nft.contractAddress}`);
        }
        console.log(`✅ Requested NFT contract exists`);
      } catch (error) {
        throw new Error(`❌ Invalid requested NFT contract: ${error.message}`);
      }
      
      return {
        contractAddress: nft.contractAddress,
        tokenId: nft.tokenId,
        amount: amount,
        standard: standard
      };
    }));

    console.log('\n🎯 ALL APPROVALS VERIFIED - PROCEEDING WITH TRADE CREATION');
    console.log('=========================================================');

    console.log('Creating trade with params:', {
      counterparty: params.counterpartyAddress,
      offeredNFTs: {
        count: offeredNFTs.length,
        details: offeredNFTs.map(nft => ({
          contract: nft.contractAddress,
          tokenId: nft.tokenId,
          amount: nft.amount,
          standard: nft.standard === 0 ? 'ERC721' : 'ERC1155'
        }))
      },
      requestedNFTs: {
        count: requestedNFTs.length,
        details: requestedNFTs.map(nft => ({
          contract: nft.contractAddress,
          tokenId: nft.tokenId,
          amount: nft.amount,
          standard: nft.standard === 0 ? 'ERC721' : 'ERC1155'
        }))
      },
      offeredETH: params.userMonadAmount,
      requestedETH: params.counterpartyMonadAmount,
      totalValue: ethers.formatEther(totalValue),
      message: params.message
    });

    // Call the smart contract with FHEV7 contract signature (V7 compatible)
    console.log(`\n📡 Calling createTrade on FHEV7 contract...`);
    const tx = await contract.createTrade(
      params.counterpartyAddress,
      offeredNFTs,
      requestedNFTs,
      ethers.parseEther(params.counterpartyMonadAmount), // requestedETH (will be encrypted internally)
      params.message,
      { value: totalValue } // offeredETH comes from msg.value - tradeFee (will be encrypted internally)
    );

    console.log('✅ Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed:', receipt);

    // Debug: Log all events found
    console.log('🔍 All transaction logs:', receipt.logs.length);
    receipt.logs.forEach((log: any, index: number) => {
      console.log(`Log ${index}:`, {
        address: log.address,
        topics: log.topics,
        data: log.data
      });
      
      try {
        const decoded = contract.interface.parseLog(log);
        console.log(`✅ Decoded log ${index}:`, {
          name: decoded?.name,
          args: decoded?.args
        });
      } catch (error) {
        console.log(`❌ Failed to decode log ${index}:`, error.message);
      }
    });

    // Extract trade ID from logs
    const tradeCreatedEvent = receipt.logs.find((log: any) => {
      try {
        const decoded = contract.interface.parseLog(log);
        console.log('🔍 Checking event:', decoded?.name);
        return decoded?.name === 'TradeCreated';
      } catch {
        return false;
      }
    });

    if (tradeCreatedEvent) {
      const decoded = contract.interface.parseLog(tradeCreatedEvent);
      const tradeId = decoded?.args[0].toString();
      console.log('🎉 Trade created with ID:', tradeId);
      return tradeId;
    }

    // Enhanced error with debug info
    console.log('❌ TradeCreated event not found in logs');
    console.log('Expected contract address:', CONTRACT_CONFIG.address);
    console.log('Transaction logs count:', receipt.logs.length);
    
    // Fallback: Try to extract trade count or generate temporary ID
    console.log('🔄 Attempting fallback trade ID generation...');
    try {
      const tradeCount = await contract.tradeCount();
      console.log('📊 Current trade count from contract:', tradeCount.toString());
      return tradeCount.toString();
    } catch (fallbackError) {
      console.log('❌ Fallback failed:', fallbackError);
    }

    throw new Error(
      `Trade creation event not found in transaction logs. ` +
      `Transaction was successful (${tx.hash}) but could not extract trade ID. ` +
      `Found ${receipt.logs.length} logs total.`
    );

  } catch (error) {
    console.error('❌ Error creating trade:', error);
    
    // Enhanced error handling with specific approval guidance
    if (error.message?.includes('not approved for trading')) {
      // Re-throw approval errors with full context
      throw error;
    }
    
    if (error.message?.includes('missing revert data') || error.message?.includes('CALL_EXCEPTION')) {
      // Check if any NFTs were involved that might need approval
      if (offeredNFTs.length > 0) {
        const nftDetails = offeredNFTs.map(nft => 
          `${nft.contractAddress}:${nft.tokenId} (${nft.standard === 0 ? 'ERC721' : 'ERC1155'})`
        ).join(', ');
        
        throw new Error(
          `❌ Transaction failed with "missing revert data" error!\n\n` +
          `This usually means NFT approval is required.\n\n` +
          `NFTs involved: ${nftDetails}\n\n` +
          `💡 SOLUTION:\n` +
          `1. Make sure all your offered NFTs are approved for the trading contract\n` +
          `2. For ERC721: Call approve() or setApprovalForAll()\n` +
          `3. For ERC1155: Call setApprovalForAll()\n` +
          `4. Trading Contract: ${CONTRACT_CONFIG.address}\n\n` +
          `Then try creating the trade again.`
        );
      }
    }
    
    throw error;
  }
}

// Accept a trade with automatic approval handling
export async function acceptTrade(tradeId: string, walletClient: any, progressCallback?: (message: string) => void): Promise<string> {
  const signer = await walletClientToSigner(walletClient);
  const contract = getContract(signer);
  if (!contract) throw new Error('Contract not available');

  const updateProgress = (message: string) => {
    console.log(message);
    if (progressCallback) progressCallback(message);
  };

  try {
    updateProgress('Starting trade acceptance with auto-approval...');
    
    // Step 1: Check and handle NFT approvals
    updateProgress('Checking required NFT approvals...');
    const requiredApprovals = await getRequiredApprovalsForTrade(tradeId, walletClient, true);
    
    if (requiredApprovals.length > 0) {
      updateProgress(`Found ${requiredApprovals.length} NFTs requiring approval`);
      
      // Auto-approve each required NFT
      for (let i = 0; i < requiredApprovals.length; i++) {
        const approval = requiredApprovals[i];
        updateProgress(`Approving ${approval.standard} NFT (${i + 1}/${requiredApprovals.length}): ${approval.contractAddress.slice(0, 6)}...${approval.contractAddress.slice(-4)}`);
        
        if (approval.standard === 'ERC721') {
          await approveERC721ForTrading(approval.contractAddress, approval.tokenId, walletClient);
        } else {
          await approveERC1155ForTrading(approval.contractAddress, walletClient);
        }
        
        updateProgress(`Approved ${approval.standard} NFT (${i + 1}/${requiredApprovals.length})`);
      }
      
      updateProgress('All NFT approvals completed');
    } else {
      updateProgress('No NFT approvals required');
    }

    // Step 2: Execute the trade
    updateProgress('Executing trade transaction...');
    
    // FHEV7 contract only requires the trade fee (ETH amounts are encrypted and handled internally)
    let tradeFee: bigint;
    try {
      tradeFee = await contract.tradeFee();
      console.log(`💰 Dynamic trade fee: ${ethers.formatEther(tradeFee)} ETH`);
    } catch (error) {
      console.warn('⚠️ Could not fetch dynamic fee, using default 0.01 ETH');
      tradeFee = ethers.parseEther("0.01"); // Fallback to hardcoded fee
    }

    console.log('Accepting trade:', {
      tradeId,
      tradeFee: ethers.formatEther(tradeFee),
      note: 'ETH amounts are encrypted and verified by contract'
    });

    const tx = await contract.acceptTrade(tradeId, { value: tradeFee });
    updateProgress('Transaction sent, waiting for confirmation...');
    console.log('Accept transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    updateProgress('Trade accepted successfully');
    
    return receipt.hash;
  } catch (error) {
    console.error('Error accepting trade:', error);
    
    // Enhanced error handling for common issues
    if (error.message?.includes('missing revert data') || error.message?.includes('CALL_EXCEPTION')) {
      throw new Error(
        `Trade acceptance failed!\n\n` +
        `This usually indicates an NFT approval issue or insufficient balance.\n\n` +
        `Please ensure:\n` +
        `1. You own all required NFTs\n` +
        `2. All NFTs are properly approved for trading\n` +
        `3. You have sufficient MONAD balance\n\n` +
        `Original error: ${error.message}`
      );
    }
    
    throw error;
  }
}

// Cancel a trade
export async function cancelTrade(tradeId: string, walletClient: any): Promise<string> {
  const signer = await walletClientToSigner(walletClient);
  const contract = getContract(signer);
  if (!contract) throw new Error('Contract not available');

  try {
    console.log('Cancelling trade:', tradeId);
    
    const tx = await contract.cancelTrade(tradeId);
    console.log('Cancel transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('Trade cancelled successfully');
    
    return receipt.hash;
  } catch (error) {
    console.error('Error cancelling trade:', error);
    throw error;
  }
}

// Get trade details from blockchain
export async function getTrade(tradeId: string): Promise<TradeData | null> {
  // Use HyperRPC for getLogs (much faster for event queries!)
  const contract = optimalProvider.getContract('eth_getLogs');
  
  try {
    console.log(`Fetching trade ${tradeId} from blockchain...`);
    
    const trade = await contract.trades(tradeId);
    
    if (!trade || trade.creator === ethers.ZeroAddress) {
      console.log(`Trade ${tradeId} not found or invalid`);
      return null;
    }

    // Convert BigInt values to strings for JSON serialization
    const tradeData: TradeData = {
      id: tradeId,
      creator: trade.creator,
      responder: trade.responder,
      creatorAssets: trade.creatorAssets.map((asset: any) => ({
        contractAddress: asset.contractAddress,
        tokenId: asset.tokenId.toString(),
        amount: asset.amount.toString(),
        standard: asset.standard
      })),
      responderAssets: trade.responderAssets.map((asset: any) => ({
        contractAddress: asset.contractAddress,
        tokenId: asset.tokenId.toString(),
        amount: asset.amount.toString(),
        standard: asset.standard
      })),
      status: Number(trade.status),
      createdAt: Number(trade.createdAt),
      
      acceptedAt: trade.acceptedAt ? Number(trade.acceptedAt) : undefined,
      cancelledAt: trade.cancelledAt ? Number(trade.cancelledAt) : undefined
    };

    console.log('✅ Trade fetched successfully:', tradeData);
    return tradeData;
  } catch (error) {
    console.error('❌ Error fetching trade:', error);
    return null;
  }
}

// ERC1155 Approval function (legacy - kept for compatibility)
// Note: Enhanced version available below with better logging and error handling

// Check if ERC1155 contract is approved for trading
export async function isERC1155ApprovedForTrading(contractAddress: string, userAddress: string): Promise<boolean> {
  // Use standard RPC for contract calls (eth_call is not in HyperRPC supported methods)
  const provider = optimalProvider.getProvider();
  
  const erc1155Abi = [
    'function isApprovedForAll(address owner, address operator) view returns (bool)'
  ];
  
  try {
    // First validate that the contract exists
    const code = await optimalProvider.getCode(contractAddress);
    if (code === '0x') {
      console.warn(`⚠️ Contract does not exist at address: ${contractAddress}`);
      return false;
    }
    
    const contract = new ethers.Contract(contractAddress, erc1155Abi, provider);
    
    console.log(`🔍 Checking isApprovedForAll for ${contractAddress}`);
    console.log(`  - Owner: ${userAddress}`);
    console.log(`  - Operator: ${CONTRACT_CONFIG.address}`);
    
    const isApproved = await contract.isApprovedForAll(userAddress, CONTRACT_CONFIG.address);
    console.log(`  - Result: ${isApproved}`);
    
    // Ensure we return a boolean
    return Boolean(isApproved);
  } catch (error) {
    console.error(`❌ Error checking approval for ${contractAddress}:`, error);
    console.log(`  - Error type: ${error.code || 'unknown'}`);
    console.log(`  - Error message: ${error.message}`);
    
    // Be conservative - if we can't check, assume not approved
    return false;
  }
}

// Utility functions

// Check if user can perform action on trade
export function canUserAcceptTrade(trade: TradeData, userAddress: string): boolean {
  return (
    trade.isActive &&
    !trade.isAccepted &&
    !trade.isCancelled &&
    trade.counterparty.toLowerCase() === userAddress.toLowerCase()
  );
}

export function canUserCancelTrade(trade: TradeData, userAddress: string): boolean {
  return (
    trade.isActive &&
    !trade.isAccepted &&
    !trade.isCancelled &&
    trade.creator.toLowerCase() === userAddress.toLowerCase()
  );
}

// Decline a trade (V5 contract function)
export async function declineTrade(tradeId: string, walletClient: any): Promise<string> {
  const signer = await walletClientToSigner(walletClient);
  const contract = getContract(signer);
  if (!contract) throw new Error('Contract not available');

  try {
    console.log('Declining trade:', tradeId);
    
    const tx = await contract.declineTrade(BigInt(tradeId));
    console.log('Decline transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('Trade declined successfully');
    
    return receipt.hash;
  } catch (error) {
    console.error('Error declining trade:', error);
    throw error;
  }
}



// Diagnostic function to identify why acceptTrade might fail
export async function diagnoseTradeAcceptance(tradeId: string, walletClient: any): Promise<{
  canAccept: boolean;
  issues: string[];
}> {
  const signer = await walletClientToSigner(walletClient);
  const contract = getContract(signer);
  const userAddress = await signer.getAddress();
  const issues: string[] = [];

  if (!contract) {
    issues.push('Contract not available');
    return { canAccept: false, issues };
  }

  try {
    // Check if trade exists (FHEV7 returns: id, creator, counterparty, expiryTime, status, message, createdAt)
    const [id, creator, counterparty, expiryTime, status, message, createdAt] = await contract.getTrade(tradeId);
    
    if (!creator || creator === ethers.ZeroAddress) {
      issues.push('Trade does not exist');
      return { canAccept: false, issues };
    }

    // Check if user is the counterparty
    if (counterparty.toLowerCase() !== userAddress.toLowerCase()) {
      issues.push(`You are not the counterparty for this trade. Expected: ${counterparty}, Got: ${userAddress}`);
    }

    // Check trade status (FHEV7 enum: 0=Pending, 1=Accepted, 2=Cancelled, 3=Expired, 4=Declined)
    if (status === 1) {
      issues.push('Trade has already been accepted');
    } else if (status === 2) {
      issues.push('Trade has been cancelled');
    } else if (status === 3) {
      issues.push('Trade has expired');
    } else if (status === 4) {
      issues.push('Trade has been declined');
    }

    // Check user's ETH balance (for trade fee only - ETH amounts are encrypted)
    const userBalance = await signer.provider.getBalance(userAddress);
    
    // Get dynamic trade fee
    let tradeFee: bigint;
    try {
      tradeFee = await contract.tradeFee();
    } catch (error) {
      tradeFee = ethers.parseEther("0.01"); // Fallback to hardcoded fee
    }
    
    const totalRequired = tradeFee; // FHEV7 only needs fee, ETH amounts are encrypted
    
    if (userBalance < totalRequired) {
      issues.push(`Insufficient ETH balance. Required: ${ethers.formatEther(totalRequired)}, Available: ${ethers.formatEther(userBalance)}`);
    }

    // Check NFT ownership and approvals for requested NFTs
    try {
      const requestedNFTs = await contract.getRequestedNFTs(tradeId);
      
      for (let i = 0; i < requestedNFTs.length; i++) {
        const nft = requestedNFTs[i];
        const contractAddress = nft.contractAddress;
        const tokenId = nft.tokenId;
        const amount = nft.amount;
        const standard = nft.standard;

        if (standard === 0) { // ERC721
          const erc721Abi = [
            'function ownerOf(uint256 tokenId) view returns (address)',
            'function getApproved(uint256 tokenId) view returns (address)',
            'function isApprovedForAll(address owner, address operator) view returns (bool)'
          ];
          
          const erc721Contract = new ethers.Contract(contractAddress, erc721Abi, signer);
          
          try {
            const owner = await erc721Contract.ownerOf(tokenId);
            if (owner.toLowerCase() !== userAddress.toLowerCase()) {
              issues.push(`You don't own ERC721 token ${tokenId} from ${contractAddress}`);
              continue;
            }
            
            const approved = await erc721Contract.getApproved(tokenId);
            const isApprovedForAll = await erc721Contract.isApprovedForAll(userAddress, CONTRACT_CONFIG.address);
            
            if (approved.toLowerCase() !== CONTRACT_CONFIG.address.toLowerCase() && !isApprovedForAll) {
              issues.push(`ERC721 token ${tokenId} from ${contractAddress} is not approved for trading`);
            }
          } catch (nftError) {
            issues.push(`Error checking ERC721 token ${tokenId}: ${nftError.message}`);
          }
          
        } else if (standard === 1) { // ERC1155
          const erc1155Abi = [
            'function balanceOf(address account, uint256 id) view returns (uint256)',
            'function isApprovedForAll(address owner, address operator) view returns (bool)'
          ];
          
          const erc1155Contract = new ethers.Contract(contractAddress, erc1155Abi, signer);
          
          try {
            const balance = await erc1155Contract.balanceOf(userAddress, tokenId);
            if (balance < amount) {
              issues.push(`Insufficient ERC1155 balance. Need ${amount} of token ${tokenId}, but you have ${balance}`);
              continue;
            }
            
            const isApprovedForAll = await erc1155Contract.isApprovedForAll(userAddress, CONTRACT_CONFIG.address);
            if (!isApprovedForAll) {
              issues.push(`ERC1155 contract ${contractAddress} is not approved for trading. Please approve it first.`);
            }
          } catch (nftError) {
            if (nftError.message?.includes('could not decode result data')) {
              issues.push(`ERC1155 contract ${contractAddress} doesn't properly implement ERC1155 interface`);
            } else {
              issues.push(`Error checking ERC1155 token ${tokenId}: ${nftError.message}`);
            }
          }
        }
      }
    } catch (nftCheckError) {
      console.warn('Could not check NFT requirements:', nftCheckError.message);
      // Don't add this as an issue since it might be a contract function availability issue
    }

    return {
      canAccept: issues.length === 0,
      issues
    };

  } catch (error) {
    console.error('Error in trade diagnostics:', error);
    issues.push(`Diagnostic error: ${error.message}`);
    return { canAccept: false, issues };
  }
}

// Approve NFTs for trade acceptance
export async function approveNFTsForTradeAcceptance(tradeId: string, walletClient: any): Promise<void> {
  const signer = await walletClientToSigner(walletClient);
  const contract = getContract(signer);
  if (!contract) throw new Error('Contract not available');

  try {
    // Get requested NFTs that need approval
    const requestedNFTs = await contract.getRequestedNFTs(tradeId);
    
    for (let i = 0; i < requestedNFTs.length; i++) {
      const nft = requestedNFTs[i];
      const contractAddress = nft.contractAddress;
      const tokenId = nft.tokenId;
      const standard = nft.standard;

      if (standard === 0) { // ERC721
        await approveERC721ForTrading(contractAddress, tokenId.toString(), walletClient);
      } else if (standard === 1) { // ERC1155
        await approveERC1155ForTrading(contractAddress, walletClient);
      }
    }
    
    console.log('✅ All NFT approvals completed');
  } catch (error) {
    console.error('❌ NFT approval failed:', error);
    throw error;
  }
}

// Helper function to approve ERC721 NFT for trading
export async function approveERC721ForTrading(contractAddress: string, tokenId: string, walletClient: any): Promise<void> {
  const signer = await walletClientToSigner(walletClient);
  
  console.log('🔓 Approving ERC721 NFT for trading...');
  console.log(`Contract: ${contractAddress}`);
  console.log(`Token ID: ${tokenId}`);
  console.log(`Trading Contract: ${CONTRACT_CONFIG.address}`);
  
  const erc721Contract = new ethers.Contract(
    contractAddress,
    [
      'function approve(address to, uint256 tokenId)',
      'function setApprovalForAll(address operator, bool approved)',
      'function getApproved(uint256 tokenId) view returns (address)',
      'function isApprovedForAll(address owner, address operator) view returns (bool)'
    ],
    signer
  );
  
  try {
    // Check current approval status
    const userAddress = await signer.getAddress();
    const currentApproved = await erc721Contract.getApproved(tokenId);
    const isApprovedForAll = await erc721Contract.isApprovedForAll(userAddress, CONTRACT_CONFIG.address);
    
    if (currentApproved.toLowerCase() === CONTRACT_CONFIG.address.toLowerCase() || isApprovedForAll) {
      console.log('✅ NFT is already approved');
      return;
    }
    
    // Use setApprovalForAll for better UX (approve all tokens at once)
    console.log('📝 Calling setApprovalForAll...');
    const tx = await erc721Contract.setApprovalForAll(CONTRACT_CONFIG.address, true);
    console.log('⏳ Transaction sent:', tx.hash);
    
    await tx.wait();
    console.log('✅ ERC721 approval successful!');
    
  } catch (error) {
    console.error('❌ Failed to approve ERC721:', error);
    throw new Error(`Failed to approve ERC721 NFT: ${error.message}`);
  }
}

// Helper function to approve ERC1155 NFT for trading  
export async function approveERC1155ForTrading(contractAddress: string, walletClient: any): Promise<void> {
  console.log(`🔓 Approving ERC1155 collection: ${contractAddress}`);
  
  const signer = await walletClientToSigner(walletClient);
  
  // First, validate that the contract exists and has the required functions
  try {
    const code = await optimalProvider.getCode(contractAddress);
    if (code === '0x') {
      throw new Error(`Contract does not exist at address: ${contractAddress}`);
    }
  } catch (error) {
    console.error('❌ Contract validation failed:', error);
    throw new Error(`Invalid contract address: ${contractAddress}`);
  }

  const erc1155Contract = new ethers.Contract(
    contractAddress,
    [
      'function setApprovalForAll(address operator, bool approved)',
      'function isApprovedForAll(address account, address operator) view returns (bool)'
    ],
    signer
  );
  
  try {
    // Check current approval status
    const userAddress = await signer.getAddress();
    
    let isApproved = false;
    try {
      isApproved = await erc1155Contract.isApprovedForAll(userAddress, CONTRACT_CONFIG.address);
    } catch (approvalCheckError) {
      console.warn('⚠️ Could not check approval status, proceeding with approval attempt:', approvalCheckError.message);
      // Continue with approval attempt even if we can't check current status
    }
    
    if (isApproved) {
      console.log('✅ ERC1155 collection is already approved');
      return;
    }
    
    console.log('📝 Calling setApprovalForAll...');
    const tx = await erc1155Contract.setApprovalForAll(CONTRACT_CONFIG.address, true);
    console.log('⏳ Transaction sent:', tx.hash);
    
    await tx.wait();
    console.log('✅ ERC1155 approval successful!');
    
  } catch (error) {
    console.error('❌ Failed to approve ERC1155:', error);
    
    // Provide more helpful error messages
    if (error.message?.includes('could not decode result data')) {
      throw new Error(`This contract doesn't properly implement ERC1155 interface. Contract: ${contractAddress}`);
    } else if (error.message?.includes('user rejected')) {
      throw new Error('Transaction was rejected by user');
    } else if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient funds for gas fees');
    } else {
      throw new Error(`Failed to approve ERC1155 collection: ${error.message}`);
    }
  }
}

// Batch approval function for multiple NFTs
export async function batchApproveNFTsForTrading(
  nfts: Array<{ contractAddress: string; tokenId: string; standard: 'ERC721' | 'ERC1155' }>,
  walletClient: any,
  progressCallback?: (message: string, current: number, total: number) => void
): Promise<void> {
  console.log(`🔓 Starting batch approval for ${nfts.length} NFTs...`);
  
  const uniqueCollections = new Map<string, 'ERC721' | 'ERC1155'>();
  
  // Group by collection to avoid duplicate approvals
  nfts.forEach(nft => {
    uniqueCollections.set(nft.contractAddress, nft.standard);
  });
  
  console.log(`📦 Found ${uniqueCollections.size} unique collections to approve`);
  
  let current = 0;
  const total = uniqueCollections.size;
  
  for (const [contractAddress, standard] of uniqueCollections) {
    current++;
    
    const message = `Approving ${standard} collection ${current}/${total}: ${contractAddress}`;
    console.log(message);
    
    if (progressCallback) {
      progressCallback(message, current, total);
    }
    
    try {
      if (standard === 'ERC721') {
        // For ERC721, we just need setApprovalForAll once per collection
        const signer = await walletClientToSigner(walletClient);
        const erc721Contract = new ethers.Contract(
          contractAddress,
          ['function setApprovalForAll(address operator, bool approved)'],
          signer
        );
        const tx = await erc721Contract.setApprovalForAll(CONTRACT_CONFIG.address, true);
        await tx.wait();
      } else {
        await approveERC1155ForTrading(contractAddress, walletClient);
      }
      
      console.log(`✅ Approved ${standard} collection: ${contractAddress}`);
      
    } catch (error) {
      console.error(`❌ Failed to approve ${standard} collection ${contractAddress}:`, error);
      throw new Error(`Failed to approve ${standard} collection ${contractAddress}: ${error.message}`);
    }
  }
  
  console.log('🎉 All NFT collections approved successfully!');
}

// Function to check if an NFT is approved for trading
export async function isNFTApprovedForTrading(
  contractAddress: string,
  tokenId: string,
  userAddress: string,
  standard: 'ERC721' | 'ERC1155'
): Promise<boolean> {
  // Use standard RPC for contract calls
  const provider = optimalProvider.getProvider();
  
  try {
    if (standard === 'ERC721') {
      const erc721Contract = new ethers.Contract(
        contractAddress,
        [
          'function getApproved(uint256 tokenId) view returns (address)',
          'function isApprovedForAll(address owner, address operator) view returns (bool)'
        ],
        provider
      );
      
      const approvedAddress = await erc721Contract.getApproved(tokenId);
      const isApprovedForAll = await erc721Contract.isApprovedForAll(userAddress, CONTRACT_CONFIG.address);
      
      return (
        approvedAddress.toLowerCase() === CONTRACT_CONFIG.address.toLowerCase() ||
        isApprovedForAll
      );
      
    } else { // ERC1155
      // First validate that the contract exists
      const code = await optimalProvider.getCode(contractAddress);
      if (code === '0x') {
        console.warn(`⚠️ Contract does not exist at address: ${contractAddress}`);
        return false;
      }
      
      const erc1155Contract = new ethers.Contract(
        contractAddress,
        ['function isApprovedForAll(address account, address operator) view returns (bool)'],
        provider
      );
      
      try {
        return await erc1155Contract.isApprovedForAll(userAddress, CONTRACT_CONFIG.address);
      } catch (approvalError) {
        if (approvalError.message?.includes('could not decode result data')) {
          console.warn(`⚠️ Contract ${contractAddress} doesn't properly implement ERC1155 interface`);
          return false;
        }
        throw approvalError; // Re-throw other errors
      }
    }
    
  } catch (error) {
    console.error('Error checking NFT approval:', error);
    return false;
  }
}

// Legacy function aliases for backward compatibility
export async function checkNFTApproval(
  contractAddress: string,
  userAddress: string,
  standard: 'ERC721' | 'ERC1155'
): Promise<boolean> {
  // Use the new function with a dummy tokenId for ERC1155 (not used in ERC1155 check)
  return isNFTApprovedForTrading(contractAddress, '0', userAddress, standard);
}

// Legacy function alias for backward compatibility
export async function approveNFTForTrading(
  contractAddress: string,
  standard: 'ERC721' | 'ERC1155',
  walletClient: any
): Promise<void> {
  if (standard === 'ERC721') {
    // For ERC721, we'll use setApprovalForAll which covers all tokens
    const signer = await walletClientToSigner(walletClient);
    const erc721Contract = new ethers.Contract(
      contractAddress,
      ['function setApprovalForAll(address operator, bool approved)'],
      signer
    );
    const tx = await erc721Contract.setApprovalForAll(CONTRACT_CONFIG.address, true);
    await tx.wait();
  } else {
    await approveERC1155ForTrading(contractAddress, walletClient);
  }
}

// Get required approvals for a trade (for manual approval interface)
export async function getRequiredApprovalsForTrade(
  tradeId: string,
  walletClient: any,
  isAcceptance: boolean = true
): Promise<Array<{
  contractAddress: string;
  tokenId: string;
  amount: string;
  standard: 'ERC721' | 'ERC1155';
}>> {
  try {
    const signer = await walletClientToSigner(walletClient);
    const userAddress = await signer.getAddress();
    const provider = new ethers.JsonRpcProvider(ACTIVE_NETWORK.rpcUrl);
    const contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_CONFIG.abi, provider);
    
    // For acceptance, we need approvals for requested NFTs
    // For creation, we need approvals for offered NFTs
    const nfts = isAcceptance 
      ? await contract.getRequestedNFTs(tradeId)
      : await contract.getOfferedNFTs(tradeId);
    
    // Check which NFTs actually need approval
    const unapprovedNFTs = [];
    
    for (const nft of nfts) {
      const standard = nft.standard === 0 ? 'ERC721' : 'ERC1155';
      const isApproved = await isNFTApprovedForTrading(
        nft.contractAddress,
        nft.tokenId.toString(),
        userAddress,
        standard as 'ERC721' | 'ERC1155'
      );
      
      if (!isApproved) {
        unapprovedNFTs.push({
          contractAddress: nft.contractAddress,
          tokenId: nft.tokenId.toString(),
          amount: nft.amount.toString(),
          standard: standard as 'ERC721' | 'ERC1155',
        });
      }
    }
    
    return unapprovedNFTs;
  } catch (error) {
    console.error('Error getting required approvals:', error);
    return [];
  }
}

export async function getTrades(
  filters: {
    creator?: string;
    responder?: string;
    status?: number[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ trades: TradeData[]; total: number; hasMore: boolean }> {
  try {
    // Use HyperRPC for getLogs - this will be much faster!
    const provider = optimalProvider.getProvider('eth_getLogs');
    const contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_CONFIG.abi, provider);
    
    // Build filter for TradeCreated events
    const filter = contract.filters.TradeCreated();
    
    // Get events using HyperRPC (5x faster!)
    console.log('🚀 Fetching trade events with HyperRPC...');
    const events = await contract.queryFilter(filter, -10000); // Last 10k blocks
    
    console.log(`📊 Found ${events.length} total trade events`);
    
    // Process events and apply filters
    let trades: TradeData[] = [];
    
    for (const event of events.reverse()) { // Most recent first
      try {
        // Type cast to EventLog to access args property
        const eventLog = event as ethers.EventLog;
        const tradeId = eventLog.args?.[0]?.toString();
        if (!tradeId) continue;
        
        const trade = await getTrade(tradeId);
        if (!trade) continue;
        
        // Apply filters
        if (filters.creator && trade.creator.toLowerCase() !== filters.creator.toLowerCase()) continue;
        if (filters.responder && trade.responder !== ethers.ZeroAddress && 
            trade.responder.toLowerCase() !== filters.responder.toLowerCase()) continue;
        if (filters.status && !filters.status.includes(trade.status)) continue;
        
        trades.push(trade);
        
        // Apply limit
        if (filters.limit && trades.length >= filters.limit) break;
      } catch (error) {
        console.warn(`Failed to process trade event:`, error);
        continue;
      }
    }
    
    // Apply offset
    const offset = filters.offset || 0;
    const paginatedTrades = trades.slice(offset, offset + (filters.limit || trades.length));
    
    console.log(`✅ Processed ${paginatedTrades.length} trades with filters applied`);
    
    return {
      trades: paginatedTrades,
      total: trades.length,
      hasMore: offset + paginatedTrades.length < trades.length
    };
    
  } catch (error) {
    console.error('❌ Error fetching trades:', error);
    return { trades: [], total: 0, hasMore: false };
  }
}

export async function claimAssets(tradeId: string | number, walletClient: any): Promise<string> {
  if (!walletClient) throw new Error('Wallet client not connected');

  const signer = await walletClientToSigner(walletClient);
  const contract = getContract(signer);
  if (!contract) throw new Error('Contract not available');

  // Ensure the contract actually exposes claimAssets(uint256)
  const signature = 'claimAssets(uint256)';
  if (!(signature in (contract.interface as any).functions)) {
    throw new Error('The connected trading contract does not support manual asset claiming. Assets are automatically returned on decline / cancel / expire.');
  }

  console.log('📡 Calling claimAssets on contract for trade', tradeId);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - dynamic function access verified above
  const tx = await contract.claimAssets(BigInt(tradeId));
  console.log('✅ Transaction sent:', tx.hash);
  const receipt = await tx.wait();
  console.log('✅ Transaction confirmed');
  return receipt.hash;
}