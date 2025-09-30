import { VERIFIED_NFTS, isERC1155NFT } from '../app/config/verifiedNFTs';
import { ethers } from 'ethers';
import { getOptimalProvider, ACTIVE_NETWORK } from '@/lib/contracts';

// Toggle verbose logging via env (default: off)
const DEBUG_LOGS = process.env.NEXT_PUBLIC_DEBUG_LOGS === '1';
const debug = (...args: any[]) => {
  if (DEBUG_LOGS) console.log(...args);
};

// Helper functions to use server-side API routes instead of direct Magic Eden calls
async function fetchUserCollections(walletAddress: string, offset: number = 0, limit: number = 100) {
  const response = await fetch(
    `/api/user-collections?wallet=${walletAddress}&includeTopBid=false&includeLiquidCount=false&offset=${offset}&limit=${limit}`
  );
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

async function fetchUserTokens(walletAddress: string, collection: string, offset: number = 0, limit: number = 20) {
  const response = await fetch(
    `/api/user-tokens?wallet=${walletAddress}&collection=${collection}&offset=${offset}&limit=${limit}`
  );
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

export interface VerifiedNFTHolding {
  collectionId: string;
  collectionName: string;
  collectionImage?: string;
  collectionFloorPrice?: number;
  tokens: Array<{
    tokenId: string;
    name: string;
    image: string;
    floorPrice: number;
    tokenCount: string;
  }>;
}
function resolveIpfsUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`;
  }
  return url;
}

async function fetchImageFromTokenURI(contractAddress: string, tokenId: string): Promise<string> {
  try {
    const tokenURI = await getTokenURI(contractAddress, tokenId);
    if (!tokenURI) return '';

    // Handle base64-encoded JSON
    if (tokenURI.startsWith('data:')) {
      const base64 = tokenURI.split(',')[1] || '';
      const json = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
      return resolveIpfsUrl(json.image || json.image_url || '');
    }

    // Handle HTTP/IPFS URLs
    const metadataUrl = resolveIpfsUrl(tokenURI);
    const res = await fetch(metadataUrl);
    if (!res.ok) return '';
    const meta = await res.json();
    return resolveIpfsUrl(meta.image || meta.image_url || '');
  } catch (err) {
    console.warn(`Could not resolve image via tokenURI for ${contractAddress}:${tokenId}`, err);
    return '';
  }
}


// Enhanced ERC1155 balance checking
async function getAccurateERC1155Balance(
  contractAddress: string, 
  tokenId: string, 
  userAddress: string
): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(ACTIVE_NETWORK.rpcUrl);
    const contract = new ethers.Contract(
      contractAddress,
      ['function balanceOf(address account, uint256 id) view returns (uint256)'],
      provider
    );
    
    const balance = await contract.balanceOf(userAddress, tokenId);
    return balance.toString();
  } catch (error) {
    console.error(`❌ Failed to get direct balance for ${contractAddress}:${tokenId}:`, error);
    return '0';
  }
}

/**
 * CORRECT 2-STEP IMPLEMENTATION:
 * Step 1: Get all user collections, filter by verified list
 * Step 2: For each verified collection, get individual tokens
 */
export async function getVerifiedNFTsUserHolds(walletAddress: string): Promise<VerifiedNFTHolding[]> {
  if (!walletAddress) {
    debug('❌ No wallet address provided');
    return [];
  }

  debug(`🔍 Starting 2-step verification process for wallet: ${walletAddress}`);
  const userHoldings: VerifiedNFTHolding[] = [];
  
  try {
    // STEP 1: Get ALL user collections in ONE API call
    debug('📋 Step 1: Getting all user collections...');
    const allUserCollections = await fetchUserCollections(walletAddress, 0, 100); // Get up to 100 collections

    if (!allUserCollections.collections || allUserCollections.collections.length === 0) {
      debug('📭 User has no NFT collections at all');
      return [];
    }

    debug(`✅ Found ${allUserCollections.collections.length} total collections`);

    // STEP 1.5: Filter collections by verified list
    debug('🔍 Step 1.5: Filtering by verified collections...');
    const verifiedCollectionsOwned = allUserCollections.collections.filter((collection: any) => {
      const contractAddress = collection.collection?.primaryContract || collection.collection?.id;
      const isVerified = VERIFIED_NFTS.some(nft => 
        nft.address.toLowerCase() === contractAddress?.toLowerCase()
      );
      
      if (isVerified) {
        debug(`✅ VERIFIED: ${collection.collection?.name} (${contractAddress})`);
      }
      
      return isVerified;
    });

    debug(`🎯 Found ${verifiedCollectionsOwned.length} verified collections owned`);

    if (verifiedCollectionsOwned.length === 0) {
      debug('📭 User owns no verified collections');
      return [];
    }

    // STEP 2: For each verified collection, get individual tokens
    debug('🔍 Step 2: Getting tokens for each verified collection...');
    
    for (const collection of verifiedCollectionsOwned) {
      try {
        const contractAddress = collection.collection?.primaryContract || collection.collection?.id;
        const collectionName = collection.collection?.name || 'Unknown Collection';
        
        debug(`🔍 Getting tokens for: ${collectionName} (${contractAddress})`);
        
        // Get tokens for this specific collection
        const tokensResponse = await fetchUserTokens(walletAddress, contractAddress);
        
        if (tokensResponse.tokens && tokensResponse.tokens.length > 0) {
          debug(`✅ Found ${tokensResponse.tokens.length} tokens in ${collectionName}`);
          
          const overrideEntry = VERIFIED_NFTS.find((v) => v.address.toLowerCase() === contractAddress.toLowerCase());
          const mediaOverride = overrideEntry?.mediaOverride || '';
          const logoOverride = overrideEntry?.logoOverride || '';
          const tokenMediaOverride = overrideEntry?.tokenMediaOverride || mediaOverride || '';
          const holding: VerifiedNFTHolding = {
            collectionId: contractAddress,
            collectionName: collectionName,
            collectionImage: logoOverride || collection.collection?.image || mediaOverride || '',
            collectionFloorPrice: collection.collection?.floorAskPrice?.amount?.native || 0,
            tokens: tokensResponse.tokens.map((token: any) => ({
              tokenId: token.tokenId || 'unknown',
              name: token.name || collectionName,
              image: token.image || tokenMediaOverride || collection.collection?.image || '',
              floorPrice: collection.collection?.floorAskPrice?.amount?.native || 0,
              tokenCount: token.ownership?.tokenCount || '1'
            }))
          };
          
          userHoldings.push(holding);
          debug(`✅ Added ${collectionName} with ${tokensResponse.tokens.length} tokens`);

          // Best-effort image enrichment for tokens missing images
          for (const token of holding.tokens) {
            if (!token.image || token.image.trim() === '') {
              const resolved = await fetchImageFromTokenURI(contractAddress, token.tokenId);
              if (resolved) {
                token.image = resolved;
              }
            }
          }
        } else {
          debug(`❌ No tokens found for ${collectionName} (this shouldn't happen)`);
        }
        
      } catch (tokenError) {
        console.error(`❌ Error getting tokens for collection:`, tokenError);
        // Continue with other collections even if one fails
      }
    }

  } catch (error) {
    console.error('❌ Error in 2-step verification process:', error);
    return [];
  }

  debug(`🎯 Final result: User holds verified NFTs in ${userHoldings.length} collections`);
  userHoldings.forEach(holding => {
    debug(`  - ${holding.collectionName}: ${holding.tokens.length} tokens`);
  });
  
  return userHoldings;
}

/**
 * Quick check if user holds any verified NFTs at all
 */
export async function userHoldsAnyVerifiedNFTs(walletAddress: string): Promise<boolean> {
  const holdings = await getVerifiedNFTsUserHolds(walletAddress);
  return holdings.length > 0;
}

export async function getTokenURI(
  contractAddress: string,
  tokenId: string
): Promise<string> {
  try {
    // Use standard RPC for contract calls (eth_call not supported by HyperRPC)
    const provider = new ethers.JsonRpcProvider(ACTIVE_NETWORK.rpcUrl);
    
    const contract = new ethers.Contract(
      contractAddress,
      ['function tokenURI(uint256 tokenId) view returns (string)'],
      provider
    );
    
    const tokenURI = await contract.tokenURI(tokenId);
    return tokenURI;
  } catch (error) {
    console.error(`❌ Failed to get tokenURI for ${contractAddress}:${tokenId}:`, error);
    return '';
  }
}

// Keep the optimized version using the same 2-step flow
export async function getVerifiedNFTsUserHoldsOptimized(
  walletAddress: string, 
  concurrency: number = 3
): Promise<VerifiedNFTHolding[]> {
  // Use the same implementation as the main function for now
  // Can optimize later with parallel token fetching if needed
  return await getVerifiedNFTsUserHolds(walletAddress);
}

// Keep the ultra-conservative version using the same 2-step flow
export async function getVerifiedNFTsUserHoldsUltraConservative(walletAddress: string): Promise<VerifiedNFTHolding[]> {
  // Use the same implementation as the main function
  return await getVerifiedNFTsUserHolds(walletAddress);
}

// Keep the smart version using the same 2-step flow
export async function getVerifiedNFTsUserHoldsSmart(walletAddress: string): Promise<VerifiedNFTHolding[]> {
  // Use the same implementation as the main function
  return await getVerifiedNFTsUserHolds(walletAddress);
}

 