import { NextRequest, NextResponse } from 'next/server';
import { enhancedVerifyNFT, getBlockchainVerifiedNFTs, getVerificationStats } from '../../../services/enhancedVerification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractAddress, tokenId, userAddress, action } = body;

    if (!userAddress) {
      return NextResponse.json({ error: 'User address is required' }, { status: 400 });
    }

    switch (action) {
      case 'verify_single':
        if (!contractAddress || !tokenId) {
          return NextResponse.json({ error: 'Contract address and token ID are required' }, { status: 400 });
        }
        
        const verification = await enhancedVerifyNFT(contractAddress, tokenId, userAddress);
        return NextResponse.json({ verification });

      case 'verify_all':
        const allVerified = await getBlockchainVerifiedNFTs(userAddress);
        return NextResponse.json({ verifiedNFTs: allVerified });

      case 'get_stats':
        const stats = await getVerificationStats(userAddress);
        return NextResponse.json({ stats });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in verify-nft API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');
    const contractAddress = searchParams.get('contractAddress');
    const tokenId = searchParams.get('tokenId');

    if (!userAddress) {
      return NextResponse.json({ error: 'User address is required' }, { status: 400 });
    }

    if (contractAddress && tokenId) {
      // Verify specific NFT
      const verification = await enhancedVerifyNFT(contractAddress, tokenId, userAddress);
      return NextResponse.json({ verification });
    } else {
      // Get all verified NFTs
      const allVerified = await getBlockchainVerifiedNFTs(userAddress);
      return NextResponse.json({ verifiedNFTs: allVerified });
    }

  } catch (error) {
    console.error('Error in verify-nft API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 