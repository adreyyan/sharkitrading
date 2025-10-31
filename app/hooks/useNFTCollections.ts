import { useState, useEffect } from 'react';
import { Address } from 'viem';
import { VERIFIED_NFTS } from '../config/verifiedNFTs';

export interface NFTCollection {
  contractAddress: string;
  name: string;
  symbol: string;
  collectionName?: string;
  isVerified: boolean;
  tokenCount?: number;
  image?: string;
  description?: string;
  floorPrice?: number;
  volumeAll?: number;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Cache for API responses
const apiCache = new Map<string, any>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useNFTCollections(address: Address | undefined) {
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getVerifiedNFTsUserHoldsSmart = async (userAddress: string): Promise<NFTCollection[]> => {
    console.log('🚀 Starting Smart NFT Detection for:', userAddress);
    
    try {
      // Step 1: Get all user collections (1 API call)
      console.log('📊 Step 1: Getting all user collections...');
      
      const cacheKey = `collections_${userAddress}`;
      let userCollectionsData;
      
      if (apiCache.has(cacheKey)) {
        const cached = apiCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
          userCollectionsData = cached.data;
          console.log('✅ Using cached collections data');
        }
      }
      
      if (!userCollectionsData) {
        console.log('🔥 Fetching NFTs from Alchemy API...');
        
        // Use Alchemy API to get all NFTs
        const nftsResponse = await fetch(
          `/api/alchemy-nfts?wallet=${userAddress}`
        );

        if (!nftsResponse.ok) {
          // Log detailed error information
          console.error('Alchemy API Error Details:', {
            status: nftsResponse.status,
            statusText: nftsResponse.statusText,
            url: nftsResponse.url
          });
          
          try {
            const errorBody = await nftsResponse.text();
            console.error('Error Response Body:', errorBody);
          } catch (e) {
            console.error('Could not read error body:', e);
          }

          throw new Error(`HTTP ${nftsResponse.status}: ${nftsResponse.statusText}`);
        }

        const alchemyData = await nftsResponse.json();
        console.log('✅ Alchemy data received:', alchemyData);
        
        // Group NFTs by contract address to create collections
        const nftsByContract = new Map();
        
        if (alchemyData.nfts && Array.isArray(alchemyData.nfts)) {
          alchemyData.nfts.forEach((nft: any) => {
            const contract = nft.contractAddress.toLowerCase();
            if (!nftsByContract.has(contract)) {
              nftsByContract.set(contract, {
                contractAddress: contract,
                name: nft.name || 'Unknown Collection',
                symbol: nft.name || '',
                image: nft.image || '',
                description: nft.description || '',
                tokenCount: 0,
                floorPrice: 0,
                volumeAll: 0
              });
            }
            const collection = nftsByContract.get(contract);
            collection.tokenCount += 1;
          });
        }
        
        const collections = Array.from(nftsByContract.values());
        console.log(`✅ Grouped into ${collections.length} collections`);
        
        // Cache the response
        apiCache.set(cacheKey, {
          data: collections,
          timestamp: Date.now()
        });
        
        userCollectionsData = collections;
      }
      
      // Step 2: Filter locally to find verified collections (instant)
      console.log('🔍 Step 2: Filtering for verified collections...');
      
      const verifiedAddresses = VERIFIED_NFTS.map(nft => nft.address.toLowerCase());
      
      const userVerifiedCollections = userCollectionsData.filter((item: any) => {
        const contract = item.contractAddress.toLowerCase();
        return verifiedAddresses.includes(contract);
      });
      
      // Group by contract to get unique collections and token counts
      const collectionMap = new Map();
      userVerifiedCollections.forEach((item: any) => {
        const contract = item.contractAddress.toLowerCase();
        if (!collectionMap.has(contract)) {
          collectionMap.set(contract, {
            contractAddress: contract,
            name: item.name,
            symbol: item.symbol,
            image: item.image,
            description: item.description,
            tokenCount: item.tokenCount,
            floorPrice: item.floorPrice,
            volumeAll: item.volumeAll,
            isVerified: true
          });
        } else {
          const existing = collectionMap.get(contract);
          existing.tokenCount += item.tokenCount;
        }
      });
      
      console.log(`✅ Found ${collectionMap.size} verified collections user owns`);
      
      if (collectionMap.size === 0) {
        console.log('ℹ️ User owns no verified NFTs');
        return [];
      }
      
      return Array.from(collectionMap.values());
      
    } catch (error) {
      console.error('❌ Smart NFT detection failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!address) {
      setCollections([]);
      setIsLoading(false);
      return;
    }

    const fetchCollections = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const userAddress = address.toLowerCase();
        console.log('🔍 Fetching verified NFTs for:', userAddress);
        
        const verifiedCollections = await getVerifiedNFTsUserHoldsSmart(userAddress);
        
        console.log('✅ Final collections:', verifiedCollections);
        setCollections(verifiedCollections);
        
      } catch (err) {
        console.error('❌ Error fetching collections:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch collections');
        setCollections([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollections();
  }, [address]);

  return { collections, isLoading, error };
} 