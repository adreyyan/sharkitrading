'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getTrade, updateTradeStatus, TradeProposal } from '@/services/trade';
import { acceptTrade, diagnoseTradeAcceptance, approveNFTsForTradeAcceptance, cancelTrade, declineTrade, getRequiredApprovalsForTrade } from '@/services/blockchain';
import ManualApprovalInterface from '@/app/components/ManualApprovalInterface';
import TradeNFTDisplay from '@/app/components/TradeNFTDisplay';
import ChainSwitcher from '@/app/components/ChainSwitcher';
import toast from 'react-hot-toast';
import { useAccount, useWalletClient } from 'wagmi';
import dynamic from 'next/dynamic';
import { useIsMounted } from '@/app/hooks/useIsMounted';
import React from 'react';

// Dynamically import ConnectButton to avoid SSR issues
const ConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then((mod) => ({ default: mod.ConnectButton })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-10 w-32 bg-gray-700 rounded-lg animate-pulse"></div>
    )
  }
);

export default function TradePage() {
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [trade, setTrade] = useState<TradeProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showApprovalInterface, setShowApprovalInterface] = useState(false);
  const [requiredApprovals, setRequiredApprovals] = useState<Array<{
    contractAddress: string;
    tokenId: string;
    amount: string;
    standard: 'ERC721' | 'ERC1155';
  }>>([]);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const isMounted = useIsMounted();

  const formatETH = (value?: string) => {
    if (!value) return '0';
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  // Load trade data
  useEffect(() => {
    const loadTrade = async () => {
      if (!id) return;
      
      try {
        const tradeData = await getTrade(id as string);
        if (!tradeData) {
          setError('Trade not found');
          return;
        }
        setTrade(tradeData);
      } catch (err) {
        console.error('Error loading trade:', err);
        setError(err.message || 'Failed to load trade');
      } finally {
        setIsLoading(false);
      }
    };

    loadTrade();
  }, [id]);

  // Check if the connected wallet is the trade recipient or offerer
  const isRecipient = address && trade?.to && address.toLowerCase() === trade.to.toLowerCase();
  const isOfferer = address && trade?.from && address.toLowerCase() === trade.from.toLowerCase();

  // Handle completion of manual approvals (now mostly unused since we auto-approve)
  const handleApprovalComplete = async () => {
    setShowApprovalInterface(false);
    
    if (!trade?.blockchainTradeId || !walletClient) {
      toast.error('Missing trade information or wallet connection');
      return;
    }

    try {
      setIsExecuting(true);
      
      toast.loading('🔍 💎 Executing trade transaction...', {
        id: 'execute-trade',
        duration: 0,
      });
      
      const tradeIdStr = String(trade.blockchainTradeId);
      const txHash = await acceptTrade(tradeIdStr, walletClient, (message) => {
        toast.loading(message, {
          id: 'execute-trade',
          duration: 0,
        });
      });
      
      console.log('✅ Trade executed successfully after manual approvals!');
      
      // Store transaction hash for explorer link
      setTransactionHash(txHash);
      
      toast.dismiss('execute-trade');
      showTxToast('accepted', txHash);
      
      // Update Firebase status to reflect blockchain state and save tx hash
      await updateTradeStatus(id as string, 'accepted', { transactionHash: txHash });
      setTrade(prev => ({ ...prev, status: 'accepted', transactionHash: txHash }));
      
    } catch (err) {
      console.error('Error executing trade after approvals:', err);
      
      let errorMessage = 'Failed to execute trade. Please try again.';
                  if (err.message?.includes('Insufficient ETH')) {
              errorMessage = 'Insufficient ETH balance for this trade.';
      } else if (err.message?.includes('User rejected')) {
        errorMessage = 'Transaction was cancelled by user.';
      }
      
      toast.error(errorMessage, {
        id: 'execute-trade',
        duration: 6000,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Helper to show success toast with explorer link
  const showTxToast = (status: string, tx?: string) => {
    const label = status === 'accepted' ? 'Trade accepted!' : status === 'cancelled' ? 'Trade cancelled' : status === 'declined' ? 'Trade declined' : 'Transaction sent';
    const bg = status === 'accepted' ? 'bg-green-600' : status === 'cancelled' ? 'bg-orange-600' : status === 'declined' ? 'bg-red-600' : 'bg-blue-600';
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} flex items-center gap-3 ${bg} text-white px-4 py-3 rounded-lg shadow-lg max-w-xs`}>
        <span className="font-semibold whitespace-nowrap">{label}</span>
        {tx && (
          <a
            href={`https://testnet.monadexplorer.com/tx/${tx || trade?.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-xs hover:text-gray-100 truncate max-w-[110px]"
          >
            <span className="truncate">{tx || trade?.transactionHash}</span>
          </a>
        )}
        <button onClick={() => toast.dismiss(t.id)} className="ml-auto text-white/70 hover:text-white text-lg leading-none">×</button>
      </div>
    ), { duration: 8000, position: 'bottom-right' });
  };

  if (!isMounted) {
    return null; // Prevent hydration errors by not rendering anything until mounted
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-satoshi transition-all duration-300 p-4 relative">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="animate-pulse">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-96 bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg"></div>
              <div className="h-96 bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-satoshi transition-all duration-300 p-4 relative">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Trade Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400">{error || 'The trade you\'re looking for doesn\'t exist or has been removed.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-satoshi transition-all duration-300 p-4 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Trade Offer
              </h1>
              <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:gap-2 w-full">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    trade.status === 'pending' ? 'bg-yellow-400 animate-pulse' :
                    trade.status === 'accepted' ? 'bg-green-400' :
                    trade.status === 'cancelled' ? 'bg-orange-400' :
                    'bg-red-400'
                  }`}></div>
                  <p className="text-sm font-medium text-zinc-300">
                    {trade.status === 'pending' 
                      ? 'Awaiting response' 
                      : trade.status === 'accepted'
                      ? 'Trade successfully executed'
                      : trade.status === 'cancelled'
                      ? 'Trade cancelled'
                      : 'Trade declined'}
                  </p>
                </div>
                <span className="sm:ml-2 sm:inline-flex text-xs font-mono text-zinc-400 px-2 py-0.5 bg-white/5 rounded-full ring-1 ring-white/10 self-start sm:self-auto mt-1 sm:mt-0">ID: {trade.blockchainTradeId ?? `${trade.id?.slice(0,8)}…`}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              
            </div>
            <ChainSwitcher />
            <div className="transform scale-90 sm:scale-95 lg:scale-100 origin-top-left">
              <ConnectButton label="Connect" showBalance={false} />
            </div>
          </div>
        </div>

        {/* Trade Message */}
        {trade.message && trade.message.trim() && (
          <div className="mb-8 bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0"></div>
            <div className="relative flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                  💬 Message from trader:
                </h4>
                <div className="bg-zinc-900/60 rounded-lg p-4 border border-zinc-800">
                  <p className="text-zinc-200 leading-relaxed">{trade.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[280px] relative mb-8">
          <TradeNFTDisplay
            nfts={trade.offer}
            title={
              <div className="group relative">
                <span>Offered by </span>
                <span className="font-mono">{trade.from.slice(0, 6)}...{trade.from.slice(-4)}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(trade.from); toast.success('Address copied'); }}
                  className="ml-2 opacity-70 group-hover:opacity-100 hover:text-white text-zinc-300"
                  title="Copy address"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 16v2a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h2"/></svg>
                </button>
                <div className="absolute left-0 -bottom-8 bg-gray-800 dark:bg-gray-800 text-white text-sm py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                  {trade.from}
                </div>
              </div>
            }
            monadAmount={
              trade.offeredETH && parseFloat(trade.offeredETH) > 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-xl backdrop-blur-sm w-max">
                  <span className="font-semibold text-white">{formatETH(trade.offeredETH)} ETH</span>
                </div>
              ) : null
            }
          />
          
          <TradeNFTDisplay
            nfts={trade.requested}
            title={
              <div className="group relative">
                <span>Requested from </span>
                <span className="font-mono">{trade.to.slice(0, 6)}...{trade.to.slice(-4)}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(trade.to); toast.success('Address copied'); }}
                  className="ml-2 opacity-70 group-hover:opacity-100 hover:text-white text-zinc-300"
                  title="Copy address"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 16v2a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h2"/></svg>
                </button>
                <div className="absolute left-0 -bottom-8 bg-gray-800 dark:bg-gray-800 text-white text-sm py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                  {trade.to}
                </div>
              </div>
            }
            monadAmount={
              trade.requestedETH && parseFloat(trade.requestedETH) > 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-xl backdrop-blur-sm w-max">
                  <span className="font-semibold text-white">{formatETH(trade.requestedETH)} ETH</span>
                </div>
              ) : null
            }
          />
        </div>

        {/* Trade Actions */}
        {trade.status === 'pending' && (
          <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center items-center">
            {/* Show accept/decline for recipient */}
            {isRecipient && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={async () => {
                    if (!trade?.blockchainTradeId || !walletClient) {
                      toast.error('Please connect your wallet first');
                      return;
                    }

                    try {
                      setIsExecuting(true);
                      setIsAccepting(true);

                      // Start the enhanced accept trade process with auto-approval
                      toast.loading('🚀 🔍 Preparing trade acceptance...', {
                        id: 'accept-trade',
                        duration: 0,
                      });

                      const txHash = await acceptTrade(trade.blockchainTradeId, walletClient, (message) => {
                        toast.loading(message, {
                          id: 'accept-trade',
                          duration: 0,
                        });
                      });
                      setTransactionHash(txHash);

                      toast.success('Trade accepted successfully!', {
                        id: 'accept-trade',
                        duration: 4000,
                      });

                      // Update Firebase status
                      await updateTradeStatus(id as string, 'accepted', {
                        acceptedBy: address,
                        acceptedAt: new Date(),
                        transactionHash: txHash
                      });

                      setTrade(prev => ({ ...prev, status: 'accepted', transactionHash: txHash }));

                    } catch (err) {
                      console.error('Error accepting trade:', err);
                      toast.error(err.message || 'Failed to accept trade', {
                        id: 'accept-trade',
                        duration: 6000,
                      });
                    } finally {
                      setIsExecuting(false);
                      setIsAccepting(false);
                    }
                  }}
                  disabled={isExecuting || !isConnected}
                  className={`px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 ${
                    isExecuting
                      ? 'bg-green-600/50 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 active:scale-95'
                  }`}
                >
                  {isAccepting ? 'Accepting...' : 'Accept Trade'}
                </button>
                <button
                  onClick={async () => {
                    if (!trade?.blockchainTradeId || !walletClient) {
                      toast.error('Please connect your wallet first');
                      return;
                    }

                    try {
                      setIsExecuting(true);
                      setIsDeclining(true);

                      toast.loading('Declining trade...', {
                        id: 'decline-trade',
                        duration: 0,
                      });

                      const txHash = await declineTrade(trade.blockchainTradeId, walletClient);
                      setTransactionHash(txHash);

                      toast.success('Trade declined successfully', {
                        id: 'decline-trade',
                        duration: 4000,
                      });

                      // Update Firebase status
                      await updateTradeStatus(id as string, 'declined', {
                        declinedBy: address,
                        declinedAt: new Date(),
                        transactionHash: txHash
                      });

                      setTrade(prev => ({ ...prev, status: 'declined', transactionHash: txHash }));

                    } catch (err) {
                      console.error('Error declining trade:', err);
                      toast.error(err.message || 'Failed to decline trade', {
                        id: 'decline-trade',
                        duration: 6000,
                      });
                    } finally {
                      setIsExecuting(false);
                      setIsDeclining(false);
                    }
                  }}
                  disabled={isExecuting || !isConnected}
                  className={`px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 ${
                    isExecuting
                      ? 'bg-red-600/50 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 active:scale-95'
                  }`}
                >
                  {isDeclining ? 'Declining...' : 'Decline Trade'}
                </button>
              </div>
            )}
            
            {/* Show cancel for creator */}
            {isOfferer && (
              <div className="flex justify-center">
                <button
                  onClick={async () => {
                    if (!trade?.blockchainTradeId || !walletClient) {
                      toast.error('Please connect your wallet first');
                      return;
                    }

                    try {
                      setIsExecuting(true);
                      setIsCancelling(true);

                      toast.loading('Cancelling trade...', {
                        id: 'cancel-trade',
                        duration: 0,
                      });

                      const txHash = await cancelTrade(trade.blockchainTradeId, walletClient);
                      setTransactionHash(txHash);

                      toast.success('Trade cancelled successfully', {
                        id: 'cancel-trade',
                        duration: 4000,
                      });

                      // Update Firebase status
                      await updateTradeStatus(id as string, 'cancelled', {
                        cancelledBy: address,
                        cancelledAt: new Date(),
                        transactionHash: txHash
                      });

                      setTrade(prev => ({ ...prev, status: 'cancelled', transactionHash: txHash }));

                    } catch (err) {
                      console.error('Error cancelling trade:', err);
                      toast.error(err.message || 'Failed to cancel trade', {
                        id: 'cancel-trade',
                        duration: 6000,
                      });
                    } finally {
                      setIsExecuting(false);
                      setIsCancelling(false);
                    }
                  }}
                  disabled={isExecuting || !isConnected}
                  className={`px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 ${
                    isExecuting
                      ? 'bg-red-600/50 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 active:scale-95'
                  }`}
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Trade'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Transaction Link */}
        { (transactionHash || trade?.transactionHash) && (
          <div className="mt-6 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg backdrop-blur-sm">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-zinc-800 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <h4 className="text-sm font-medium text-zinc-300">Transaction on Sepolia Testnet</h4>
              </div>
              <a
                href={`https://sepolia.etherscan.io/tx/${transactionHash || trade?.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs font-mono transition-colors flex items-center gap-1 group break-all"
              >
                <span className="break-all">{transactionHash || trade?.transactionHash}</span>
                <svg className="w-3 h-3 opacity-75 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Manual Approval Interface Modal */}
      <ManualApprovalInterface
        requiredApprovals={requiredApprovals}
        onApprovalComplete={handleApprovalComplete}
        isVisible={showApprovalInterface}
      />
    </div>
  );
} 