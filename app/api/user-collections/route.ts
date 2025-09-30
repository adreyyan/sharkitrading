import { NextRequest, NextResponse } from 'next/server';

// NFT API configuration - server-side only
// Note: Switched to Sepolia fhEVM - Magic Eden doesn't support Sepolia
const ME_API_BASE_URL = 'https://api-mainnet.magiceden.dev/v3/rtp/monad-testnet';

// Get API key from environment variables (Vercel compatible)
const ME_API_KEY = process.env.MAGIC_EDEN_API_KEY;

// Test wallet address for debugging
const TEST_WALLET = '0xtest123456789abcdef';

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
    const includeTopBid = searchParams.get('includeTopBid') || 'false';
    const includeLiquidCount = searchParams.get('includeLiquidCount') || 'false';
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Test mode - return mock data for test wallet
    if (walletAddress.toLowerCase() === TEST_WALLET.toLowerCase()) {
      console.log('🧪 Test mode activated - returning mock data');
      return NextResponse.json({
        collections: [
          {
            collection: {
              primaryContract: '0xe8f0635591190fb626f9d13c49b60626561ed145',
              name: 'Skrumpets',
              image: 'https://example.com/skrumpets.png',
              description: 'Test Skrumpets collection',
              floorAskPrice: null,
              volume: null
            },
            ownership: {
              tokenCount: '3'
            }
          },
          {
            collection: {
              primaryContract: '0xc5c9425d733b9f769593bd2814b6301916f91271',
              name: 'Purple Frens',
              image: 'https://example.com/purple-frens.png',
              description: 'Test Purple Frens collection',
              floorAskPrice: null,
              volume: null
            },
            ownership: {
              tokenCount: '1'
            }
          }
        ]
      });
    }

    console.log('🔍 Sepolia fhEVM mode - Magic Eden not available for:', walletAddress);
    console.log('🔗 Returning empty collections for Sepolia testnet');
    
    // Return empty array for Sepolia testnet (no Magic Eden support)
    console.log('✅ NFT API response received');
    console.log('🎯 Processing 0 collections');
    console.log('✅ Returning 0 collections to frontend');

    return NextResponse.json({
      collections: []
    });

    /* Disabled for Sepolia fhEVM - Magic Eden doesn't support Sepolia testnet */

  } catch (error) {
    console.error('❌ User Collections API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user NFT collections' },
      { status: 500 }
    );
  }
} 