import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchWalletNFTs, 
  fetchWalletCollections, 
  fetchNFTsForContract,
  convertAlchemyNFTToAppNFT,
  convertAlchemyCollectionToAppFormat
} from '@/services/alchemy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const contractAddress = searchParams.get('contract');
    const pageKey = searchParams.get('pageKey');
    const type = searchParams.get('type') || 'nfts'; // 'nfts' or 'collections'
    
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    console.log('🚀 Alchemy API request:', {
      wallet,
      contractAddress,
      pageKey,
      type
    });

    if (type === 'collections') {
      // Fetch collections for the wallet
      const alchemyResponse = await fetchWalletCollections(wallet, pageKey || undefined);
      
      const collections = alchemyResponse.contracts.map(convertAlchemyCollectionToAppFormat);
      
      return NextResponse.json({
        collections,
        totalCount: alchemyResponse.totalCount,
        pageKey: alchemyResponse.pageKey
      });
    } else {
      let alchemyResponse;
      
      if (contractAddress) {
        // Fetch NFTs for a specific contract
        alchemyResponse = await fetchNFTsForContract(wallet, contractAddress, pageKey || undefined);
      } else {
        // Fetch all NFTs for the wallet
        alchemyResponse = await fetchWalletNFTs(wallet, pageKey || undefined);
      }
      
      const nfts = alchemyResponse.ownedNfts.map(convertAlchemyNFTToAppNFT);
      
      // Group NFTs by contract address to match your existing format
      const nftsByContract: { [contractAddress: string]: any[] } = {};
      
      nfts.forEach(nft => {
        if (!nftsByContract[nft.contractAddress]) {
          nftsByContract[nft.contractAddress] = [];
        }
        nftsByContract[nft.contractAddress].push(nft);
      });
      
      // If requesting a specific contract, return in the same format as your existing API
      if (contractAddress) {
        const tokens = nfts.filter(nft => 
          nft.contractAddress.toLowerCase() === contractAddress.toLowerCase()
        );
        
        return NextResponse.json({
          tokens: tokens.map(token => ({
            token: {
              tokenId: token.tokenId,
              name: token.name,
              description: token.description,
              image: token.image,
              contract: token.contractAddress,
              collection: {
                floorAskPrice: token.floorPrice
              }
            },
            ownership: {
              tokenCount: token.balance
            }
          })),
          totalCount: tokens.length,
          pageKey: alchemyResponse.pageKey
        });
      } else {
        // Return all NFTs grouped by contract
        return NextResponse.json({
          nfts,
          nftsByContract,
          totalCount: alchemyResponse.totalCount,
          pageKey: alchemyResponse.pageKey
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Alchemy API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch NFTs from Alchemy';
    
    // Handle specific Alchemy errors
    if (errorMessage.includes('Alchemy API error')) {
      return NextResponse.json(
        { error: 'External NFT service error', details: errorMessage },
        { status: 502 }
      );
    }
    
    if (errorMessage.includes('ALCHEMY_API_KEY')) {
      return NextResponse.json(
        { error: 'NFT service configuration error' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
