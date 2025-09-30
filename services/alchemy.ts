import { NFT } from '@/types/nft';

// Alchemy NFT API types
interface AlchemyNFT {
  tokenId: string;
  title: string;
  description?: string;
  image?: {
    originalUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
  };
  contract: {
    address: string;
    name?: string;
    symbol?: string;
    tokenType: 'ERC721' | 'ERC1155';
  };
  balance: string;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    [key: string]: any;
  };
}

interface AlchemyCollection {
  address: string;
  name: string;
  symbol?: string;
  tokenType: 'ERC721' | 'ERC1155';
  contractMetadata?: {
    name?: string;
    symbol?: string;
    totalSupply?: string;
  };
}

interface AlchemyNFTsResponse {
  ownedNfts: AlchemyNFT[];
  totalCount: number;
  pageKey?: string;
}

interface AlchemyCollectionsResponse {
  contracts: AlchemyCollection[];
  totalCount: number;
  pageKey?: string;
}

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const nftCache = new Map<string, { data: AlchemyNFTsResponse; timestamp: number }>();
const collectionsCache = new Map<string, { data: AlchemyCollectionsResponse; timestamp: number }>();

// Get Alchemy API key and URL
const getAlchemyConfig = () => {
  const apiKey = process.env.ALCHEMY_API_KEY;
  const network = process.env.NEXT_PUBLIC_NETWORK === 'sepolia' ? 'eth-sepolia' : 'eth-mainnet';
  
  console.log('🔍 Environment check:', {
    apiKeyExists: !!apiKey,
    apiKeyLength: apiKey?.length,
    network: process.env.NEXT_PUBLIC_NETWORK,
    nodeEnv: process.env.NODE_ENV
  });
  
  if (!apiKey) {
    throw new Error('ALCHEMY_API_KEY is not set in environment variables');
  }
  
  return {
    apiKey,
    baseUrl: `https://${network}.g.alchemy.com/nft/v3/${apiKey}`
  };
};

/**
 * Fetch all NFTs owned by a wallet address using Alchemy
 */
export async function fetchWalletNFTs(
  walletAddress: string,
  pageKey?: string
): Promise<AlchemyNFTsResponse> {
  const cacheKey = `${walletAddress}-${pageKey || 'first'}`;
  
  // Check cache first
  const cached = nftCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('🎯 Using cached NFTs for:', cacheKey);
    return cached.data;
  }

  try {
    const { baseUrl } = getAlchemyConfig();
    
    const params = new URLSearchParams({
      owner: walletAddress,
      withMetadata: 'true',
      pageSize: '100'
    });
    
    if (pageKey) {
      params.append('pageKey', pageKey);
    }
    
    const url = `${baseUrl}/getNFTsForOwner?${params.toString()}`;
    console.log('🌐 Fetching NFTs from Alchemy:', url.replace(baseUrl.split('/')[3], 'API_KEY_HIDDEN'));
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log('📡 Alchemy response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Alchemy API error response:', errorText);
      throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
    }
    
    const data: AlchemyNFTsResponse = await response.json();
    console.log('✅ Alchemy fetch successful, got', data.ownedNfts?.length || 0, 'NFTs');
    
    // Cache the result
    nftCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    console.log(`✅ Fetched ${data.ownedNfts.length} NFTs from Alchemy`);
    return data;
    
  } catch (error) {
    console.error('❌ Error fetching NFTs from Alchemy:', error);
    throw error;
  }
}

/**
 * Fetch NFT collections for a wallet address using Alchemy
 */
export async function fetchWalletCollections(
  walletAddress: string,
  pageKey?: string
): Promise<AlchemyCollectionsResponse> {
  const cacheKey = `collections-${walletAddress}-${pageKey || 'first'}`;
  
  // Check cache first
  const cached = collectionsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('🎯 Using cached collections for:', cacheKey);
    return cached.data;
  }

  try {
    const { baseUrl } = getAlchemyConfig();
    
    const params = new URLSearchParams({
      owner: walletAddress,
      pageSize: '100'
    });
    
    if (pageKey) {
      params.append('pageKey', pageKey);
    }
    
    const url = `${baseUrl}/getContractsForOwner?${params.toString()}`;
    console.log('🌐 Fetching collections from Alchemy:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
    }
    
    const data: AlchemyCollectionsResponse = await response.json();
    
    // Cache the result
    collectionsCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    console.log(`✅ Fetched ${data.contracts.length} collections from Alchemy`);
    return data;
    
  } catch (error) {
    console.error('❌ Error fetching collections from Alchemy:', error);
    throw error;
  }
}

/**
 * Fetch NFTs for a specific contract address using Alchemy
 */
export async function fetchNFTsForContract(
  walletAddress: string,
  contractAddress: string,
  pageKey?: string
): Promise<AlchemyNFTsResponse> {
  const cacheKey = `${walletAddress}-${contractAddress}-${pageKey || 'first'}`;
  
  // Check cache first
  const cached = nftCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('🎯 Using cached contract NFTs for:', cacheKey);
    return cached.data;
  }

  try {
    const { baseUrl } = getAlchemyConfig();
    
    const params = new URLSearchParams({
      owner: walletAddress,
      'contractAddresses[]': contractAddress,
      withMetadata: 'true',
      pageSize: '100'
    });
    
    if (pageKey) {
      params.append('pageKey', pageKey);
    }
    
    const url = `${baseUrl}/getNFTsForOwner?${params.toString()}`;
    console.log('🌐 Fetching contract NFTs from Alchemy:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
    }
    
    const data: AlchemyNFTsResponse = await response.json();
    
    // Cache the result
    nftCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    console.log(`✅ Fetched ${data.ownedNfts.length} NFTs from contract ${contractAddress}`);
    return data;
    
  } catch (error) {
    console.error('❌ Error fetching contract NFTs from Alchemy:', error);
    throw error;
  }
}

/**
 * Convert Alchemy NFT format to your app's NFT format
 */
export function convertAlchemyNFTToAppNFT(alchemyNFT: AlchemyNFT): NFT {
  // Get the best image URL available
  const getImageUrl = (): string => {
    if (alchemyNFT.image?.originalUrl) return alchemyNFT.image.originalUrl;
    if (alchemyNFT.image?.pngUrl) return alchemyNFT.image.pngUrl;
    if (alchemyNFT.image?.thumbnailUrl) return alchemyNFT.image.thumbnailUrl;
    if (alchemyNFT.metadata?.image) return alchemyNFT.metadata.image;
    return '';
  };

  const nft: NFT = {
    tokenId: alchemyNFT.tokenId,
    name: alchemyNFT.title || alchemyNFT.metadata?.name || `Token #${alchemyNFT.tokenId}`,
    description: alchemyNFT.description || alchemyNFT.metadata?.description || '',
    image: getImageUrl(),
    collectionId: alchemyNFT.contract.address,
    contractAddress: alchemyNFT.contract.address,
    ownership: {
      tokenCount: alchemyNFT.balance || '1'
    },
    floorPrice: 0, // Alchemy doesn't provide floor price directly
    selectedCount: 0,
    standard: alchemyNFT.contract.tokenType,
    balance: alchemyNFT.balance || '1'
  };

  return nft;
}

/**
 * Convert Alchemy collection format to your app's format
 */
export function convertAlchemyCollectionToAppFormat(alchemyCollection: AlchemyCollection) {
  return {
    collection: {
      primaryContract: alchemyCollection.address,
      name: alchemyCollection.name || alchemyCollection.contractMetadata?.name || 'Unknown Collection',
      description: '',
      image: '', // Alchemy doesn't provide collection images in this endpoint
      floorAskPrice: {
        amount: {
          native: 0
        }
      }
    },
    ownership: {
      tokenCount: '0' // This will be populated when fetching specific NFTs
    }
  };
}

/**
 * Clear all Alchemy caches (useful for debugging)
 */
export function clearAlchemyCache() {
  nftCache.clear();
  collectionsCache.clear();
  console.log('🧹 Cleared Alchemy caches');
}

export type { AlchemyNFT, AlchemyCollection, AlchemyNFTsResponse, AlchemyCollectionsResponse };
