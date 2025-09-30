'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPublicClient, http, parseAbiItem, decodeEventLog } from 'viem'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import ChainSwitcher from '../components/ChainSwitcher'

const sepoliaTestnet = {
  id: 11155111,
  name: 'Sepolia',
  network: 'sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://ethereum-sepolia-rpc.publicnode.com'],
    },
    public: {
      http: ['https://ethereum-sepolia-rpc.publicnode.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
}

const publicClient = createPublicClient({
  chain: sepoliaTestnet,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com')
})

const CONTRACT_ADDRESS = '0x695a59b769FcFD3Af710891fc24282772DCd6302' // fhEVM contract

export default function RecoverTrade() {
  const router = useRouter()
  const [txHash, setTxHash] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ tradeId: string; blockNumber: string } | null>(null)

  const isValidTxHash = (hash: string) => {
    return /^0x[a-fA-F0-9]{64}$/.test(hash)
  }

  const handleRecover = async () => {
    if (!txHash.trim()) {
      setError('Please enter a transaction hash')
      return
    }

    if (!isValidTxHash(txHash)) {
      setError('Invalid transaction hash format. Must be 64 characters long and start with 0x')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Fetching transaction receipt for:', txHash)
      
      // Get transaction receipt
      const receipt = await publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`
      })

      console.log('Transaction receipt:', receipt)

      if (!receipt) {
        throw new Error('Transaction not found. Please check the hash and try again.')
      }

      if (receipt.status === 'reverted') {
        throw new Error('Transaction failed. The trade was not created successfully.')
      }

      // Look for TradeCreated event in the logs
      const tradeCreatedEvent = parseAbiItem('event TradeCreated(uint256 indexed tradeId, address indexed creator, address indexed targetUser, uint256 creatorNFTCount, uint256 targetNFTCount, uint256 creatorMonadAmount, uint256 targetMonadAmount, uint256 expirationTime)')
      
      let tradeId = null
      
      for (const log of receipt.logs) {
        try {
          if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
            // Try to decode as TradeCreated event
            const decoded = decodeEventLog({
              abi: [tradeCreatedEvent],
              data: log.data,
              topics: (log as any).topics as [`0x${string}`, ...`0x${string}`[]]
            })
            
            if (decoded.eventName === 'TradeCreated') {
              tradeId = (decoded.args as any).tradeId?.toString()
              break
            }
          }
        } catch (decodeError) {
          // Continue to next log if this one doesn't match
          continue
        }
      }

      if (!tradeId) {
        throw new Error('No trade creation found in this transaction. This might not be a trade creation transaction.')
      }

      setResult({
        tradeId,
        blockNumber: receipt.blockNumber.toString()
      })

    } catch (err) {
      console.error('Recovery error:', err)
      setError(err instanceof Error ? err.message : 'Failed to recover trade')
    } finally {
      setLoading(false)
    }
  }

  const handleViewTrade = () => {
    if (result?.tradeId) {
      window.open(`/trade/${result.tradeId}`, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="hover:scale-110 transition-transform">
            <h1 className="text-2xl font-bold text-white">Recover Lost Trade</h1>
          </Link>
          <div className="flex items-center gap-4">
            <ChainSwitcher />
            <ConnectButton label="Connect" showBalance={false} />
          </div>
        </div>

        {/* Description */}
        <div className="text-center mb-8">
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Lost your trade link? Enter your transaction hash below to recover your trade.
            This works for any trade creation transaction on the Monad network.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/10 dark:bg-gray-900/10 backdrop-blur-2xl border border-white/20 dark:border-gray-600/20 rounded-2xl p-6 shadow-2xl">
            
            {/* Input Section */}
            <div className="mb-6">
              <label htmlFor="txHash" className="block text-sm font-medium mb-2">
                Transaction Hash
              </label>
              <input
                id="txHash"
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x1234567890abcdef..."
                className="w-full bg-white/20 dark:bg-gray-800/20 backdrop-blur-md border border-white/30 dark:border-gray-600/30 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Paste the transaction hash from when you created the trade
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 text-lg">⚠️</span>
                  <div>
                    <p className="text-red-300 font-medium">Recovery Failed</p>
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Display */}
            {result && (
              <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-green-400 text-lg">✅</span>
                  <div className="flex-1">
                    <p className="text-green-300 font-medium mb-2">Trade Recovered Successfully!</p>
                    <div className="space-y-1 text-sm text-green-200">
                      <p><strong>Trade ID:</strong> #{result.tradeId}</p>
                      <p><strong>Block Number:</strong> {result.blockNumber}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleRecover}
                disabled={loading || !txHash.trim()}
                className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
                  loading || !txHash.trim()
                    ? 'bg-gray-400 dark:bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Recovering...
                  </div>
                ) : (
                  'Recover Trade'
                )}
              </button>

              {result && (
                <button
                  onClick={handleViewTrade}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  View Trade
                </button>
              )}
            </div>

            {/* Help Section */}
            <div className="mt-8 pt-6 border-t border-white/20 dark:border-gray-600/20">
              <h3 className="font-medium mb-3">How to find your transaction hash:</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>• Check your wallet's transaction history</p>
                <p>• Look for a transaction to contract: {CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}</p>
                <p>• Copy the transaction hash (starts with 0x)</p>
                <p>• The transaction should be marked as "Success" or "Confirmed"</p>
              </div>
            </div>

            {/* Back Link */}
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                ← Back to Trading
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 