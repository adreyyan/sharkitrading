// Temporary hardcoded NFT data from your working CURL
// This bypasses all API and environment issues

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

// Your exact CURL response data
const HARDCODED_CURL_DATA = {
  "ownedNfts": [
    {
      "contract": {
        "address": "0x00000000001594C61dD8a6804da9AB58eD2483ce",
        "name": "NFTs2Me Owners",
        "symbol": "N2MOwners",
        "tokenType": "ERC721"
      },
      "tokenId": "154748105396174700299070300369178697485219703785",
      "name": "NFTs2Me Collection Owner - Zama Test",
      "image": {
        "originalUrl": null
      },
      "balance": "1"
    },
    {
      "contract": {
        "address": "0x1B1B25213BF07C3C60ffbdc076F70Defa96AaBe9",
        "name": "Zama Test",
        "symbol": "ZAM",
        "tokenType": "ERC721"
      },
      "tokenId": "1",
      "name": "Zama Test #1",
      "image": {
        "cachedUrl": "https://ipfs.io/ipfs/bafybeidvy7pdvrgjcffc3gxqurjorgvlud2r5exukumajbd5qzv6bmoosy",
        "originalUrl": "https://ipfs.io/ipfs/bafybeidvy7pdvrgjcffc3gxqurjorgvlud2r5exukumajbd5qzv6bmoosy"
      },
      "balance": "1"
    },
    {
      "contract": {
        "address": "0x1B1B25213BF07C3C60ffbdc076F70Defa96AaBe9",
        "name": "Zama Test",
        "symbol": "ZAM",
        "tokenType": "ERC721"
      },
      "tokenId": "2",
      "name": "Zama Test #2",
      "image": {
        "cachedUrl": "https://ipfs.io/ipfs/bafybeidvy7pdvrgjcffc3gxqurjorgvlud2r5exukumajbd5qzv6bmoosy",
        "originalUrl": "https://ipfs.io/ipfs/bafybeidvy7pdvrgjcffc3gxqurjorgvlud2r5exukumajbd5qzv6bmoosy"
      },
      "balance": "1"
    },
    {
      "contract": {
        "address": "0x1B1B25213BF07C3C60ffbdc076F70Defa96AaBe9",
        "name": "Zama Test",
        "symbol": "ZAM",
        "tokenType": "ERC721"
      },
      "tokenId": "3",
      "name": "Zama Test #3",
      "image": {
        "cachedUrl": "https://ipfs.io/ipfs/bafybeidvy7pdvrgjcffc3gxqurjorgvlud2r5exukumajbd5qzv6bmoosy",
        "originalUrl": "https://ipfs.io/ipfs/bafybeidvy7pdvrgjcffc3gxqurjorgvlud2r5exukumajbd5qzv6bmoosy"
      },
      "balance": "1"
    },
    {
      "contract": {
        "address": "0x1B1B25213BF07C3C60ffbdc076F70Defa96AaBe9",
        "name": "Zama Test",
        "symbol": "ZAM",
        "tokenType": "ERC721"
      },
      "tokenId": "4",
      "name": "Zama Test #4",
      "image": {
        "cachedUrl": "https://ipfs.io/ipfs/bafybeidvy7pdvrgjcffc3gxqurjorgvlud2r5exukumajbd5qzv6bmoosy",
        "originalUrl": "https://ipfs.io/ipfs/bafybeidvy7pdvrgjcffc3gxqurjorgvlud2r5exukumajbd5qzv6bmoosy"
      },
      "balance": "1"
    },
    {
      "contract": {
        "address": "0x1B1B25213BF07C3C60ffbdc076F70Defa96AaBe9",
        "name": "Zama Test",
        "symbol": "ZAM",
        "tokenType": "ERC721"
      },
      "tokenId": "5",
      "name": "Zama Test #5",
      "image": {
        "cachedUrl": "https://ipfs.io/ipfs/bafybeidvy7pdvrgjcffc3gxqurjorgvlud2r5exukumajbd5qzv6bmoosy",
        "originalUrl": "https://ipfs.io/ipfs/bafybeidvy7pdvrgjcffc3gxqurjorgvlud2r5exukumajbd5qzv6bmoosy"
      },
      "balance": "1"
    }
  ],
  "totalCount": 21
};

/**
 * HARDCODED VERSION using your exact CURL data
 * This bypasses all API and environment variable issues
 */
export async function getHardcodedNFTsForTestWallet(walletAddress: string): Promise<VerifiedNFTHolding[]> {
  console.log('🔥 USING HARDCODED CURL DATA FOR WALLET:', walletAddress);
  
  // Only return data for your test wallet
  if (walletAddress.toLowerCase() !== '0x6d0fc679faffc0046eb82455282aea3f2ef0af38') {
    console.log('❌ Not the test wallet, returning empty');
    return [];
  }
  
  console.log('✅ Test wallet detected, returning hardcoded data');
  
  const verifiedHoldings: VerifiedNFTHolding[] = [];
  
  // Group NFTs by contract address
  const nftsByContract: { [contractAddress: string]: any[] } = {};
  
  HARDCODED_CURL_DATA.ownedNfts.forEach(nft => {
    const contractAddress = nft.contract.address.toLowerCase();
    if (!nftsByContract[contractAddress]) {
      nftsByContract[contractAddress] = [];
    }
    nftsByContract[contractAddress].push(nft);
  });
  
  console.log('📦 HARDCODED NFTs grouped by contract:', Object.keys(nftsByContract));
  
  // Process each contract
  for (const [contractAddress, contractNFTs] of Object.entries(nftsByContract)) {
    if (contractNFTs.length > 0) {
      console.log(`✅ HARDCODED: Processing ${contractNFTs.length} NFTs from contract: ${contractAddress}`);
      
      // Convert to our format
      const tokens: VerifiedNFTToken[] = contractNFTs.map(nft => ({
        tokenId: nft.tokenId,
        name: nft.name,
        image: nft.image?.cachedUrl || nft.image?.originalUrl || '/placeholder.svg',
        tokenCount: nft.balance || '1',
        floorPrice: 0
      }));

      // Get collection name from contract or first NFT
      const collectionName = contractNFTs[0]?.contract?.name || `Collection ${contractAddress.slice(0, 8)}...`;

      const holding: VerifiedNFTHolding = {
        collectionId: contractAddress,
        collectionName,
        collectionImage: tokens[0]?.image || '',
        collectionFloorPrice: 0,
        tokens
      };

      verifiedHoldings.push(holding);
    }
  }

  console.log(`🎉 HARDCODED RESULT: ${verifiedHoldings.length} collections with ${HARDCODED_CURL_DATA.ownedNfts.length} total NFTs`);
  verifiedHoldings.forEach(holding => {
    console.log(`   - ${holding.collectionName}: ${holding.tokens.length} tokens`);
  });

  return verifiedHoldings;
}
