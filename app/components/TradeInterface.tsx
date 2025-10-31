'use client';

import React, { useState, useEffect, ComponentType, useMemo } from 'react';
import SafeImage from './SafeImage';
import SortDropdown from './SortDropdown';
import { Collection, NFT } from '../../types/nft';
import { getNFTsForCollection } from '../../services/nft';
import { getVerifiedNFTsUserHoldsSmart, VerifiedNFTHolding } from '../../services/alchemyNFTChecker';
import { useIsMounted } from '../hooks/useIsMounted';
import { useNFTCollections } from '../hooks/useNFTCollections';
import { useBalance, useWalletClient } from 'wagmi';
import type { default as TradePanelType } from './TradePanel';
import { useRouter } from 'next/navigation';
import { proposeTrade } from '../../services/trade';
import { createTrade, createTradeV1, approveERC1155ForTrading, isERC1155ApprovedForTrading, approveNFTForTrading, batchApproveNFTsForTrading, isNFTApprovedForTrading, isVaultApprovedForTrading, approveVaultForTrading } from '../../services/blockchain';
import { getUserVaultReceipts } from '../../services/vault';
import { isERC1155NFT } from '../config/verifiedNFTs';
import { NFT_VAULT_ADDRESS } from '../../lib/contracts';
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
  isVaultReceipt?: boolean;
}

// Maximum NFT limit per side of trade
const MAX_NFTS_PER_SIDE = 12;

interface TradeState {
  userCollections: any[];
  userNFTsByCollection: Record<string, NFTWithCount[]>;
  counterpartyCollections: any[];
  counterpartyNFTsByCollection: Record<string, NFTWithCount[]>;
  userSelectedNFTs: NFTWithCount[];
  counterpartySelectedNFTs: NFTWithCount[];
  isLoadingUser: boolean;
  isLoadingCounterparty: boolean;
  error: string | null;
  quantitySelectNFT: NFTWithCount | null;
  userETHAmount: string;
  counterpartyETHAmount: string;
  userBalance: string;
  counterpartyBalance: string;
}

// Format balance to 2 decimal places
const formatBalance = (balance: string) => {
  const num = parseFloat(balance);
  return num.toFixed(2);
};

// Address validation utilities
const isValidEvmAddress = (address: string): boolean => {
  // EVM addresses are 42 characters long, start with 0x, and contain only hex characters
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const detectAddressType = (address: string): 'evm' | 'solana' | 'bitcoin' | 'unknown' => {
  if (isValidEvmAddress(address)) return 'evm';
  
  // Solana addresses are base58 encoded, typically 32-44 characters
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) && !address.includes('0') && !address.includes('O') && !address.includes('I') && !address.includes('l')) {
    return 'solana';
  }
  
  // Bitcoin addresses start with 1, 3, or bc1
  if (/^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(address)) {
    return 'bitcoin';
  }
  
  return 'unknown';
};

// Trade Header Component - Steam style with address validation
const TradeHeader = ({ 
  counterpartyAddress, 
  onCounterpartyAddressChange, 
  isLoadingCounterparty 
}: {
  counterpartyAddress: string;
  onCounterpartyAddressChange: (address: string) => void;
  isLoadingCounterparty: boolean;
}) => {
  const addressType = counterpartyAddress ? detectAddressType(counterpartyAddress) : null;
  const isValidAddress = addressType === 'evm';
  const hasInvalidAddress = counterpartyAddress.length > 10 && !isValidAddress;

  return (
    <div className="transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-900 dark:text-white font-medium text-sm sm:text-base">This Trade:</span>
          </div>
          <span className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">You are trading with</span>
          <div className="relative flex-1 sm:flex-none">
            <input
              type="text"
              value={counterpartyAddress}
              onChange={(e) => onCounterpartyAddressChange(e.target.value)}
              placeholder="Enter EVM address (0x...)"
              className={`w-full sm:min-w-[300px] bg-white/20 dark:bg-gray-800/20 backdrop-blur-md border rounded-xl px-3 py-1.5 text-gray-900 dark:text-gray-300 text-sm focus:outline-none focus:ring-2 transition-all duration-300 shadow-lg placeholder-gray-600 dark:placeholder-gray-300 ${
                hasInvalidAddress 
                  ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/70' 
                  : isValidAddress
                  ? 'border-green-500/50 focus:ring-green-500/50 focus:border-green-500/70'
                  : 'border-white/30 dark:border-gray-600/30 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-transparent'
              }`}
            />
            {isLoadingCounterparty && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

      </div>
      
      {/* Address validation notice */}
      {hasInvalidAddress && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5">
              ⚠️
            </div>
            <div className="flex-1">
              <p className="text-red-300 font-medium text-sm mb-1">
                Invalid Address Format
              </p>
              <p className="text-red-200 text-xs mb-2">
                {addressType === 'solana' && 'This appears to be a Solana address. This platform uses Ethereum-compatible addresses.'}
                {addressType === 'bitcoin' && 'This appears to be a Bitcoin address. This platform uses Ethereum-compatible addresses.'}
                {addressType === 'unknown' && 'This address format is not recognized.'}
              </p>
              <p className="text-gray-300 text-xs">
                <strong>Required:</strong> EVM-compatible address starting with <code className="bg-gray-800 px-1 rounded">0x</code> (42 characters total)
              </p>
              <p className="text-gray-400 text-xs mt-1">
                <strong>Example:</strong> <code className="bg-gray-800 px-1 rounded text-green-400">0x742d35Cc6634C0532925a3b8D4e4F7F6e7546c65</code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function TradeInterface({ userAddress, TradePanelComponent }: TradeInterfaceProps) {
  const { data: walletClient } = useWalletClient();
  const isMounted = useIsMounted();
  const router = useRouter();
  const [counterpartyAddress, setCounterpartyAddress] = useState('');
  const [tradeMessage, setTradeMessage] = useState('');
  const [isCreatingTrade, setIsCreatingTrade] = useState(false);
  const [erc1155Approvals, setErc1155Approvals] = useState<Record<string, boolean>>({});
  const [isApprovingERC1155, setIsApprovingERC1155] = useState<string | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [isProposing, setIsProposing] = useState(false);
  const [shareModalUrl, setShareModalUrl] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState<number | string>(1);
  
  // UI tabs & helpers
  const [activeTab, setActiveTab] = useState<'your' | 'their'>('your');
  const [activeETHTab, setActiveETHTab] = useState<'your' | 'their'>('your');
  const [showLimitInfo, setShowLimitInfo] = useState(false);

  // ---------- CORE STATE ----------
  // Must be declared before any hooks that reference `state`
  const [state, setState] = useState<TradeState>({
    userCollections: [],
    userNFTsByCollection: {},
    counterpartyCollections: [],
    counterpartyNFTsByCollection: {},
    userSelectedNFTs: [],
    counterpartySelectedNFTs: [],
    isLoadingUser: false,
    isLoadingCounterparty: false,
    error: null,
    quantitySelectNFT: null,
    userETHAmount: '',
    counterpartyETHAmount: '',
    userBalance: '0',
    counterpartyBalance: '0'
  });

  // Local UI state for filters in mobile lists
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'floor-asc' | 'floor-desc'>('floor-asc');

  const [userVerifiedHoldings, setUserVerifiedHoldings] = useState<VerifiedNFTHolding[]>([]);
  const [isLoadingVerifiedNFTs, setIsLoadingVerifiedNFTs] = useState(false);
  const [counterpartyVerifiedHoldings, setCounterpartyVerifiedHoldings] = useState<VerifiedNFTHolding[]>([]);
  const [isLoadingCounterpartyVerifiedNFTs, setIsLoadingCounterpartyVerifiedNFTs] = useState(false);
  
  // Vault receipts state
  const [userVaultReceipts, setUserVaultReceipts] = useState<any[]>([]);
  const [isLoadingVaultReceipts, setIsLoadingVaultReceipts] = useState(false);

  // Load vault receipts for user
  useEffect(() => {
    if (userAddress && isMounted) {
      console.log('🏦 Loading vault receipts for:', userAddress);
      setIsLoadingVaultReceipts(true);
      
      getUserVaultReceipts(userAddress)
        .then(receipts => {
          console.log('🎫 Vault receipts loaded:', receipts.length);
          setUserVaultReceipts(receipts);
        })
        .catch(error => {
          console.error('Error loading vault receipts:', error);
          setUserVaultReceipts([]);
        })
        .finally(() => {
          setIsLoadingVaultReceipts(false);
        });
    } else {
      setUserVaultReceipts([]);
    }
  }, [userAddress, isMounted]);

  // Note: Vault receipt trading requires fhevmjs integration (future feature)
  // For now, vault is used for private storage only

  // Direct verified NFT checker - bypasses collections API
  useEffect(() => {
    if (userAddress && isMounted) {
      console.log('🚀 DIRECTLY CHECKING VERIFIED NFTS FOR:', userAddress);
      setIsLoadingVerifiedNFTs(true);
      
      console.log('🚀 FETCHING USER NFTS from Alchemy for:', userAddress);
      getVerifiedNFTsUserHoldsSmart(userAddress)
        .then(holdings => {
          console.log('🎯 USER HOLDINGS RESULT from Alchemy:', holdings);
          console.log('🎯 Holdings count:', holdings.length);
          if (holdings.length > 0) {
            holdings.forEach((holding, index) => {
              console.log(`🎯 Collection ${index + 1}:`, {
                name: holding.collectionName,
                id: holding.collectionId,
                tokenCount: holding.tokens.length
              });
            });
          }
          setUserVerifiedHoldings(holdings);
          
          if (holdings.length > 0) {
            console.log(`✅ USER HOLDS ${holdings.length} VERIFIED COLLECTIONS!`);
            holdings.forEach(holding => {
              console.log(`✅ ${holding.collectionName}: ${holding.tokens.length} tokens`);
            });
          } else {
            console.log('❌ No verified NFTs found for this wallet');
          }
        })
        .catch(error => {
          console.error('❌ Error checking verified NFTs:', error);
        })
        .finally(() => {
          setIsLoadingVerifiedNFTs(false);
        });
    }
  }, [userAddress, isMounted]);

  // Direct verified NFT checker for counterparty
  useEffect(() => {
    if (counterpartyAddress && isMounted && counterpartyAddress.length >= 35 && counterpartyAddress.startsWith('0x')) {
      console.log('🚀 CHECKING COUNTERPARTY VERIFIED NFTS FOR:', counterpartyAddress);
      setIsLoadingCounterpartyVerifiedNFTs(true);
      
      getVerifiedNFTsUserHoldsSmart(counterpartyAddress)
        .then(holdings => {
          console.log('🎯 COUNTERPARTY HOLDINGS from Alchemy:', holdings);
          setCounterpartyVerifiedHoldings(holdings);
          
          if (holdings.length > 0) {
            console.log(`✅ COUNTERPARTY HOLDS ${holdings.length} VERIFIED COLLECTIONS!`);
            holdings.forEach(holding => {
              console.log(`✅ ${holding.collectionName}: ${holding.tokens.length} tokens`);
            });
          } else {
            console.log('❌ No verified NFTs found for counterparty wallet');
          }
        })
        .catch(error => {
          console.error('❌ Error checking counterparty verified NFTs:', error);
        })
        .finally(() => {
          setIsLoadingCounterpartyVerifiedNFTs(false);
        });
    } else {
      // Clear counterparty holdings if address is invalid
      setCounterpartyVerifiedHoldings([]);
      setIsLoadingCounterpartyVerifiedNFTs(false);
    }
  }, [counterpartyAddress, isMounted]);

  // Get user balance
  const { data: userBalanceData } = useBalance({
    address: userAddress as unknown as `0x${string}`,
  });

  // Get counterparty balance  
  const { data: counterpartyBalanceData } = useBalance({
    address: isValidEvmAddress(counterpartyAddress) ? (counterpartyAddress as unknown as `0x${string}`) : undefined,
  });

  // Update balances
  useEffect(() => {
    if (userBalanceData?.formatted) {
      setState(prev => ({ ...prev, userBalance: userBalanceData.formatted }));
    }
  }, [userBalanceData]);

  useEffect(() => {
    if (counterpartyBalanceData?.formatted) {
      setState(prev => ({ ...prev, counterpartyBalance: counterpartyBalanceData.formatted }));
    }
  }, [counterpartyBalanceData]);

  const handleUserSelect = (nft: NFTWithCount) => {
    const existingIndex = state.userSelectedNFTs.findIndex(
      selected => selected.tokenId === nft.tokenId && selected.contractAddress === nft.contractAddress
    );

    if (existingIndex >= 0) {
      // Remove NFT if already selected
      setState(prev => ({
        ...prev,
        userSelectedNFTs: prev.userSelectedNFTs.filter((_, index) => index !== existingIndex)
      }));
      return;
    }

    // Check if adding this NFT would exceed the 12-item limit
    const currentTotalCount = state.userSelectedNFTs.reduce((total, selectedNft) => total + selectedNft.selectedCount, 0);
    if (currentTotalCount >= MAX_NFTS_PER_SIDE) {
      setState(prev => ({ ...prev, error: `Maximum ${MAX_NFTS_PER_SIDE} items can be offered per trade. Remove some items first.` }));
      return;
    }

    // Add NFT if not selected
    setState(prev => ({
      ...prev,
      userSelectedNFTs: [...prev.userSelectedNFTs, { ...nft, selectedCount: 1 }]
    }));
  };

  const handleCounterpartySelect = (nft: NFTWithCount) => {
    const existingIndex = state.counterpartySelectedNFTs.findIndex(
      selected => selected.tokenId === nft.tokenId && selected.contractAddress === nft.contractAddress
    );

    if (existingIndex >= 0) {
      // Remove NFT if already selected
      setState(prev => ({
        ...prev,
        counterpartySelectedNFTs: prev.counterpartySelectedNFTs.filter((_, index) => index !== existingIndex)
      }));
      return;
    }

    // Check if adding this NFT would exceed the 12-item limit
    const currentTotalCount = state.counterpartySelectedNFTs.reduce((total, selectedNft) => total + selectedNft.selectedCount, 0);
    if (currentTotalCount >= MAX_NFTS_PER_SIDE) {
      setState(prev => ({ ...prev, error: `Maximum ${MAX_NFTS_PER_SIDE} items can be requested per trade. Remove some items first.` }));
      return;
    }

    // Add NFT if not selected
    setState(prev => ({
      ...prev,
      counterpartySelectedNFTs: [...prev.counterpartySelectedNFTs, { ...nft, selectedCount: 1 }]
    }));
  };

  // Utility to remove an NFT selection directly (used by red × buttons)
  const removeSelectedNFT = (nft: NFTWithCount, isCounterparty: boolean) => {
    setState(prev => {
      const keyMatch = (selected: NFTWithCount) => selected.tokenId === nft.tokenId && selected.contractAddress === nft.contractAddress;
      const newState = { ...prev } as TradeState;
      if (isCounterparty) {
        newState.counterpartySelectedNFTs = prev.counterpartySelectedNFTs.filter(sel => !keyMatch(sel));
      } else {
        newState.userSelectedNFTs = prev.userSelectedNFTs.filter(sel => !keyMatch(sel));
      }
      return newState;
    });
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen text-gray-900 dark:text-white p-3 sm:p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Trade Header */}
        <div className="bg-white/10 dark:bg-gray-900/10 backdrop-blur-2xl border border-white/20 dark:border-gray-600/20 rounded-2xl p-4 sm:p-6 mb-6 shadow-2xl relative">
          {/* My Trades Button - Upper Right */}
          <div className="absolute top-4 right-4 z-10">
            <MyTrades variant="button" className="text-xs px-3 py-1.5 sm:text-sm sm:px-4 sm:py-2" />
          </div>
          
          <TradeHeader
            counterpartyAddress={counterpartyAddress}
            onCounterpartyAddressChange={setCounterpartyAddress}
            isLoadingCounterparty={false}
          />
        </div>

        {/* Trade Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
          {/* Your Items */}
          <div className="glass-card rounded-lg overflow-hidden">
            <div className="glass-light px-3 py-2 border-b border-white/20">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded flex items-center justify-center shadow">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 dark:text-white font-medium text-sm">Your items</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {state.userSelectedNFTs.length}/{MAX_NFTS_PER_SIDE}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Items you will give away
                  </div>
                </div>
              </div>
            </div>
            <div className="p-2 min-h-[70px]">
              {state.userSelectedNFTs.length === 0 && !parseFloat(state.userETHAmount) ? (
                <div className="flex items-center justify-center h-[70px] text-gray-600 dark:text-gray-500 transition-colors duration-300">
                  <p className="text-sm text-center">Waiting for you to offer one or more items</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {state.userSelectedNFTs.map((nft, index) => (
                    <div
                      key={`${nft.contractAddress}-${nft.tokenId}-${index}`}
                      className="relative group bg-gray-800 border border-gray-600 rounded overflow-hidden hover:border-red-500 transition-colors"
                    >
                      <div className="aspect-square bg-gray-700 flex items-center justify-center">
                        <SafeImage 
                          src={nft.image || '/placeholder.svg'} 
                          alt={nft.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1">
                        <div className="text-xs text-gray-300 text-center truncate">
                          {nft.name}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSelectedNFT(nft, false);
                        }}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {parseFloat(state.userETHAmount) > 0 && (
                    <div className="relative group bg-gray-800 border border-gray-600 rounded overflow-hidden hover:border-red-500 transition-colors">
                      <div className="aspect-square bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow p-2">
                        <div className="bg-blue-500 rounded-full w-full h-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">Ξ</span>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1">
                        <div className="text-xs text-gray-300 text-center">
                          {state.userETHAmount} ETH
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setState(prev => ({ ...prev, userETHAmount: '0' }));
                        }}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Their Items */}
          <div className="glass-card rounded-lg overflow-hidden">
            <div className="glass-light px-3 py-2 border-b border-white/20">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded flex items-center justify-center shadow">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 dark:text-white font-medium text-sm">Their items</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {state.counterpartySelectedNFTs.length}/{MAX_NFTS_PER_SIDE}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Items you will receive
                  </div>
                </div>
              </div>
            </div>
            <div className="p-2 min-h-[70px]">
              {state.counterpartySelectedNFTs.length === 0 && !parseFloat(state.counterpartyETHAmount) ? (
                <div className="flex items-center justify-center h-[70px] text-gray-600 dark:text-gray-500 transition-colors duration-300">
                  <p className="text-sm text-center">Waiting for you to request one or more items</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {state.counterpartySelectedNFTs.map((nft, index) => (
                    <div
                      key={`${nft.contractAddress}-${nft.tokenId}-${index}`}
                      className="relative group bg-gray-800 border border-gray-600 rounded overflow-hidden hover:border-red-500 transition-colors"
                    >
                      <div className="aspect-square bg-gray-700 flex items-center justify-center">
                        <SafeImage 
                          src={nft.image || '/placeholder.svg'} 
                          alt={nft.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1">
                        <div className="text-xs text-gray-300 text-center truncate">
                          {nft.name}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSelectedNFT(nft, true);
                        }}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {parseFloat(state.counterpartyETHAmount) > 0 && (
                    <div className="relative group bg-gray-800 border border-gray-600 rounded overflow-hidden">
                      <div className="aspect-square bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow p-2">
                        <div className="bg-blue-500 rounded-full w-full h-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">Ξ</span>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1">
                        <div className="text-xs text-gray-900 dark:text-gray-200 text-center">
                          {state.counterpartyETHAmount} ETH
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setState(prev => ({ ...prev, counterpartyETHAmount: '0' }));
                        }}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Tabbed Interface */}
        <div className="lg:hidden mb-3 sm:mb-4">
          <div className="glass-card rounded-2xl overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex border-b border-white/20">
              <div
                onClick={() => setActiveTab('your')}
                className={`flex-1 min-w-0 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'your'
                    ? 'text-gray-900 dark:text-white bg-white/20 dark:bg-gray-800/50 border-b-2 border-purple-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Your inventory</span>
                  {state.userSelectedNFTs.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-600 text-white">
                      {state.userSelectedNFTs.length}/{MAX_NFTS_PER_SIDE}
                    </span>
                  )}
                </div>
              </div>
              <div
                onClick={() => setActiveTab('their')}
                className={`flex-1 min-w-0 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'their'
                    ? 'text-gray-900 dark:text-white bg-white/20 dark:bg-gray-800/50 border-b-2 border-purple-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Their inventory</span>
                  {state.counterpartySelectedNFTs.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-600 text-white">
                      {state.counterpartySelectedNFTs.length}/{MAX_NFTS_PER_SIDE}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="h-[600px] overflow-y-auto thin-scrollbar">
              {activeTab === 'your' ? (
                <>
                  {isLoadingVerifiedNFTs ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Loading your NFTs...</span>
                    </div>
                  ) : userVerifiedHoldings.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-600 dark:text-gray-500">
                        <div className="w-12 h-12 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        </div>
                        <p className="text-base font-medium mb-2">No NFTs found</p>
                        <p className="text-sm">Connect a wallet with NFTs to start trading</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 space-y-6">
                      {/* Vault Receipts Section - ENABLED! */}
                      {userVaultReceipts.length > 0 && (
                        <div className="space-y-4 pb-6 border-b border-blue-500/30">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                              <span>🎫</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-blue-400 text-base">
                                  Vault Receipts (Private)
                                </h3>
                                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="text-sm text-gray-400">
                                {userVaultReceipts.length} encrypted receipt{userVaultReceipts.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {userVaultReceipts.map((receipt) => {
                              const isSelected = state.userSelectedNFTs.some(
                                selected => selected.tokenId === receipt.receiptId
                              );

                              const currentTotalCount = state.userSelectedNFTs.reduce((total, selectedNft) => total + selectedNft.selectedCount, 0);
                              const isLimitReached = currentTotalCount >= MAX_NFTS_PER_SIDE && !isSelected;

                              return (
                                <div
                                  key={receipt.receiptId}
                                  onClick={() => {
                                    if (!isLimitReached) {
                                      // Add vault receipt as a selectable item
                                      const receiptNFT = {
                                        tokenId: receipt.receiptId,
                                        name: `Receipt #${receipt.receiptId.slice(0, 8)}...`,
                                        description: '🔐 Encrypted NFT',
                                        image: '/placeholder.svg',
                                        contractAddress: NFT_VAULT_ADDRESS,
                                        collectionId: NFT_VAULT_ADDRESS,
                                        ownership: { tokenCount: '1' },
                                        floorPrice: 0,
                                        selectedCount: 1,
                                        ownedCount: 1,
                                        collectionName: 'Vault Receipt',
                                        isCounterparty: false,
                                        standard: 'ERC721' as 'ERC721' | 'ERC1155',
                                        balance: '1',
                                        isVaultReceipt: true
                                      };
                                      handleUserSelect(receiptNFT);
                                    }
                                  }}
                                  className={`relative rounded p-1 transition-all duration-200 backdrop-blur-sm ${
                                    isLimitReached 
                                      ? 'opacity-50 cursor-not-allowed' 
                                      : 'cursor-pointer hover:scale-105'
                                  } ${
                                    isSelected 
                                      ? 'bg-blue-500/20 border-2 border-blue-500 shadow-lg' 
                                      : isLimitReached
                                      ? 'bg-gray-500/10 border border-gray-500/30'
                                      : 'bg-blue-500/10 border-2 border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/20'
                                  }`}
                                >
                                  <div className="aspect-square bg-gradient-to-br from-blue-600 to-purple-600 rounded overflow-hidden relative flex items-center justify-center">
                                    <div className="text-4xl">🎫</div>
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                      <div className="text-white text-xs font-bold">🔐</div>
                                    </div>
                                  </div>
                                  <div className="text-xs font-medium text-blue-400 text-center truncate mt-0.5">
                                    #{receipt.receiptId.slice(0, 6)}...
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Regular NFTs Section */}
                      {userVerifiedHoldings.map((holding) => (
                        <div key={holding.collectionId} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8">
                              {holding.collectionImage ? (
                                <SafeImage
                                  src={holding.collectionImage}
                                  alt={holding.collectionName}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : null}
                              <div className={`w-full h-full bg-green-500 rounded-full flex items-center justify-center ${holding.collectionImage ? 'hidden' : ''}`}>
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                                  {holding.collectionName}
                                </h3>
                                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                {holding.collectionFloorPrice && holding.collectionFloorPrice > 0 
                                  ? `Floor: ${holding.collectionFloorPrice.toFixed(4)} ETH`
                                  : 'No floor price'
                                }
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {holding.tokens.map((nft) => {
                              const isSelected = state.userSelectedNFTs.some(
                                selected => selected.tokenId === nft.tokenId && selected.contractAddress === holding.collectionId
                              );

                              const nftWithCount = {
                                tokenId: nft.tokenId,
                                name: nft.name,
                                description: '',
                                image: nft.image,
                                collectionId: holding.collectionId,
                                contractAddress: holding.collectionId,
                                ownership: { tokenCount: nft.tokenCount },
                                floorPrice: nft.floorPrice / 1000,
                                selectedCount: 0,
                                ownedCount: parseInt(nft.tokenCount),
                                collectionName: holding.collectionName,
                                isCounterparty: false,
                                standard: (isERC1155NFT(holding.collectionId) ? 'ERC1155' : 'ERC721') as 'ERC721' | 'ERC1155',
                                balance: nft.tokenCount
                              };

                              const currentTotalCount = state.userSelectedNFTs.reduce((total, selectedNft) => total + selectedNft.selectedCount, 0);
                              const isLimitReached = currentTotalCount >= MAX_NFTS_PER_SIDE && !isSelected;
                              
                              return (
                                <div
                                  key={`${holding.collectionId}-${nft.tokenId}`}
                                  onClick={() => !isLimitReached && handleUserSelect(nftWithCount)}
                                  className={`relative rounded p-1 transition-all duration-200 backdrop-blur-sm ${
                                    isLimitReached 
                                      ? 'opacity-50 cursor-not-allowed' 
                                      : 'cursor-pointer hover:scale-105'
                                  } ${
                                    isSelected 
                                      ? 'bg-blue-500/20 border border-blue-500/50 shadow-lg' 
                                      : isLimitReached
                                      ? 'bg-gray-500/10 border border-gray-500/30'
                                      : 'bg-white/10 dark:bg-gray-800/20 border border-white/20 dark:border-gray-600/30 hover:border-blue-400/50 hover:bg-white/20 dark:hover:bg-gray-800/30'
                                  }`}
                                >
                                  <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative">
                                    <SafeImage
                                      src={nft.image || '/placeholder.svg'}
                                      alt={nft.name}
                                      className="w-full h-full object-cover"
                                    />
                                    {parseInt(nft.tokenCount || "1") > 1 && (
                                      <div className="absolute top-1 left-1 bg-purple-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                        ×{nft.tokenCount}
                                      </div>
                                    )}
                                    {isLimitReached && (
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <div className="bg-red-600 text-white text-xs px-2 py-1 rounded-md font-medium">
                                          Limit Reached
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs font-medium text-gray-900 dark:text-white text-center truncate mt-0.5">
                                    #{nft.tokenId}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {!counterpartyAddress ? (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-500">
                      <div className="text-center text-base">
                        <p>Enter a counterparty address above to view their inventory</p>
                      </div>
                    </div>
                  ) : isLoadingCounterpartyVerifiedNFTs ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <div className="text-sm text-gray-400">Loading their NFTs...</div>
                    </div>
                  ) : (
                    counterpartyVerifiedHoldings.length > 0 ? (
                      <div className="p-4 space-y-6">
                        {counterpartyVerifiedHoldings.map((holding) => (
                          <div key={holding.collectionId} className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8">
                                {holding.collectionImage ? (
                                  <SafeImage 
                                    src={holding.collectionImage} 
                                    alt={holding.collectionName}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : null}
                                <div className={`w-full h-full bg-green-500 rounded-full flex items-center justify-center ${holding.collectionImage ? 'hidden' : ''}`}>
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                                    {holding.collectionName}
                                  </h3>
                                  <svg className="w-4 h-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                  {holding.collectionFloorPrice && holding.collectionFloorPrice > 0 
                                    ? `Floor: ${holding.collectionFloorPrice.toFixed(4)} ETH`
                                    : 'No floor price'
                                  }
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                              {holding.tokens.map((nft) => {
                                const isSelected = state.counterpartySelectedNFTs.some(
                                  selected => selected.tokenId === nft.tokenId && selected.contractAddress === holding.collectionId
                                );

                                const nftWithCount = {
                                  tokenId: nft.tokenId,
                                  name: nft.name,
                                  description: '',
                                  image: nft.image,
                                  collectionId: holding.collectionId,
                                  contractAddress: holding.collectionId,
                                  ownership: { tokenCount: nft.tokenCount },
                                  floorPrice: nft.floorPrice / 1000,
                                  selectedCount: 0,
                                  ownedCount: parseInt(nft.tokenCount),
                                  collectionName: holding.collectionName,
                                  isCounterparty: true,
                                  standard: (isERC1155NFT(holding.collectionId) ? 'ERC1155' : 'ERC721') as 'ERC721' | 'ERC1155',
                                  balance: nft.tokenCount
                                };

                                const counterpartyTotalCount = state.counterpartySelectedNFTs.reduce((total, selectedNft) => total + selectedNft.selectedCount, 0);
                                const isLimitReached = counterpartyTotalCount >= MAX_NFTS_PER_SIDE && !isSelected;
                                
                                return (
                                  <div
                                    key={`${holding.collectionId}-${nft.tokenId}`}
                                    onClick={() => !isLimitReached && handleCounterpartySelect(nftWithCount)}
                                    className={`relative rounded p-1 transition-all duration-200 backdrop-blur-sm ${
                                      isLimitReached 
                                        ? 'opacity-50 cursor-not-allowed' 
                                        : 'cursor-pointer hover:scale-105'
                                    } ${
                                      isSelected 
                                        ? 'bg-green-500/20 border border-green-500/50 shadow-lg' 
                                        : isLimitReached
                                        ? 'bg-gray-500/10 border border-gray-500/30'
                                        : 'bg-white/10 dark:bg-gray-800/20 border border-white/20 dark:border-gray-600/30 hover:border-green-400/50 hover:bg-white/20 dark:hover:bg-gray-800/30'
                                    }`}
                                  >
                                    <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative">
                                      <SafeImage
                                        src={nft.image || '/placeholder.svg'}
                                        alt={nft.name}
                                        className="w-full h-full object-cover"
                                      />
                                      {parseInt(nft.tokenCount || "1") > 1 && (
                                        <div className="absolute top-1 left-1 bg-purple-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                          ×{nft.tokenCount}
                                        </div>
                                      )}
                                      {isLimitReached && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                          <div className="bg-red-600 text-white text-xs px-2 py-1 rounded-md font-medium">
                                            Limit Reached
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-xs font-medium text-gray-900 dark:text-white text-center truncate mt-0.5">
                                      #{nft.tokenId}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-600 dark:text-gray-500">
                        <div className="w-8 h-8 mx-auto mb-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        </div>
                        <p className="text-sm">No verified NFTs found</p>
                        <p className="text-xs mt-1">This address has no verified collections</p>
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Inventory Sections */}
        <div className="hidden lg:grid grid-cols-2 gap-4 mb-3 sm:mb-4">
          {/* Your inventory */}
          <div className="glass-card rounded-lg overflow-hidden">
            <div className="glass-light px-3 py-2 border-b border-white/20">
              <span className="text-gray-900 dark:text-white font-medium text-sm">Your inventory</span>
            </div>
            <div className="h-[600px] overflow-y-auto thin-scrollbar">
              {isLoadingVerifiedNFTs ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Loading your NFTs...</span>
                </div>
              ) : userVerifiedHoldings.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-600 dark:text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-base font-medium mb-2">No NFTs found</p>
                    <p className="text-sm">Connect a wallet with NFTs to start trading</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-6">
                  {/* Vault Receipts Section - Desktop - ENABLED! */}
                  {userVaultReceipts.length > 0 && (
                    <div className="space-y-4 pb-6 border-b border-blue-500/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <span>🎫</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-blue-400 text-base">
                              Vault Receipts (Private)
                            </h3>
                            <svg className="w-4 h-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="text-sm text-gray-400">
                            {userVaultReceipts.length} encrypted receipt{userVaultReceipts.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        {userVaultReceipts.map((receipt) => {
                          const isSelected = state.userSelectedNFTs.some(
                            selected => selected.tokenId === receipt.receiptId
                          );

                          const currentTotalCount = state.userSelectedNFTs.reduce((total, selectedNft) => total + selectedNft.selectedCount, 0);
                          const isLimitReached = currentTotalCount >= MAX_NFTS_PER_SIDE && !isSelected;

                          return (
                            <div
                              key={receipt.receiptId}
                              onClick={() => {
                                if (!isLimitReached) {
                                  const receiptNFT = {
                                    tokenId: receipt.receiptId,
                                    name: `Receipt #${receipt.receiptId.slice(0, 8)}...`,
                                    description: '🔐 Encrypted NFT',
                                    image: '/placeholder.svg',
                                    contractAddress: NFT_VAULT_ADDRESS,
                                    collectionId: NFT_VAULT_ADDRESS,
                                    ownership: { tokenCount: '1' },
                                    floorPrice: 0,
                                    selectedCount: 1,
                                    ownedCount: 1,
                                    collectionName: 'Vault Receipt',
                                    isCounterparty: false,
                                    standard: 'ERC721' as 'ERC721' | 'ERC1155',
                                    balance: '1',
                                    isVaultReceipt: true
                                  };
                                  handleUserSelect(receiptNFT);
                                }
                              }}
                              className={`relative rounded p-1 transition-all duration-200 backdrop-blur-sm ${
                                isLimitReached 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : 'cursor-pointer hover:scale-105'
                              } ${
                                isSelected 
                                  ? 'bg-blue-500/20 border-2 border-blue-500 shadow-lg' 
                                  : isLimitReached
                                  ? 'bg-gray-500/10 border border-gray-500/30'
                                  : 'bg-blue-500/10 border-2 border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/20'
                              }`}
                            >
                              <div className="aspect-square bg-gradient-to-br from-blue-600 to-purple-600 rounded overflow-hidden relative flex items-center justify-center">
                                <div className="text-4xl">🎫</div>
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <div className="text-white text-xs font-bold">🔐</div>
                                </div>
                              </div>
                              <div className="text-xs font-medium text-blue-400 text-center truncate mt-0.5">
                                #{receipt.receiptId.slice(0, 6)}...
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Regular NFTs - Desktop */}
                  {userVerifiedHoldings.map((holding) => (
                    <div key={holding.collectionId} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8">
                          {holding.collectionImage ? (
                            <SafeImage
                              src={holding.collectionImage}
                              alt={holding.collectionName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                            {holding.collectionName}
                          </h3>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {holding.collectionFloorPrice && holding.collectionFloorPrice > 0 
                              ? `Floor: ${holding.collectionFloorPrice.toFixed(4)} ETH`
                              : 'No floor price'
                            }
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {holding.tokens.map((nft) => {
                          const isSelected = state.userSelectedNFTs.some(
                            selected => selected.tokenId === nft.tokenId && selected.contractAddress === holding.collectionId
                          );
                          const nftWithCount = {
                            tokenId: nft.tokenId,
                            name: nft.name,
                            description: '',
                            image: nft.image,
                            collectionId: holding.collectionId,
                            contractAddress: holding.collectionId,
                            ownership: { tokenCount: nft.tokenCount },
                            floorPrice: nft.floorPrice / 1000,
                            selectedCount: 0,
                            ownedCount: parseInt(nft.tokenCount),
                            collectionName: holding.collectionName,
                            isCounterparty: false,
                            standard: (isERC1155NFT(holding.collectionId) ? 'ERC1155' : 'ERC721') as 'ERC721' | 'ERC1155',
                            balance: nft.tokenCount
                          };
                          return (
                            <div
                              key={`${holding.collectionId}-${nft.tokenId}`}
                              onClick={() => handleUserSelect(nftWithCount)}
                              className={`relative rounded p-1 transition-all duration-200 cursor-pointer hover:scale-105 ${
                                isSelected 
                                  ? 'bg-blue-500/20 border border-blue-500/50 shadow-lg' 
                                  : 'bg-white/10 dark:bg-gray-800/20 border border-white/20 dark:border-gray-600/30 hover:border-blue-400/50'
                              }`}
                            >
                              <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                                <SafeImage
                                  src={nft.image || '/placeholder.svg'}
                                  alt={nft.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="text-xs text-gray-900 dark:text-white text-center truncate mt-1">
                                #{nft.tokenId}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Their inventory */}
          <div className="glass-card rounded-lg overflow-hidden">
            <div className="glass-light px-3 py-2 border-b border-white/20">
              <span className="text-gray-900 dark:text-white font-medium text-sm">Their inventory</span>
            </div>
            <div className="h-[600px] overflow-y-auto thin-scrollbar">
              {!counterpartyAddress ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <p>Enter a counterparty address above to view their inventory</p>
                  </div>
                </div>
              ) : isLoadingCounterpartyVerifiedNFTs ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-sm text-gray-400">Loading their NFTs...</div>
                </div>
              ) : counterpartyVerifiedHoldings.length > 0 ? (
                <div className="p-4 space-y-6">
                  {counterpartyVerifiedHoldings.map((holding) => (
                    <div key={holding.collectionId} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8">
                          {holding.collectionImage ? (
                            <SafeImage 
                              src={holding.collectionImage} 
                              alt={holding.collectionName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                            {holding.collectionName}
                          </h3>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {holding.collectionFloorPrice && holding.collectionFloorPrice > 0 
                              ? `Floor: ${holding.collectionFloorPrice.toFixed(4)} ETH`
                              : 'No floor price'
                            }
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {holding.tokens.map((nft) => {
                          const isSelected = state.counterpartySelectedNFTs.some(
                            selected => selected.tokenId === nft.tokenId && selected.contractAddress === holding.collectionId
                          );
                          const nftWithCount = {
                            tokenId: nft.tokenId,
                            name: nft.name,
                            description: '',
                            image: nft.image,
                            collectionId: holding.collectionId,
                            contractAddress: holding.collectionId,
                            ownership: { tokenCount: nft.tokenCount },
                            floorPrice: nft.floorPrice / 1000,
                            selectedCount: 0,
                            ownedCount: parseInt(nft.tokenCount),
                            collectionName: holding.collectionName,
                            isCounterparty: true,
                            standard: (isERC1155NFT(holding.collectionId) ? 'ERC1155' : 'ERC721') as 'ERC721' | 'ERC1155',
                            balance: nft.tokenCount
                          };
                          return (
                            <div
                              key={`${holding.collectionId}-${nft.tokenId}`}
                              onClick={() => handleCounterpartySelect(nftWithCount)}
                              className={`relative rounded p-1 transition-all duration-200 cursor-pointer hover:scale-105 ${
                                isSelected 
                                  ? 'bg-green-500/20 border border-green-500/50 shadow-lg' 
                                  : 'bg-white/10 dark:bg-gray-800/20 border border-white/20 dark:border-gray-600/30 hover:border-green-400/50'
                              }`}
                            >
                              <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                                <SafeImage
                                  src={nft.image || '/placeholder.svg'}
                                  alt={nft.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="text-xs text-gray-900 dark:text-white text-center truncate mt-1">
                                #{nft.tokenId}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-600 dark:text-gray-500">
                  <div className="w-8 h-8 mx-auto mb-2 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-sm">No verified NFTs found</p>
                  <p className="text-xs mt-1">This address has no verified collections</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile ETH Tabbed Interface */}
        <div className="sm:hidden mb-3 sm:mb-4">
          <div className="glass-card rounded-2xl overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex w-full border-b border-white/20">
              <button
                onClick={() => setActiveETHTab('your')}
                className={`flex-1 min-w-0 px-2 py-2 text-xs font-medium transition-colors ${
                  activeETHTab === 'your'
                    ? 'text-gray-900 dark:text-white bg-white/20 dark:bg-gray-800/50 border-b-2 border-purple-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-1 w-full">
                  <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-[8px]">Ξ</span>
                  </div>
                  <span className="truncate block text-center">Your ETH</span>
                </div>
              </button>
              <button
                onClick={() => setActiveETHTab('their')}
                className={`flex-1 min-w-0 px-2 py-2 text-xs font-medium transition-colors ${
                  activeETHTab === 'their'
                    ? 'text-gray-900 dark:text-white bg-white/20 dark:bg-gray-800/50 border-b-2 border-purple-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-1 w-full">
                  <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-[8px]">Ξ</span>
                  </div>
                  <span className="truncate block text-center">Their ETH</span>
                </div>
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {activeETHTab === 'your' ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="number"
                      value={state.userETHAmount}
                      onChange={(e) => setState(prev => ({ ...prev, userETHAmount: e.target.value }))}
                      placeholder="0.00"
                      className="flex-1 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="text-xs text-gray-900 dark:text-gray-200">
                    Available: {formatBalance(state.userBalance)} ETH
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="number"
                      value={state.counterpartyETHAmount}
                      onChange={(e) => setState(prev => ({ ...prev, counterpartyETHAmount: e.target.value }))}
                      placeholder="0.00"
                      className="flex-1 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-300"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="text-xs text-gray-900 dark:text-gray-200">
                    Available: {formatBalance(state.counterpartyBalance)} ETH
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Desktop ETH Amount Container */}
        <div className="hidden sm:grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
          {/* Your ETH */}
          <div className="glass-card rounded-lg overflow-hidden">
            <div className="glass-light px-3 py-2 border-b border-white/20">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">Ξ</span>
                </div>
                <span className="font-medium text-sm text-gray-900 dark:text-white">Your ETH</span>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={state.userETHAmount}
                  onChange={(e) => setState(prev => ({ ...prev, userETHAmount: e.target.value }))}
                  placeholder="0.00"
                  className="flex-1 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="text-xs text-gray-900 dark:text-gray-200 mt-1">
                Available: {formatBalance(state.userBalance)} ETH
              </div>
            </div>
          </div>

          {/* Their ETH */}
          <div className="glass-card rounded-lg overflow-hidden">
            <div className="glass-light px-3 py-2 border-b border-white/20">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">Ξ</span>
                </div>
                <span className="font-medium text-sm text-gray-900 dark:text-white">Counterparty ETH</span>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={state.counterpartyETHAmount}
                  onChange={(e) => setState(prev => ({ ...prev, counterpartyETHAmount: e.target.value }))}
                  placeholder="0.00"
                  className="flex-1 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-300"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="text-xs text-gray-900 dark:text-gray-200 mt-1">
                Available: {formatBalance(state.counterpartyBalance)} ETH
              </div>
            </div>
          </div>
        </div>

        {/* Trade Action Section */}
        <div className="mt-6">
          <div className="glass-card rounded-lg overflow-hidden">
            <div className="glass-light px-4 py-3 border-b border-white/20">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Trade Actions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Review your trade and propose when ready
              </p>
            </div>
            <div className="p-4">
              {/* Trade Message */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Trade Message (Optional)
                </label>
                <textarea
                  value={tradeMessage}
                  onChange={(e) => setTradeMessage(e.target.value)}
                  placeholder="Add a message for your trade partner..."
                  className="w-full bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {tradeMessage.length}/500 characters
                </div>
              </div>

              {/* Trade Summary */}
              <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Trade Summary:</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-700 dark:text-gray-300">You're giving:</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {state.userSelectedNFTs.length} NFTs
                      {parseFloat(state.userETHAmount || '0') > 0 && (
                        <span> + {state.userETHAmount} ETH</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700 dark:text-gray-300">You're requesting:</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {state.counterpartySelectedNFTs.length} NFTs
                      {parseFloat(state.counterpartyETHAmount || '0') > 0 && (
                        <span> + {state.counterpartyETHAmount} ETH</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Approval Status */}
                {state.userSelectedNFTs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        NFT Approval Status:
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Your NFTs will be checked for trading approval before escrow. First-time approval per collection requires a transaction.
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Clear all selections
                    setState(prev => ({
                      ...prev,
                      userSelectedNFTs: [],
                      counterpartySelectedNFTs: [],
                      userETHAmount: '',
                      counterpartyETHAmount: ''
                    }));
                    setTradeMessage('');
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
                >
                  Clear All
                </button>
                
                <button
                  onClick={async () => {
                    // Basic validation
                    if (!counterpartyAddress) {
                      toast.error('Please enter a counterparty address');
                      return;
                    }
                    
                    if (state.userSelectedNFTs.length === 0 && parseFloat(state.userETHAmount || '0') === 0) {
                      toast.error('Please select at least one NFT or add ETH to offer');
                      return;
                    }

                    if (state.counterpartySelectedNFTs.length === 0 && parseFloat(state.counterpartyETHAmount || '0') === 0) {
                      toast.error('Please select at least one NFT or add ETH to request');
                      return;
                    }

                    if (!userAddress || !walletClient) {
                      toast.error('Please connect your wallet');
                      return;
                    }

                    setIsProposing(true);
                    
                    try {
                      // Step 1: Auto-approve NFTs if needed
                      // Skip vault receipts - they're already in the vault and don't need approval
                      const regularNFTs = state.userSelectedNFTs.filter(nft => 
                        nft.contractAddress.toLowerCase() !== NFT_VAULT_ADDRESS.toLowerCase()
                      );
                      
                      if (regularNFTs.length > 0) {
                        toast.loading('Checking NFT approvals...', {
                          id: 'trade-creation',
                          duration: 0,
                          position: 'bottom-right',
                        });

                        const nftsToCheck = regularNFTs.map(nft => ({
                          contractAddress: nft.contractAddress,
                          tokenId: nft.tokenId,
                          standard: 'ERC721' as const
                        }));

                        const needsApprovalList: Array<{contractAddress: string, tokenId: string, standard: 'ERC721' | 'ERC1155'}> = [];

                        const vaultReceiptCount = state.userSelectedNFTs.length - regularNFTs.length;
                        if (vaultReceiptCount > 0) {
                          console.log(`\n🎫 Skipping ${vaultReceiptCount} vault receipt(s) - they're already in the vault!`);
                        }
                        console.log('\n🔍 AUTO APPROVAL: Checking', nftsToCheck.length, 'regular NFTs...');
                        
                        for (const nft of nftsToCheck) {
                          console.log(`\n📦 Checking NFT: ${nft.contractAddress}:${nft.tokenId}`);
                          
                          const isApproved = await isNFTApprovedForTrading(
                            nft.contractAddress,
                            nft.tokenId,
                            userAddress,
                            nft.standard
                          );
                          
                          console.log(`  → Result: ${isApproved ? '✅ APPROVED' : '❌ NOT APPROVED'}`);
                          
                          if (!isApproved) {
                            needsApprovalList.push(nft);
                          }
                        }

                        console.log(`\n📊 Approval Summary:`);
                        console.log(`  Total checked: ${nftsToCheck.length}`);
                        console.log(`  Need approval: ${needsApprovalList.length}`);
                        console.log(`  Already approved: ${nftsToCheck.length - needsApprovalList.length}`);

                        if (needsApprovalList.length > 0) {
                          toast.loading(`Approving ${needsApprovalList.length} NFT collection(s)...`, {
                            id: 'trade-creation',
                            duration: 0,
                          });

                          await batchApproveNFTsForTrading(
                            needsApprovalList,
                            walletClient,
                            (message, current, total) => {
                              toast.loading(`${message} (${current}/${total})`, {
                                id: 'trade-creation',
                                duration: 0,
                              });
                            }
                          );

                          console.log('✅ All NFTs approved!');
                        }
                      }

                      // Note: Vault receipt trading is a future feature (requires fhevmjs)
                      // For now, trade regular NFTs only (after withdrawing from vault if needed)

                      // Step 2: Create blockchain trade
                      // ✅ Detect if trading vault receipts (V1) or regular NFTs (old)
                      const userVaultReceipts = state.userSelectedNFTs.filter(nft => 
                        nft.contractAddress.toLowerCase() === NFT_VAULT_ADDRESS.toLowerCase()
                      );
                      const counterpartyVaultReceipts = state.counterpartySelectedNFTs.filter(nft => 
                        nft.contractAddress.toLowerCase() === NFT_VAULT_ADDRESS.toLowerCase()
                      );

                      const isVaultReceiptTrade = 
                        (state.userSelectedNFTs.length === userVaultReceipts.length) &&
                        (state.counterpartySelectedNFTs.length === counterpartyVaultReceipts.length);

                      let blockchainTradeId: string;

                      if (isVaultReceiptTrade) {
                        // ✅ NEW: V1 Receipt Trading (Simple, clean!)
                        console.log('\n🎫 Creating VAULT RECEIPT trade (V1)!');
                        
                        toast.loading('Preparing receipt trade...', {
                          id: 'trade-creation',
                          duration: 0,
                        });

                        // Check vault approval
                        if (userVaultReceipts.length > 0) {
                          const isVaultApproved = await isVaultApprovedForTrading(userAddress);
                          if (!isVaultApproved) {
                            toast.loading('Approving vault for trading...', {
                              id: 'trade-creation',
                              duration: 0,
                            });
                            await approveVaultForTrading(walletClient);
                          }
                        }

                        toast.loading('Creating receipt trade...', {
                          id: 'trade-creation',
                          duration: 0,
                        });

                        // Get receipt IDs from SELECTED NFTs (not all receipts!)
                        const selectedOfferedReceipts = state.userSelectedNFTs
                          .filter(nft => nft.contractAddress.toLowerCase() === NFT_VAULT_ADDRESS.toLowerCase())
                          .map(nft => nft.tokenId); // tokenId contains the receiptId
                        
                        const selectedRequestedReceipts = state.counterpartySelectedNFTs
                          .filter(nft => nft.contractAddress.toLowerCase() === NFT_VAULT_ADDRESS.toLowerCase())
                          .map(nft => nft.tokenId);
                        
                        console.log('🎫 Selected receipt IDs:');
                        console.log('  Offered:', selectedOfferedReceipts);
                        console.log('  Requested:', selectedRequestedReceipts);
                        
                        blockchainTradeId = await createTradeV1({
                          counterpartyAddress,
                          offeredReceiptIds: selectedOfferedReceipts,
                          requestedReceiptIds: selectedRequestedReceipts,
                          offeredETH: state.userETHAmount || '0',
                          requestedETH: state.counterpartyETHAmount || '0',
                          message: tradeMessage || ''
                        }, walletClient);

                        console.log('✅ Vault receipt trade created!', blockchainTradeId);
                      } else {
                        // ❌ OLD: Regular NFT trading (not supported for mixed trades)
                        if (userVaultReceipts.length > 0 || counterpartyVaultReceipts.length > 0) {
                          throw new Error('❌ Cannot mix vault receipts with regular NFTs in the same trade. Please trade only vault receipts or only regular NFTs.');
                        }

                        toast.loading('Preparing blockchain escrow...', {
                          id: 'trade-creation',
                          duration: 0,
                        });

                        const blockchainTradeParams = {
                          counterpartyAddress: counterpartyAddress,
                          userNFTs: state.userSelectedNFTs.map(nft => ({
                            contractAddress: nft.contractAddress,
                            tokenId: nft.tokenId
                          })),
                          counterpartyNFTs: state.counterpartySelectedNFTs.map(nft => ({
                            contractAddress: nft.contractAddress,
                            tokenId: nft.tokenId
                          })),
                          userETHAmount: state.userETHAmount || '0',
                          counterpartyETHAmount: state.counterpartyETHAmount || '0',
                          message: tradeMessage || ''
                        };

                        toast.loading('Sending NFTs to escrow contract...', {
                          id: 'trade-creation',
                          duration: 0,
                        });

                        // Execute blockchain trade creation (this will escrow the NFTs)
                        blockchainTradeId = await createTrade(blockchainTradeParams, walletClient);
                      }

                      // Step 3: Create Firebase record for shareable link
                      toast.loading('Creating shareable trade link...', {
                        id: 'trade-creation',
                        duration: 0,
                      });

                      const firebaseTradeId = await proposeTrade({
                        from: userAddress,
                        to: counterpartyAddress,
                        offer: state.userSelectedNFTs.map(nft => ({
                          contract: nft.contractAddress,
                          tokenId: nft.tokenId,
                          image: nft.image,
                          name: nft.name || `NFT #${nft.tokenId}`
                        })),
                        requested: state.counterpartySelectedNFTs.map(nft => ({
                          contract: nft.contractAddress,
                          tokenId: nft.tokenId,
                          image: nft.image,
                          name: nft.name || `NFT #${nft.tokenId}`
                        })),
                        offeredETH: state.userETHAmount,
                        requestedETH: state.counterpartyETHAmount,
                        message: tradeMessage,
                        blockchainTradeId: blockchainTradeId
                      });

                      toast.success('Trade offer created successfully! 🎉', {
                        id: 'trade-creation',
                        duration: 4000,
                      });

                      // Generate shareable link
                      const tradeUrl = `${window.location.origin}/trade/${firebaseTradeId}`;
                      console.log('🔗 Shareable trade URL:', tradeUrl);

                      // Show success modal with link
                      setShareModalUrl(tradeUrl);

                      // Clear form
                      setState(prev => ({
                        ...prev,
                        userSelectedNFTs: [],
                        counterpartySelectedNFTs: [],
                        userETHAmount: '',
                        counterpartyETHAmount: ''
                      }));
                      setTradeMessage('');
                      setCounterpartyAddress('');

                    } catch (error) {
                      console.error('❌ Trade creation failed:', error);
                      
                      // Handle specific error types
                      if (error.message?.includes('insufficient funds')) {
                        const errorString = error.toString();
                        const haveMatch = errorString.match(/have (\d+)/);
                        const wantMatch = errorString.match(/want (\d+)/);
                        
                        if (haveMatch && wantMatch) {
                          const haveWei = haveMatch[1];
                          const wantWei = wantMatch[1];
                          const haveEth = (parseFloat(haveWei) / 1e18).toFixed(4);
                          const wantEth = (parseFloat(wantWei) / 1e18).toFixed(4);
                          
                          toast.error(
                            `💸 Insufficient ETH Balance\n\nYou have: ${haveEth} ETH\nNeed: ${wantEth} ETH\n\nThe trade requires 0.01 ETH fee + your offered ETH + gas fees. Please add more ETH to your wallet.`,
                            {
                              id: 'trade-creation',
                              duration: 8000,
                              style: {
                                maxWidth: '400px',
                                whiteSpace: 'pre-line'
                              }
                            }
                          );
                        } else {
                          toast.error(
                            '💸 Insufficient ETH Balance\n\nYou need more ETH to create this trade. The platform requires 0.01 ETH fee + your offered ETH amount + gas fees.',
                            {
                              id: 'trade-creation',
                              duration: 6000,
                              style: {
                                maxWidth: '400px',
                                whiteSpace: 'pre-line'
                              }
                            }
                          );
                        }
                      } else if (error.message?.includes('User rejected')) {
                        toast.error('Transaction cancelled by user', {
                          id: 'trade-creation',
                          duration: 3000,
                        });
                      } else if (error.message?.includes('not approved')) {
                        toast.error(`❌ NFT Approval Error\n\n${error.message}`, {
                          id: 'trade-creation',
                          duration: 6000,
                          style: {
                            maxWidth: '400px',
                            whiteSpace: 'pre-line'
                          }
                        });
                      } else {
                        toast.error(`Failed to create trade: ${error.message}`, {
                          id: 'trade-creation',
                          duration: 5000,
                        });
                      }
                    } finally {
                      setIsProposing(false);
                    }
                  }}
                  disabled={isProposing || !counterpartyAddress || (state.userSelectedNFTs.length === 0 && parseFloat(state.userETHAmount || '0') === 0)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isProposing ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </div>
                  ) : (
                    'Propose Trade'
                  )}
                </button>
              </div>

              {/* Help Text */}
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                💡 Tip: Both parties need to have selected items or ETH for a valid trade proposal
              </div>
            </div>
          </div>
        </div>

        {/* Share Modal */}
        {shareModalUrl && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Trade Created! 🎉
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Your trade has been created and is now live on the blockchain. Share this link with the counterparty:
                </p>
                
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareModalUrl}
                      readOnly
                      className="flex-1 bg-transparent text-sm font-mono text-gray-700 dark:text-gray-300"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareModalUrl);
                        toast.success('Trade link copied!');
                      }}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShareModalUrl(null)}
                    className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => window.open(shareModalUrl, '_blank')}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    View Trade
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
