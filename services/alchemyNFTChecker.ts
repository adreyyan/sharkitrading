import { VERIFIED_NFTS } from '@/app/config/verifiedNFTs';
import { fetchWalletNFTs, convertAlchemyNFTToAppNFT, type AlchemyNFT } from './alchemy';

export interface VerifiedNFTToken {
  tokenId: string;
  name: string;
  image: string;
  tokenCount: string;
  floorPrice: number;
}

export interface VerifiedNFTHolding {
  collectionId: string;
  collectionName: string;
  collectionImage?: string;
  collectionFloorPrice?: number;
  tokens: VerifiedNFTToken[];
}

/**
 * Fetch ALL NFTs a user holds using Alchemy API (bypassing verified contract filtering)
 * This fetches every NFT in the wallet, just like on Monad
 */
export async function getVerifiedNFTsUserHoldsAlchemy(walletAddress: string): Promise<VerifiedNFTHolding[]> {
  console.log('🔍 Fetching ALL NFTs using Alchemy for wallet (bypassing verification):', walletAddress);
  
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    console.error('❌ Invalid wallet address provided');
    return [];
  }

  try {
    // Fetch all NFTs for the wallet using Alchemy
    console.log('🌐 Fetching ALL NFTs from Alchemy (no contract filtering)...');
    const alchemyResponse = await fetchWalletNFTs(walletAddress);
    
    if (!alchemyResponse.ownedNfts || alchemyResponse.ownedNfts.length === 0) {
      console.log('📭 No NFTs found for this wallet');
      return [];
    }

    console.log(`📊 Found ${alchemyResponse.ownedNfts.length} total NFTs, creating collections for ALL contracts...`);
    console.log('📋 Raw Alchemy Response:', JSON.stringify(alchemyResponse, null, 2));

    const verifiedHoldings: VerifiedNFTHolding[] = [];
    
    // Group NFTs by contract address
    const nftsByContract: { [contractAddress: string]: AlchemyNFT[] } = {};
    
    alchemyResponse.ownedNfts.forEach(nft => {
      const contractAddress = nft.contract.address.toLowerCase();
      console.log(`🔄 Processing NFT: ${nft.name} from ${contractAddress}`);
      if (!nftsByContract[contractAddress]) {
        nftsByContract[contractAddress] = [];
      }
      nftsByContract[contractAddress].push(nft);
    });

    console.log('📦 NFTs grouped by contract:', Object.keys(nftsByContract).map(addr => `${addr}: ${nftsByContract[addr].length} NFTs`));

    // 🚀 BYPASS: Process ALL contracts, not just verified ones
    for (const [contractAddress, contractNFTs] of Object.entries(nftsByContract)) {
      if (contractNFTs.length > 0) {
        console.log(`✅ Processing ${contractNFTs.length} NFTs from contract: ${contractAddress}`);
        
        // Convert Alchemy NFTs to our format
        const tokens: VerifiedNFTToken[] = contractNFTs.map(alchemyNFT => ({
          tokenId: alchemyNFT.tokenId,
          name: alchemyNFT.title || alchemyNFT.metadata?.name || `Token #${alchemyNFT.tokenId}`,
          image: getImageUrl(alchemyNFT),
          tokenCount: alchemyNFT.balance || '1',
          floorPrice: 0 // Alchemy doesn't provide floor price directly
        }));

        // Get collection name from contract or first NFT
        const collectionName = contractNFTs[0]?.contract?.name || 
                              contractNFTs[0]?.metadata?.name || 
                              `Collection ${contractAddress.slice(0, 8)}...`;

        const holding: VerifiedNFTHolding = {
          collectionId: contractAddress,
          collectionName,
          collectionImage: getCollectionImageFromNFTs(contractNFTs),
          collectionFloorPrice: 0,
          tokens
        };

        verifiedHoldings.push(holding);
      }
    }

    console.log(`🎯 BYPASS RESULT: User holds ${verifiedHoldings.length} total collections (all contracts)`);
    verifiedHoldings.forEach(holding => {
      console.log(`   - ${holding.collectionName}: ${holding.tokens.length} tokens`);
    });

    return verifiedHoldings;
    
  } catch (error) {
    console.error('❌ Error fetching ALL NFTs with Alchemy:', error);
    return [];
  }
}

/**
 * Get the best available image URL from an Alchemy NFT
 */
function getImageUrl(alchemyNFT: AlchemyNFT): string {
  if (alchemyNFT.image?.originalUrl) return alchemyNFT.image.originalUrl;
  if (alchemyNFT.image?.pngUrl) return alchemyNFT.image.pngUrl;
  if (alchemyNFT.image?.thumbnailUrl) return alchemyNFT.image.thumbnailUrl;
  if (alchemyNFT.metadata?.image) return alchemyNFT.metadata.image;
  return '/placeholder.svg';
}

/**
 * Try to extract a collection image from the NFTs in the collection
 */
function getCollectionImageFromNFTs(nfts: AlchemyNFT[]): string {
  for (const nft of nfts) {
    const imageUrl = getImageUrl(nft);
    if (imageUrl && imageUrl !== '/placeholder.svg') {
      return imageUrl;
    }
  }
  return '';
}

/**
 * Check if a specific contract address is in the verified list
 */
export function isVerifiedNFTAlchemy(contractAddress: string): boolean {
  return VERIFIED_NFTS.some(nft => 
    nft.address.toLowerCase() === contractAddress.toLowerCase()
  );
}

/**
 * Get verified NFT configuration by contract address
 */
export function getVerifiedNFTConfig(contractAddress: string) {
  return VERIFIED_NFTS.find(nft => 
    nft.address.toLowerCase() === contractAddress.toLowerCase()
  );
}

/**
 * Smart function that uses Alchemy for testnet and falls back to existing logic for mainnet
 */
export async function getVerifiedNFTsUserHoldsSmart(walletAddress: string): Promise<VerifiedNFTHolding[]> {
  const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'sepolia';
  const hasAlchemyKey = !!process.env.ALCHEMY_API_KEY;
  
  console.log('🎯 getVerifiedNFTsUserHoldsSmart called with:', {
    walletAddress,
    isTestnet,
    hasAlchemyKey,
    network: process.env.NEXT_PUBLIC_NETWORK
  });
  
  if (isTestnet && hasAlchemyKey) {
    console.log('🧪 Using Alchemy for testnet NFT fetching');
    try {
      const result = await getVerifiedNFTsUserHoldsAlchemy(walletAddress);
      console.log('🎉 Alchemy result:', result.length, 'collections found');
      return result;
    } catch (error) {
      console.error('❌ Alchemy error, falling back to existing logic:', error);
      // Fall back to existing logic if Alchemy fails
    }
  }
  
  console.log('🌐 Using existing Magic Eden logic (testnet:', isTestnet, ', hasKey:', hasAlchemyKey, ')');
  // Import and use existing function
  const { getVerifiedNFTsUserHolds } = await import('./verifiedNFTChecker');
  return getVerifiedNFTsUserHolds(walletAddress);
}
