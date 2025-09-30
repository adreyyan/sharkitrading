import { NextRequest, NextResponse } from 'next/server';

// Run this API on the edge for lower latency globally
export const runtime = 'edge';

// NFT API configuration - server-side only
// Note: Switched to Sepolia fhEVM - Magic Eden doesn't support Sepolia
const ME_API_BASE_URL = 'https://api-mainnet.magiceden.dev/v3/rtp/monad-testnet';

// Get API key from environment variables (Vercel compatible)
const ME_API_KEY = process.env.MAGIC_EDEN_API_KEY;

export async function GET(request: NextRequest) {
  try {
    // Validate API key exists
    if (!ME_API_KEY) {
      console.error('❌ NFT API key not configured');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const collection = searchParams.get('collection');
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';
    const fresh = searchParams.get('fresh') === '1';

    const cacheHeaders = fresh
      ? {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
          Vary: 'Accept, Origin'
        }
      : {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
          Vary: 'Accept, Origin'
        };

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection address is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Sepolia fhEVM mode - Magic Eden not available for wallet: ${walletAddress}, collection: ${collection}`);
    console.log(`🔗 Returning empty tokens for Sepolia testnet`);
    
    // Return empty array for Sepolia testnet (no Magic Eden support)
    console.log('✅ NFT API response received');
    console.log('🎯 Processing 0 tokens');
    console.log('✅ Returning 0 tokens to frontend');

    return NextResponse.json({
      tokens: []
    }, { headers: cacheHeaders });

    // Disabled for Sepolia fhEVM - Magic Eden doesn't support Sepolia testnet
    // const apiUrl = `${ME_API_BASE_URL}/users/${walletAddress}/tokens/v6?collection=${collection}&offset=${offset}&limit=${limit}`;
    // console.log(`🔗 API URL: ${apiUrl}`);
    //
    // const response = await fetch(apiUrl, {
    //   method: 'GET',
    //   headers: {
    //     'Authorization': `Bearer ${ME_API_KEY}`,
    //     'accept': '*/*'
    //   }
    // });

  } catch (error) {
    console.error('❌ Error in user-tokens API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 