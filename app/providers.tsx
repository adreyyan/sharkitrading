'use client'

import { ReactNode, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { fetchNFTTokens } from './utils/magicEdenApi'
import { VERIFIED_NFTS } from './config/verifiedNFTs'

// Dynamically import all RainbowKit components to avoid SSR issues
const RainbowKitProviders = dynamic(
  () => import('./components/RainbowKitProviders'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#1A1A1A] dark:text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }
)

export function Providers({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#1A1A1A] dark:text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return <RainbowKitProviders>{children}</RainbowKitProviders>
}

// Keep the existing interfaces and types for NFT functionality
export interface TokenAttribute {
  trait_type?: string;
  value?: string | number;
  display_type?: string;
}

export interface TokenMetadata {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: TokenAttribute[];
}

export interface NFTToken {
  token: {
    contract: string;
    tokenId: string;
    kind?: string;
    name?: string;
    description?: string;
    image?: string;
    media?: string;
    collection: {
      id: string;
      name: string;
      floorAskPrice: number;
    };
    lastBuy?: {
      value: number;
      timestamp: number;
    };
    lastSell?: {
      value: number;
      timestamp: number;
    };
    rarityScore?: number;
    rarityRank?: number;
    lastAppraisalValue?: number;
    chainId?: string;
    contractAddress?: string;
    isFlagged?: boolean;
    lastFlagUpdate?: string;
    lastMetaUpdate?: string;
    supply?: string;
    createdAt?: string;
    updatedAt?: string;
    attributes?: TokenAttribute[];
    metadata?: TokenMetadata;
  };
  ownership?: {
    tokenCount: string;
    onSaleCount?: string;
    floorAsk?: {
      id?: string | null;
      price?: number | null;
      maker?: string | null;
      validFrom?: string | null;
      validUntil?: string | null;
      dynamicPricing?: any;
      source?: string | null;
    };
    acquiredAt?: string;
    tokenId?: string;
    amount?: string;
    onSaleAmount?: string;
  };
}

// Keep existing NFT functionality
export interface NFT {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  collectionId: string;
  contractAddress: string;
  ownership: {
    tokenCount: string;
  };
  floorPrice?: number;
  selectedCount: number;
}

// Cache for API responses
const tokensCache = new Map<string, { data: NFT[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rest of the existing NFT-related functions...
// (keeping the existing implementation)

export async function getNFTsForCollection(
  walletAddress: string,
  collectionId: string
): Promise<{ tokens: NFT[], error?: string }> {
  if (!walletAddress || !collectionId) {
    return { tokens: [], error: 'Wallet address and collection ID are required' };
  }

  const cacheKey = `${walletAddress}-${collectionId}`;
  
  // Check cache first
  const cached = tokensCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('🎯 Using cached tokens for:', cacheKey);
    return { tokens: cached.data };
  }

  try {
    console.log('🌐 Fetching fresh tokens for collection:', collectionId);
    
    // ✅ Only call fetchNFTTokens - it includes floor price!
    const response = await fetchNFTTokens(walletAddress, collectionId);
    
    const mediaOverride =
      VERIFIED_NFTS.find(v => v.address.toLowerCase() === collectionId.toLowerCase())?.mediaOverride || '';

    const tokens = response.tokens.map(item => {
      // ✅ Get floor price directly from token response - no duplicate API call needed!
              const floorPrice = (item.token.collection?.floorAskPrice || 0) / 1000; // Convert from wei to Mon
      const tokenCount = item.ownership?.tokenCount || "1";
      
      console.log('Token with floor price from API:', {
        tokenId: item.token.tokenId,
        name: item.token.name,
        floorPrice: item.token.collection?.floorAskPrice,
        convertedFloorPrice: floorPrice,
        tokenCount
      });
      
      const nft: NFT = {
        tokenId: item.token.tokenId,
        name: item.token.name || 'Unnamed NFT',
        description: item.token.description || '',
        image: item.token.image || item.token.media || mediaOverride || '',
        collectionId: collectionId,
        contractAddress: item.token.contract || collectionId, // Use contract from API response
        ownership: {
          tokenCount: tokenCount
        },
        floorPrice, // ✅ Floor price from tokens API - no duplicate call!
        selectedCount: 0
      };

      return nft;
    });

    // Cache the result
    tokensCache.set(cacheKey, { 
      data: tokens, 
      timestamp: Date.now() 
    });
    
    console.log(`✅ Successfully fetched ${tokens.length} tokens for collection ${collectionId}`);
    return { tokens };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch NFTs';
    console.error('Error fetching NFTs:', errorMessage);
    return { tokens: [], error: errorMessage };
  }
} 