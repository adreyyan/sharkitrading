'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { cancelTrade } from '@/services/blockchain';
import { getAllTradesForAdmin, updateTradeStatus, TradeProposal, cancelExpiredTrades, getTimeUntilExpiration, isTradeExpired } from '@/services/trade';
import { useWalletClient } from 'wagmi';
import dynamic from 'next/dynamic';
import ChainSwitcher from '../components/ChainSwitcher';
import { NFT_TRADING_ADDRESS } from '@/lib/contracts';

// Define Sepolia Testnet chain for fhEVM
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
    default: { http: ['https://ethereum-sepolia-rpc.publicnode.com'] },
    public: { http: ['https://ethereum-sepolia-rpc.publicnode.com'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  testnet: true,
} as const;

// Dynamically import ConnectButton to avoid SSR issues
const ConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then((mod) => ({ default: mod.ConnectButton })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-10 w-32 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse"></div>
    )
  }
);

// Only this address can use admin features
const ADMIN_ADDRESS = '0x6d0fC679FaffC0046eB82455282aeA3f2Ef0aF38';

interface AdminPanelProps {}

export default function AdminPanel({}: AdminPanelProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [trades, setTrades] = useState<TradeProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [error, setError] = useState<string | null>(null);
  const [checkingExpired, setCheckingExpired] = useState(false);

  
  // New state for admin management
  const [currentFee, setCurrentFee] = useState<string>('0.3');
  const [newFee, setNewFee] = useState<string>('0.3');
  const [updatingFee, setUpdatingFee] = useState(false);
  const [admins, setAdmins] = useState<string[]>([]);
  const [adminCount, setAdminCount] = useState<number>(1);
  const [newAdminAddress, setNewAdminAddress] = useState<string>('');
  const [managingAdmins, setManagingAdmins] = useState(false);

  // Check if current user is admin
  const isAdmin = address && address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  useEffect(() => {
    if (isAdmin) {
      loadTrades();
      loadAdminData();
    }
  }, [isAdmin, filter]);

  const loadAdminData = async () => {
    try {
      if (!publicClient) {
        // Use fallback data if no client
        setAdmins([address!]);
        setAdminCount(1);
        setCurrentFee('0.001');
        setNewFee('0.001');
        return;
      }
      
      console.log('Loading admin data from fhEVM contract...');
      
      // Load admin data from fhEVM contract with timeout
      const contract = {
        address: NFT_TRADING_ADDRESS as `0x${string}`,
        abi: [
          {
            "inputs": [],
            "name": "getAdmins",
            "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "getAdminCount",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "getTradeFee",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
          }
        ]
      };
      
      // Add timeout wrapper
      const timeout = (ms: number) => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), ms)
      );
      
      // Get admin data from contract with 10 second timeout
      const contractCalls = Promise.all([
        publicClient.readContract({
          ...contract,
          functionName: 'getAdmins'
        }),
        publicClient.readContract({
          ...contract,
          functionName: 'getAdminCount'  
        }),
        publicClient.readContract({
          ...contract,
          functionName: 'getTradeFee'
        })
      ]);
      
      const [adminsList, adminCountBig, tradeFeeBig] = await Promise.race([
        contractCalls,
        timeout(10000) // 10 second timeout
      ]) as [string[], bigint, bigint];
      
      setAdmins(adminsList);
      setAdminCount(Number(adminCountBig));
      const feeInEther = Number(tradeFeeBig) / 1e18;
      setCurrentFee(feeInEther.toString());
      setNewFee(feeInEther.toString());
      
      console.log('✅ Admin data loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading admin data:', error);
      console.log('Using fallback admin data');
      
      // Fallback to known data for fhEVM contract
      setAdmins([address!]);
      setAdminCount(1);
      setCurrentFee('0.001'); // Default fhEVM contract fee
      setNewFee('0.001');
    }
  };

  const loadTrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusFilter = filter === 'active' ? ['pending'] : filter === 'completed' ? ['accepted', 'declined', 'cancelled'] : undefined;
      const result = await getAllTradesForAdmin({
        status: statusFilter,
        limit: 50
      });
      setTrades(result.trades);
    } catch (error) {
      console.error('Error loading trades:', error);
      setError('Failed to load trades');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTrade = async (tradeId: string) => {
    setCancelling(tradeId);
    setError(null);
    try {
      const trade = trades.find(t => t.id === tradeId);
      
      if (trade?.blockchainTradeId && walletClient) {
        // If it's a blockchain trade, cancel on blockchain first
        await cancelTrade(trade.blockchainTradeId, walletClient);
      }
      
      // Update Firebase status regardless
      await updateTradeStatus(tradeId, 'cancelled');
      
      // Reload trades to reflect the change
      await loadTrades();
    } catch (error) {
      console.error('Error cancelling trade:', error);
      setError(`Failed to cancel trade: ${error.message}`);
    } finally {
      setCancelling(null);
    }
  };

  const handleCheckExpiredTrades = async () => {
    setCheckingExpired(true);
    setError(null);
    try {
      const result = await cancelExpiredTrades();
      
      if (result.cancelled > 0) {
        setError(`✅ Successfully cancelled ${result.cancelled} expired trades`);
      } else {
        setError('✨ No expired trades found');
      }
      
      if (result.errors.length > 0) {
        setError(prev => prev + `\n⚠️ ${result.errors.length} errors occurred`);
      }
      
      // Reload trades to reflect the changes
      await loadTrades();
    } catch (error) {
      console.error('Error checking expired trades:', error);
      setError(`Failed to check expired trades: ${error.message}`);
    } finally {
      setCheckingExpired(false);
    }
  };

  const handleExpireTradeOnBlockchain = async (tradeId: string) => {
    if (!walletClient || !publicClient) {
      setError('Wallet not connected');
      return;
    }

    setCancelling(tradeId);
    setError(null);
    try {
      const trade = trades.find(t => t.id === tradeId);
      
      if (trade?.blockchainTradeId) {
        console.log('Expiring blockchain trade:', trade.blockchainTradeId);
        
        // Call V6 contract expireTrade function (anyone can call this)
        const contract = {
          address: '0x9e2c22E0D77500ddD9e15d5ff3D27F7643e1dCE3' as `0x${string}`,
          abi: [
            {
              "inputs": [
                {
                  "internalType": "uint256",
                  "name": "tradeId",
                  "type": "uint256"
                }
              ],
              "name": "expireTrade",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            }
          ]
        };

        // Execute expire trade on blockchain
        const hash = await walletClient.writeContract({
          ...contract,
          functionName: 'expireTrade',
          args: [BigInt(trade.blockchainTradeId)],
          account: address as `0x${string}`,
          chain: sepoliaTestnet
        });

        console.log('Expire trade transaction sent:', hash);
        
        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log('Expire trade transaction confirmed:', receipt);
      }
      
      // Update Firebase status
      await updateTradeStatus(tradeId, 'cancelled');
      
      // Reload trades to reflect the change
      await loadTrades();
      setError(`✅ Trade ${tradeId.slice(0, 8)} expired and assets returned to creator`);
      
    } catch (error) {
      console.error('Error expiring trade:', error);
      setError(`Failed to expire trade: ${error.message}`);
    } finally {
      setCancelling(null);
    }
  };



  const handleUpdateFee = async () => {
    if (!walletClient) {
      setError('Wallet not connected');
      return;
    }

    const feeValue = parseFloat(newFee);
    if (isNaN(feeValue) || feeValue < 0 || feeValue > 1) {
      setError('Fee must be between 0 and 1 MONAD');
      return;
    }

    setUpdatingFee(true);
    setError(null);
    try {
      console.log('Updating fee to:', newFee);
      
      // Call fhEVM contract setTradeFee function
      const contract = {
        address: NFT_TRADING_ADDRESS as `0x${string}`,
        abi: [
          {
            "inputs": [
              {
                "internalType": "uint256",
                "name": "newFee",
                "type": "uint256"
              }
            ],
            "name": "setTradeFee",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ]
      };

      // Convert fee to wei (18 decimals)
      const feeInWei = BigInt(Math.floor(feeValue * 1e18));

      // Execute fee update on blockchain
      const hash = await walletClient.writeContract({
        ...contract,
        functionName: 'setTradeFee',
        args: [feeInWei],
        account: address as `0x${string}`,
        chain: sepoliaTestnet
      });

      console.log('Fee update transaction sent:', hash);
      
      // Wait for transaction confirmation
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log('Fee update transaction confirmed:', receipt);
      }
      
      // Update local state
      setCurrentFee(newFee);
      setError(`✅ Trade fee updated to ${newFee} MONAD`);
      
    } catch (error) {
      console.error('Error updating fee:', error);
      setError(`Failed to update fee: ${error.message}`);
    } finally {
      setUpdatingFee(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!walletClient) {
      setError('Wallet not connected');
      return;
    }

    if (!newAdminAddress || !newAdminAddress.startsWith('0x') || newAdminAddress.length !== 42) {
      setError('Please enter a valid Ethereum address');
      return;
    }

    if (admins.map(a => a.toLowerCase()).includes(newAdminAddress.toLowerCase())) {
      setError('Address is already an admin');
      return;
    }

    if (adminCount >= 3) {
      setError('Maximum of 3 admins allowed');
      return;
    }

    setManagingAdmins(true);
    setError(null);
    try {
      console.log('Adding admin:', newAdminAddress);
      
      // Call V6 contract addAdmin function
      const contract = {
        address: '0x9e2c22E0D77500ddD9e15d5ff3D27F7643e1dCE3' as `0x${string}`,
        abi: [
          {
            "inputs": [
              {
                "internalType": "address",
                "name": "newAdmin",
                "type": "address"
              }
            ],
            "name": "addAdmin",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ]
      };

      // Execute add admin on blockchain
      const hash = await walletClient.writeContract({
        ...contract,
        functionName: 'addAdmin',
        args: [newAdminAddress as `0x${string}`],
        account: address as `0x${string}`,
        chain: sepoliaTestnet
      });

      console.log('Add admin transaction sent:', hash);
      
      // Wait for transaction confirmation
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log('Add admin transaction confirmed:', receipt);
      }
      
      // Update local state
      setAdmins([...admins, newAdminAddress]);
      setAdminCount(adminCount + 1);
      setNewAdminAddress('');
      setError(`✅ Admin added successfully: ${formatAddress(newAdminAddress)}`);
      
    } catch (error) {
      console.error('Error adding admin:', error);
      setError(`Failed to add admin: ${error.message}`);
    } finally {
      setManagingAdmins(false);
    }
  };

  const handleRemoveAdmin = async (adminToRemove: string) => {
    if (!walletClient) {
      setError('Wallet not connected');
      return;
    }

    if (adminCount <= 1) {
      setError('Cannot remove the last admin');
      return;
    }

    setManagingAdmins(true);
    setError(null);
    try {
      console.log('Removing admin:', adminToRemove);
      
      // Call V6 contract removeAdmin function
      const contract = {
        address: '0x9e2c22E0D77500ddD9e15d5ff3D27F7643e1dCE3' as `0x${string}`,
        abi: [
          {
            "inputs": [
              {
                "internalType": "address",
                "name": "adminToRemove",
                "type": "address"
              }
            ],
            "name": "removeAdmin",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ]
      };

      // Execute remove admin on blockchain
      const hash = await walletClient.writeContract({
        ...contract,
        functionName: 'removeAdmin',
        args: [adminToRemove as `0x${string}`],
        account: address as `0x${string}`,
        chain: sepoliaTestnet
      });

      console.log('Remove admin transaction sent:', hash);
      
      // Wait for transaction confirmation
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log('Remove admin transaction confirmed:', receipt);
      }
      
      // Update local state
      setAdmins(admins.filter(admin => admin.toLowerCase() !== adminToRemove.toLowerCase()));
      setAdminCount(adminCount - 1);
      setError(`✅ Admin removed successfully: ${formatAddress(adminToRemove)}`);
      
    } catch (error) {
      console.error('Error removing admin:', error);
      setError(`Failed to remove admin: ${error.message}`);
    } finally {
      setManagingAdmins(false);
    }
  };

  const handleAdminForceCancelTrade = async (tradeId: string) => {
    if (!walletClient) {
      setError('Wallet not connected');
      return;
    }

    setCancelling(tradeId);
    setError(null);
    try {
      const trade = trades.find(t => t.id === tradeId);
      
      if (trade?.blockchainTradeId) {
        console.log('Admin force cancelling blockchain trade:', trade.blockchainTradeId);
        
        // Call V6 contract adminCancelTrade function
        const contract = {
          address: '0x9e2c22E0D77500ddD9e15d5ff3D27F7643e1dCE3' as `0x${string}`,
          abi: [
            {
              "inputs": [
                {
                  "internalType": "uint256",
                  "name": "tradeId",
                  "type": "uint256"
                }
              ],
              "name": "adminCancelTrade",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            }
          ]
        };

        // Execute admin cancel on blockchain
        const hash = await walletClient.writeContract({
          ...contract,
          functionName: 'adminCancelTrade',
          args: [BigInt(trade.blockchainTradeId)],
          account: address as `0x${string}`,
          chain: sepoliaTestnet
        });

        console.log('Admin cancel transaction sent:', hash);
        
        // Wait for transaction confirmation
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          console.log('Admin cancel transaction confirmed:', receipt);
        }
      }
      
      // Update Firebase status
      await updateTradeStatus(tradeId, 'cancelled');
      
      // Reload trades to reflect the change
      await loadTrades();
      setError(`✅ Trade ${tradeId.slice(0, 8)} force cancelled by admin`);
      
    } catch (error) {
      console.error('Error force cancelling trade:', error);
      setError(`Failed to force cancel trade: ${error.message}`);
    } finally {
      setCancelling(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'pending': { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      'accepted': { label: 'Accepted', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      'cancelled': { label: 'Cancelled', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
      'declined': { label: 'Declined', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' }
    };
    
    const statusInfo = statusMap[status] || { label: 'Unknown', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const formatAddress = (address: string | undefined) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    // Handle Firebase timestamp
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    
    // Handle regular timestamp or date
    return new Date(timestamp).toLocaleString();
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 text-gray-900 dark:text-white font-satoshi transition-all duration-300">
        <div className="container mx-auto px-4 py-8">
          {/* Header with Connect Button */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="transform scale-90 sm:scale-95 lg:scale-100 origin-top-left">
                <ConnectButton label="Connect" showBalance={false} />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="glass-strong rounded-3xl p-8 max-w-lg">
              <h2 className="text-2xl font-black mb-4 text-gray-900 dark:text-white">Admin Access Required</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Connect your wallet to access the admin panel. Only authorized administrators can manage trades.
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  <span className="font-medium">Note:</span> Admin access is restricted to authorized addresses only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 text-gray-900 dark:text-white font-satoshi transition-all duration-300">
        <div className="container mx-auto px-4 py-8">
          {/* Header with Connect Button */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="transform scale-90 sm:scale-95 lg:scale-100 origin-top-left">
                <ConnectButton label="Connect" showBalance={false} />
              </div>
            </div>
          </div>

          {/* Access Denied Content */}
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="glass-strong rounded-3xl p-8 max-w-lg">
              <h2 className="text-2xl font-black mb-4 text-red-600 dark:text-red-400">Access Denied</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You don't have admin privileges to access this panel.
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <p className="text-red-800 dark:text-red-200 text-sm">
                  <span className="font-medium">Connected as:</span> {formatAddress(address!)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  <span className="font-medium">Admin access restricted to authorized addresses only.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 text-gray-900 dark:text-white font-satoshi transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Connect Button */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ChainSwitcher />
            <div className="transform scale-90 sm:scale-95 lg:scale-100 origin-top-left">
              <ConnectButton label="Connect" showBalance={false} />
            </div>
          </div>
        </div>

        {/* Admin Info */}
        <div className="mb-8">
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage trade offers and platform operations</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Connected as: {formatAddress(address!)}</p>
          <div className="flex items-center mt-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Admin Access Verified</span>
          </div>
        </div>


        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Fee Management */}
          <div className="bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300/60 dark:border-gray-700 shadow-lg rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              💰 Fee Management
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Trade Fee: {currentFee} MONAD
                </label>
                
                <div className="flex gap-2 items-center">
                  <input 
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={newFee}
                    onChange={(e) => setNewFee(e.target.value)}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded w-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="0.3"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">MONAD</span>
                  <button 
                    onClick={handleUpdateFee}
                    disabled={updatingFee || newFee === currentFee}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
                  >
                    {updatingFee ? 'Updating...' : 'Update Fee'}
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Maximum allowed: 1.0 MONAD
                </p>
              </div>
            </div>
          </div>

          {/* Admin Management */}
          <div className="bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300/60 dark:border-gray-700 shadow-lg rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              👥 Admin Management
            </h3>
            
            <div className="space-y-4">
              {/* Current Admins List */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Current Admins ({adminCount}/3)
                </h4>
                <div className="space-y-2">
                  {admins.map((admin, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                          {formatAddress(admin)}
                        </span>
                        {admin.toLowerCase() === address?.toLowerCase() && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded text-xs">
                            You
                          </span>
                        )}
                      </div>
                      {adminCount > 1 && admin.toLowerCase() !== address?.toLowerCase() && (
                        <button 
                          onClick={() => handleRemoveAdmin(admin)}
                          disabled={managingAdmins}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 px-3 py-1 rounded text-sm disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Add New Admin */}
              {adminCount < 3 && (
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Add New Admin</h4>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="0x..."
                      value={newAdminAddress}
                      onChange={(e) => setNewAdminAddress(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <button 
                      onClick={handleAddAdmin}
                      disabled={managingAdmins || !newAdminAddress}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
                    >
                      {managingAdmins ? 'Adding...' : 'Add Admin'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex space-x-4 p-4 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50 rounded-xl shadow-md">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 border border-gray-300/70 dark:border-gray-600/70 hover:bg-white/90 dark:hover:bg-gray-600/90 backdrop-blur-sm'
              }`}
            >
              All Trades
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'active'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 border border-gray-300/70 dark:border-gray-600/70 hover:bg-white/90 dark:hover:bg-gray-600/90 backdrop-blur-sm'
              }`}
            >
              Active Trades
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'completed'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 border border-gray-300/70 dark:border-gray-600/70 hover:bg-white/90 dark:hover:bg-gray-600/90 backdrop-blur-sm'
              }`}
            >
              Completed Trades
            </button>
            <button
              onClick={loadTrades}
              disabled={loading}
              className="px-4 py-2 bg-gray-600/90 dark:bg-gray-500/90 text-white rounded-lg font-medium hover:bg-gray-700/90 dark:hover:bg-gray-400/90 disabled:opacity-50 backdrop-blur-sm shadow-md transition-all"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={handleCheckExpiredTrades}
              disabled={checkingExpired}
              className="px-4 py-2 bg-orange-600/90 dark:bg-orange-500/90 text-white rounded-lg font-medium hover:bg-orange-700/90 dark:hover:bg-orange-400/90 disabled:opacity-50 backdrop-blur-sm shadow-md transition-all"
            >
              {checkingExpired ? 'Checking...' : 'Cancel Expired'}
            </button>

          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Trades Table */}
        <div className="bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300/60 dark:border-gray-700 shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-300/50 dark:border-gray-700/50">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Trade Offers ({trades.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading trades...</p>
            </div>
          ) : trades.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No trades found for the current filter.
            </div>
          ) : (
            <div className="overflow-auto max-h-[600px]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300/50 dark:divide-gray-700/50">
                  <thead className="bg-gray-50/80 dark:bg-gray-700/80 backdrop-blur-sm sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">
                        Trade ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[140px]">
                        Blockchain ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">
                        Creator
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">
                        Responder
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[160px]">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">
                        Expires
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[180px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/30 dark:bg-gray-800/30 divide-y divide-gray-300/30 dark:divide-gray-700/30">
                    {trades.map((trade) => (
                      <tr key={trade.id} className="hover:bg-white/60 dark:hover:bg-gray-700/60 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          #{trade.id?.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {trade.blockchainTradeId ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded text-xs font-medium">
                                #{trade.blockchainTradeId}
                              </span>
                              <div className="w-2 h-2 bg-green-500 rounded-full" title="On-chain trade"></div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                                Firebase Only
                              </span>
                              <div className="w-2 h-2 bg-gray-400 rounded-full" title="Off-chain trade"></div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatAddress(trade.from)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatAddress(trade.to)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(trade.status)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(trade.createdAt)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {trade.status === 'pending' ? (
                            <span className={`${isTradeExpired(trade.expiresAt) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                              {getTimeUntilExpiration(trade.expiresAt)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-col gap-1">
                            {trade.status === 'pending' && !isTradeExpired(trade.expiresAt) && ( // Only show cancel for active non-expired trades
                              <button
                                onClick={() => handleCancelTrade(trade.id)}
                                disabled={cancelling === trade.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md text-xs font-medium w-full"
                              >
                                {cancelling === trade.id ? 'Cancelling...' : 'Cancel'}
                              </button>
                            )}
                            {trade.status === 'pending' && isTradeExpired(trade.expiresAt) && ( // Special button for expired trades
                              <button
                                onClick={() => handleExpireTradeOnBlockchain(trade.id)}
                                disabled={cancelling === trade.id}
                                className="text-purple-600 hover:text-purple-900 disabled:opacity-50 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md text-xs font-medium w-full border border-purple-200"
                                title="Expire trade and return assets to creator"
                              >
                                {cancelling === trade.id ? 'Expiring...' : '⏰ Expire & Return Assets'}
                              </button>
                            )}
                            {trade.status === 'pending' && ( // Admin force cancel for stuck trades
                              <button
                                onClick={() => handleAdminForceCancelTrade(trade.id)}
                                disabled={cancelling === trade.id}
                                className="text-orange-600 hover:text-orange-900 disabled:opacity-50 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-md text-xs font-medium w-full border border-orange-200"
                                title="Admin Override: Force cancel any stuck trade"
                              >
                                {cancelling === trade.id ? 'Force Cancelling...' : '⚡ Force Cancel'}
                              </button>
                            )}
                            <a
                              href={`/trade/${trade.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md text-xs font-medium text-center"
                            >
                              View Details
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300/60 dark:border-gray-700 shadow-lg p-6 rounded-xl">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Trades</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{trades.length}</p>
          </div>
          <div className="bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300/60 dark:border-gray-700 shadow-lg p-6 rounded-xl">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Trades</h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {trades.filter(t => t.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300/60 dark:border-gray-700 shadow-lg p-6 rounded-xl">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed Trades</h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {trades.filter(t => ['accepted', 'declined', 'cancelled'].includes(t.status)).length}
            </p>
          </div>
          <div className="bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300/60 dark:border-gray-700 shadow-lg p-6 rounded-xl">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Expired Trades</h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {trades.filter(t => t.status === 'pending' && isTradeExpired(t.expiresAt)).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 