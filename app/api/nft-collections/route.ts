import { NextRequest, NextResponse } from 'next/server';

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
        { error: 'API configuration error - API key not found in environment variables' },
        { status: 500 }
      );
    }
    
    console.log('✅ Sepolia fhEVM mode - Magic Eden not available');
    
    // Return empty array for Sepolia testnet (no Magic Eden support)
    return NextResponse.json({
      collections: []
    });

    /* Disabled for Sepolia fhEVM - Magic Eden doesn't support Sepolia testnet */

  } catch (error) {
    console.error('❌ NFT Collections API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFT collections' },
      { status: 500 }
    );
  }
} 