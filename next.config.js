/** @type {import('next').NextConfig} */
const nextConfig = {
  // API keys are now in config/secrets.js (gitignored)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  images: {
    domains: [
      'img.reservoir.tools', // Reservoir Tools images
      'ipfs.io', // IPFS gateway
      'gateway.ipfs.io',
      'ipfs.infura.io',
      'nft.storage',
      'magiceden.io',
      'arweave.net',
      'cdn.magiceden.dev',
      'picsum.photos' // Added for random placeholder images
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.reservoir.tools'
      },
      {
        protocol: 'https',
        hostname: '**.ipfs.io'
      },
      {
        protocol: 'https',
        hostname: '**.magiceden.io'
      },
      {
        protocol: 'https',
        hostname: '**.magiceden.dev'
      }
    ],
    // Disable image optimization in development to prevent 403 errors
    unoptimized: process.env.NODE_ENV === 'development'
  }
};

module.exports = nextConfig; 