'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import dynamic from 'next/dynamic';
import TradeInterface from '../components/TradeInterface';
import VerifiedNFTSearch from '../components/VerifiedNFTSearch';
import Sidebar from '../components/Sidebar';
import MobileMenuButton from '../components/MobileMenuButton';
import ChainSwitcher from '../components/ChainSwitcher';

// Dynamically import ConnectButton to avoid SSR issues
const ConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then((mod) => ({ default: mod.ConnectButton })),
  { 
    ssr: false,
    loading: () => (
      <div className="jupiter-card px-4 py-2 animate-pulse">
        <div className="h-10 w-24 bg-zinc-700 rounded-lg"></div>
      </div>
    )
  }
);

const TradePanel = dynamic(
  () => import('../components/TradePanel'),
  { 
    ssr: false,
    loading: () => (
      <div className="jupiter-card p-6 animate-pulse">
        <div className="space-y-4">
          <div className="h-6 bg-zinc-700 rounded w-1/3"></div>
          <div className="h-32 bg-zinc-700 rounded"></div>
        </div>
      </div>
    )
  }
);

export default function SwapPage() {
  const { address, isConnected } = useAccount();
  const [selectedNFT, setSelectedNFT] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNFTSelect = (nft: any) => {
    setSelectedNFT(nft);
  };

  if (!isConnected) {
    return (
      <div className="flex min-h-screen bg-zinc-950">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        {/* Main content */}
        <div className="flex-1 lg:pl-72">
          <div className="p-4 lg:p-8">
            {/* Mobile header - chain beside wallet */}
            <div className="lg:hidden flex items-center justify-between mb-6">
              <MobileMenuButton 
                onClick={() => setSidebarOpen(true)} 
                isOpen={sidebarOpen} 
              />
              <div className="flex items-center gap-2">
                <ChainSwitcher />
                <ConnectButton label="Connect Wallet" showBalance={false} />
              </div>
            </div>

            {/* Desktop header */}
            <div className="hidden lg:flex items-center justify-between mb-8">
              <div>
              </div>
              <div className="flex items-center gap-4">
                <ChainSwitcher />
                <ConnectButton label="Connect Wallet" showBalance={false} />
              </div>
            </div>

            {/* Welcome card - Jupiter style */}
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="jupiter-card p-8 max-w-md text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl">🔄</span>
                </div>
                
                <h2 className="text-xl font-semibold mb-3 text-white">Connect Your Wallet</h2>
                <p className="text-zinc-400 mb-6 leading-relaxed">
                  Connect your wallet to start swapping NFTs on the Monad network with fast, secure transactions.
                </p>
                
                <div className="mb-6">
                  <ConnectButton label="Connect Wallet" showBalance={false} />
                </div>
                
                <div className="text-sm">
                  <a 
                    href="/recover" 
                    className="text-green-400 hover:text-green-300 transition-colors"
                  >
                    Lost a trade? Recover it here →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content */}
      <div className={`flex-1 ${sidebarOpen ? 'lg:pl-72' : ''}`}>
        <div className="p-4 lg:p-6">
          {/* Mobile header - chain beside wallet */}
          <div className="lg:hidden flex items-center justify-between mb-6">
            <MobileMenuButton 
              onClick={() => setSidebarOpen(true)} 
              isOpen={sidebarOpen} 
            />
            <div className="flex items-center gap-2">
              <ChainSwitcher />
              <ConnectButton label="Connected" showBalance={false} />
            </div>
          </div>

          {/* Desktop header with ChainSwitcher */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-80">
                <VerifiedNFTSearch 
                  placeholder="Search NFTs..."
                  onSelect={handleNFTSelect}
                />
              </div>
              <ChainSwitcher />
              <ConnectButton label="Connected" showBalance={false} />
            </div>
          </div>

          {/* Mobile search */}
          <div className="lg:hidden mb-6">
            <VerifiedNFTSearch 
              placeholder="Search NFTs..."
              onSelect={handleNFTSelect}
            />
          </div>

          {/* Mobile ChainSwitcher removed (now in header) */}

          {/* Main trading interface */}
          <TradeInterface userAddress={address || ''} TradePanelComponent={TradePanel} />
        </div>
      </div>
    </div>
  );
} 