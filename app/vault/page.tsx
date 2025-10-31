'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import VaultPanel from '../components/VaultPanel';
import Sidebar from '../components/Sidebar';
import MobileMenuButton from '../components/MobileMenuButton';

interface NFT {
  contractAddress: string;
  tokenId: string;
  name?: string;
  image?: string;
  description?: string;
}

export default function VaultPage() {
  const { address: userAddress } = useAccount();
  const [userNFTs, setUserNFTs] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (userAddress) {
      loadUserNFTs();
    } else {
      setUserNFTs([]);
    }
  }, [userAddress]);

  const loadUserNFTs = async () => {
    if (!userAddress) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/alchemy-nfts?owner=${userAddress}&raw=true`);
      const data = await response.json();

      if (data.ownedNfts) {
        const nfts: NFT[] = data.ownedNfts.map((nft: any) => ({
          contractAddress: nft.contract.address,
          tokenId: nft.tokenId,
          name: nft.name || nft.title || `NFT #${nft.tokenId}`,
          image: nft.image?.cachedUrl || nft.image?.thumbnailUrl || nft.image?.originalUrl || '/placeholder.svg',
          description: nft.description,
        }));
        setUserNFTs(nfts);
      }
    } catch (error) {
      console.error('Error loading NFTs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Top Bar */}
        <div className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <MobileMenuButton onClick={() => setIsSidebarOpen(true)} />
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">🏦</span>
                  Private NFT Vault
                </h1>
                <p className="text-sm text-gray-400 hidden sm:block">
                  Encrypt your NFTs • Trade privately • Withdraw anytime
                </p>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 lg:p-8">
          {!userAddress ? (
            <div className="max-w-2xl mx-auto">
              {/* Empty State */}
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                  <span className="text-5xl">🔐</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Connect your wallet to access the private vault and start encrypting your NFTs
                </p>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-800/30 backdrop-blur-xl rounded-xl border border-gray-700/50 p-6">
                  <div className="text-3xl mb-3">🏦</div>
                  <h3 className="font-semibold text-white mb-2">Deposit</h3>
                  <p className="text-sm text-gray-400">
                    Deposit NFTs to get encrypted vault receipts
                  </p>
                </div>
                <div className="bg-gray-800/30 backdrop-blur-xl rounded-xl border border-gray-700/50 p-6">
                  <div className="text-3xl mb-3">🎭</div>
                  <h3 className="font-semibold text-white mb-2">Trade</h3>
                  <p className="text-sm text-gray-400">
                    Trade receipts privately - no one sees what NFTs you own
                  </p>
                </div>
                <div className="bg-gray-800/30 backdrop-blur-xl rounded-xl border border-gray-700/50 p-6">
                  <div className="text-3xl mb-3">📥</div>
                  <h3 className="font-semibold text-white mb-2">Withdraw</h3>
                  <p className="text-sm text-gray-400">
                    Withdraw your NFTs back to your wallet anytime
                  </p>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400 text-lg">Loading your NFTs...</p>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              <VaultPanel 
                userNFTs={userNFTs}
                onDepositSuccess={loadUserNFTs}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

