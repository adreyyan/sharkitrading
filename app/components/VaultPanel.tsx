'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import toast from 'react-hot-toast';
import { depositNFTToVault, withdrawNFTFromVault, getUserVaultReceipts, VaultReceipt } from '@/services/vault';
import SafeImage from './SafeImage';

interface NFT {
  contractAddress: string;
  tokenId: string;
  name?: string;
  image?: string;
  description?: string;
}

interface VaultPanelProps {
  userNFTs: NFT[];
  onDepositSuccess?: () => void;
}

export default function VaultPanel({ userNFTs, onDepositSuccess }: VaultPanelProps) {
  const { address: userAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const [vaultReceipts, setVaultReceipts] = useState<VaultReceipt[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);
  const [depositingNFT, setDepositingNFT] = useState<string | null>(null);
  const [withdrawingReceipt, setWithdrawingReceipt] = useState<string | null>(null);

  // Load vault receipts
  useEffect(() => {
    if (userAddress) {
      loadVaultReceipts();
    }
  }, [userAddress]);

  const loadVaultReceipts = async () => {
    if (!userAddress) return;
    
    setIsLoadingReceipts(true);
    try {
      const receipts = await getUserVaultReceipts(userAddress);
      setVaultReceipts(receipts);
    } catch (error) {
      console.error('Error loading vault receipts:', error);
    } finally {
      setIsLoadingReceipts(false);
    }
  };

  const handleDeposit = async (nft: NFT) => {
    if (!walletClient || !userAddress) {
      toast.error('Please connect your wallet');
      return;
    }

    const nftKey = `${nft.contractAddress}:${nft.tokenId}`;
    setDepositingNFT(nftKey);

    try {
      toast.loading('Depositing NFT to vault...', { id: 'vault-deposit' });

      const receiptId = await depositNFTToVault(
        nft.contractAddress,
        nft.tokenId,
        1, // Amount (always 1 for ERC721)
        false, // isERC1155
        walletClient
      );

      toast.success(
        (t) => (
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-green-600">
              <span>✅</span>
              <span>NFT Deposited to Vault!</span>
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-semibold mb-1">🎫 Your Receipt ID:</p>
              <div className="bg-gray-100 rounded p-2 font-mono text-xs break-all border border-gray-300">
                {receiptId}
              </div>
            </div>
            <p className="text-sm text-gray-600">
              ✅ You can now trade this receipt privately!
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(receiptId);
                toast.success('Receipt ID copied!', { duration: 2000 });
              }}
              className="mt-2 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              📋 Copy Receipt ID
            </button>
          </div>
        ),
        {
          id: 'vault-deposit',
          duration: 10000,
          style: {
            maxWidth: '500px',
            padding: '16px',
          }
        }
      );

      // Refresh receipts
      await loadVaultReceipts();
      
      if (onDepositSuccess) {
        onDepositSuccess();
      }
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error(`Failed to deposit: ${error.message}`, {
        id: 'vault-deposit',
        duration: 5000,
      });
    } finally {
      setDepositingNFT(null);
    }
  };

  const handleWithdraw = async (receiptId: string) => {
    if (!walletClient) {
      toast.error('Please connect your wallet');
      return;
    }

    setWithdrawingReceipt(receiptId);

    try {
      toast.loading('Withdrawing NFT from vault...', { id: 'vault-withdraw' });

      await withdrawNFTFromVault(receiptId, walletClient);

      toast.success(
        (t) => (
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-green-600">
              <span>✅</span>
              <span>Withdrawal Initiated!</span>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span>⏳</span>
                <div>
                  <p className="font-semibold">Oracle is decrypting...</p>
                  <p className="text-xs">NFT will be sent automatically in ~30-60 seconds</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span>📦</span>
                <p>Check your wallet soon!</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">
              💡 Tip: The NFT will appear in your wallet once the oracle completes decryption
            </div>
          </div>
        ),
        {
          id: 'vault-withdraw',
          duration: 10000,
          style: {
            maxWidth: '500px',
            padding: '16px',
          }
        }
      );

      // Refresh receipts
      await loadVaultReceipts();
      
      if (onDepositSuccess) {
        onDepositSuccess();
      }
    } catch (error) {
      console.error('Withdraw error:', error);
      toast.error(`Failed to withdraw: ${error.message}`, {
        id: 'vault-withdraw',
        duration: 5000,
      });
    } finally {
      setWithdrawingReceipt(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* How It Works Banner */}
      <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <span className="text-2xl">🔐</span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-blue-300 mb-2 text-lg">How Private NFT Vault Works</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p className="flex items-start gap-2">
                <span className="text-green-400 font-bold">1.</span>
                <span><strong className="text-white">Deposit</strong> your NFTs → Get encrypted vault receipts</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-400 font-bold">2.</span>
                <span><strong className="text-white">Trade</strong> receipt IDs privately → Public can't see which NFTs you're trading!</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-400 font-bold">3.</span>
                <span><strong className="text-white">Withdraw</strong> your NFTs back to your wallet anytime</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Your NFTs - Available to Deposit */}
      <div className="bg-gray-800/30 rounded-2xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">📦</span>
            Your NFTs
            <span className="text-sm font-normal text-gray-400 ml-2">({userNFTs.length} available)</span>
          </h3>
        </div>
        
        {userNFTs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">🎨</div>
            <p className="font-medium mb-1">No NFTs in your wallet</p>
            <p className="text-sm">Get some test NFTs to try the vault!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {userNFTs.map((nft) => {
              const nftKey = `${nft.contractAddress}:${nft.tokenId}`;
              const isDepositing = depositingNFT === nftKey;
              
              return (
                <div
                  key={nftKey}
                  className="bg-gray-900/50 rounded-xl overflow-hidden border border-gray-700/50 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200"
                >
                  <div className="aspect-square relative bg-gray-800">
                    <SafeImage
                      src={nft.image || '/placeholder.svg'}
                      alt={nft.name || `NFT #${nft.tokenId}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="p-4">
                    <p className="text-sm font-semibold text-white truncate mb-3">
                      {nft.name || `NFT #${nft.tokenId}`}
                    </p>
                    
                    <button
                      onClick={() => handleDeposit(nft)}
                      disabled={isDepositing}
                      className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      {isDepositing ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Depositing...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1">
                          🏦 Deposit
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Vault Receipts - Encrypted */}
      <div className="bg-gradient-to-br from-green-500/5 via-transparent to-green-500/5 rounded-2xl border border-green-500/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🎫</span>
              Vault Receipts
              <span className="text-sm font-normal text-gray-400 ml-2">({vaultReceipts.length} encrypted)</span>
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              These are your encrypted NFTs. Trade them or withdraw back to your wallet.
            </p>
          </div>
        </div>
        
        {isLoadingReceipts ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400 mt-3">Loading receipts...</p>
          </div>
        ) : vaultReceipts.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <div className="text-5xl mb-3">🏦</div>
            <p className="font-medium mb-1">No NFTs in vault</p>
            <p className="text-sm">Deposit NFTs above to get encrypted receipts</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vaultReceipts.map((receipt, index) => {
              const isWithdrawing = withdrawingReceipt === receipt.receiptId;
              
              return (
                <div
                  key={receipt.receiptId}
                  className="bg-gray-900/50 rounded-xl p-5 border border-gray-700/50 hover:border-green-500/30 transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">
                          #{index + 1}
                        </span>
                        <p className="text-sm font-semibold text-gray-400">Encrypted Receipt</p>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3 mb-2">
                        <p className="font-mono text-xs text-green-400 break-all">
                          {receipt.receiptId}
                        </p>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-gray-400">
                        <span>🔐</span>
                        <span>NFT details encrypted • Only you can decrypt • Trade this receipt or withdraw</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleWithdraw(receipt.receiptId)}
                      disabled={isWithdrawing}
                      className="sm:ml-4 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-green-500/20 flex-shrink-0"
                    >
                      {isWithdrawing ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Withdrawing...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          📥 Withdraw NFT
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

