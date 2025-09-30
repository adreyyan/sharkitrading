'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import ChainSwitcher from '../components/ChainSwitcher';
import { getUserTrades, TradeProposal } from '../../services/trade';

function TradeCard({ trade }: { trade: TradeProposal }) {
  const statusColor = {
    pending: 'text-yellow-500',
    accepted: 'text-green-500',
    declined: 'text-red-500'
  }[trade.status || 'pending'];

  const formatDateTime = (date: any) => {
    try {
      let dateObj: Date | null = null;
      
      if (date?.toDate) {
        dateObj = date.toDate()
      } else if (date?.seconds) {
        dateObj = new Date(date.seconds * 1000)
      } else if (date instanceof Date) {
        dateObj = date
      } else if (typeof date === 'string') {
        dateObj = new Date(date)
      }
      
      if (!dateObj) return 'Unknown'
      
      // Format: "7/4/2025, 2:30 PM"
      return dateObj.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return 'Unknown'
    }
  }

  const getRelativeTime = (date: any) => {
    try {
      let dateObj: Date | null = null;
      
      if (date?.toDate) {
        dateObj = date.toDate()
      } else if (date?.seconds) {
        dateObj = new Date(date.seconds * 1000)
      } else if (date instanceof Date) {
        dateObj = date
      } else if (typeof date === 'string') {
        dateObj = new Date(date)
      }
      
      if (!dateObj) return ''
      
      const now = new Date()
      const diffMs = now.getTime() - dateObj.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      
      if (diffMins < 1) return 'just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return '' // For older dates, just show the full date
    } catch {
      return ''
    }
  }

  return (
    <Link href={`/trade/${trade.id}`} target="_blank" rel="noopener noreferrer">
      <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-medium">Trade #{trade.id?.slice(0, 8)}</h3>
            <div className="text-sm text-gray-400">
              <div>{formatDateTime(trade.createdAt)}</div>
              {getRelativeTime(trade.createdAt) && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {getRelativeTime(trade.createdAt)}
                </div>
              )}
            </div>
          </div>
          <span className={`font-medium ${statusColor}`}>
            {(trade.status || 'pending').charAt(0).toUpperCase() + (trade.status || 'pending').slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400 mb-2">Offering</p>
            <div className="space-y-1">
              {trade.offer.map(nft => (
                <p key={nft.tokenId} className="text-sm truncate">
                  {nft.name || `NFT #${nft.tokenId}`}
                </p>
              ))}
              {parseFloat(trade.offeredMonad || '0') > 0 && (
                <p className="text-sm">{trade.offeredMonad} Mon</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">Requesting</p>
            <div className="space-y-1">
              {trade.requested.map(nft => (
                <p key={nft.tokenId} className="text-sm truncate">
                  {nft.name || `NFT #${nft.tokenId}`}
                </p>
              ))}
              {parseFloat(trade.requestedMonad || '0') > 0 && (
                <p className="text-sm">{trade.requestedMonad} Mon</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function TradesPage() {
  const { address } = useAccount();
  const [myTrades, setMyTrades] = useState<TradeProposal[]>([]);
  const [pendingTrades, setPendingTrades] = useState<TradeProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address) {
      loadTrades();
    }
  }, [address]);

  const loadTrades = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const userTrades = await getUserTrades(address);
      setMyTrades(userTrades);
      // For now, we'll show all pending trades in the user trades section
      setPendingTrades([]);
    } catch (error) {
      console.error('Error loading trades:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">My Trades</h1>
            <div className="flex items-center gap-4">
              <ChainSwitcher />
              <ConnectButton label="Connect" showBalance={false} />
            </div>
          </div>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-zinc-400">Connect Your Wallet</h2>
            <p className="text-zinc-500 mt-2">Please connect your wallet to view trades.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">My Trades</h1>
            <div className="flex items-center gap-4">
              <ChainSwitcher />
              <ConnectButton label="Connect" showBalance={false} />
            </div>
          </div>
          
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-zinc-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">My Trades</h1>
          <div className="flex items-center gap-4">
            <ChainSwitcher />
            <ConnectButton label="Connect" showBalance={false} />
          </div>
        </div>

        {pendingTrades.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-white">Pending Trades for You</h2>
            <div className="space-y-4">
              {pendingTrades.map(trade => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold mb-4 text-white">Your Trades</h2>
          {myTrades.length > 0 ? (
            <div className="space-y-4">
              {myTrades.map(trade => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          ) : (
            <p className="text-zinc-400">You haven't created any trades yet.</p>
          )}
        </div>
      </div>
    </div>
  );
} 