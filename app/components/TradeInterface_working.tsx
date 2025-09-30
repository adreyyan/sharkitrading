'use client';

import React, { useState, useEffect, ComponentType, useMemo } from 'react';
import SafeImage from './SafeImage';
import SortDropdown from './SortDropdown';
import { Collection, NFT } from '../../types/nft';
import { getNFTsForCollection } from '../../services/nft';
import { isVerifiedNFT } from '../config/verifiedNFTs';
import { getVerifiedNFTsUserHolds, getVerifiedNFTsUserHoldsSmart, VerifiedNFTHolding } from '../../services/verifiedNFTChecker';
import { useIsMounted } from '../hooks/useIsMounted';
import { useNFTCollections } from '../hooks/useNFTCollections';
import { useBalance, useWalletClient } from 'wagmi';
import type { default as TradePanelType } from './TradePanel';
import { useRouter } from 'next/navigation';
import { proposeTrade } from '../../services/trade';
import { createTrade, approveERC1155ForTrading, isERC1155ApprovedForTrading, approveNFTForTrading } from '../../services/blockchain';
import { isERC1155NFT } from '../config/verifiedNFTs';
import { toast } from 'react-hot-toast';
import MyTrades from './MyTrades';

interface TradeInterfaceProps {
  userAddress: string;
  TradePanelComponent: ComponentType<React.ComponentProps<typeof TradePanelType>>;
}

interface NFTWithCount extends NFT {
  ownedCount: number;
  selectedCount: number;
  isCounterparty?: boolean;
  collectionName?: string;
}

export default function TradeInterface({ userAddress, TradePanelComponent }: TradeInterfaceProps) {
  const isMounted = useIsMounted();

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen text-gray-900 dark:text-white p-3 sm:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 dark:bg-gray-900/10 backdrop-blur-2xl border border-white/20 dark:border-gray-600/20 rounded-2xl p-4 sm:p-6 mb-6 shadow-2xl relative">
          <h1 className="text-2xl font-bold text-center">
            fhEVM NFT Trading - ETH/Sepolia
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
            Your trading interface is now updated for Ethereum/Sepolia with encrypted amounts!
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="glass-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">Ξ</span>
                </div>
                <span className="font-medium text-sm">Your ETH</span>
              </div>
              <input
                type="number"
                placeholder="0.00"
                className="w-full bg-white/50 dark:bg-gray-800/50 border border-white/20 rounded px-3 py-2 text-sm"
              />
              <div className="text-xs text-gray-600 mt-1">
                Available: 0.34 ETH
              </div>
            </div>
            
            <div className="glass-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">Ξ</span>
                </div>
                <span className="font-medium text-sm">Counterparty ETH</span>
              </div>
              <input
                type="number"
                placeholder="0.00"
                className="w-full bg-white/50 dark:bg-gray-800/50 border border-white/20 rounded px-3 py-2 text-sm"
              />
              <div className="text-xs text-gray-600 mt-1">
                Available: 0.00 ETH
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
