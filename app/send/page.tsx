'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Sidebar from '../components/Sidebar';
import MobileMenuButton from '../components/MobileMenuButton';
import ChainSwitcher from '../components/ChainSwitcher';
import SendBulkInterface from '../components/send/SendBulkInterface';

export default function SendPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { address, isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className={`flex-1 ${isSidebarOpen ? 'lg:pl-72' : ''}`}>
        <div className="p-6">
          {/* Header: align controls to the right like other tabs */}
          <div className="flex items-center justify-between mb-6">
            <div className="lg:hidden">
              <MobileMenuButton 
                isOpen={isSidebarOpen}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            </div>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-4">
              <ChainSwitcher />
              <ConnectButton label="Connect" showBalance={false} />
            </div>
          </div>
          
          {/* Send Interface Content */}
          {!isConnected ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="jupiter-card p-8 max-w-md text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl">↗</span>
                </div>
                
                <h2 className="text-xl font-semibold mb-3 text-white">Connect Your Wallet</h2>
                <p className="text-zinc-400 mb-6 leading-relaxed">
                  Connect your wallet to start sending NFTs on the Monad network with fast, secure transactions.
                </p>
                
                <div className="mb-6">
                  <ConnectButton label="Connect Wallet" showBalance={false} />
                </div>
              </div>
            </div>
          ) : (
            <SendBulkInterface userAddress={address || ''} />
          )}
        </div>
      </div>
    </div>
  );
} 