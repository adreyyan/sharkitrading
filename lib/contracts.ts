import { MONAD_NFT_TRADING_ABI } from './abi';
import { MONAD_NFT_TRADING_V6_ABI } from './abi-v6';
import { BASIC_NFT_TRADING_ABI } from './abi-basic';
import { FHEVM_V7_ABI } from './abi-fhev7';

// ✅ V5 CONTRACT - FIXED MONAD TRANSFER LOGIC - DEPLOYED
export const MONAD_NFT_TRADING_V5_ADDRESS = "0x773C0fc7Ce0489B078A532123dd0D86131E1ACf9";

// 🆕 V6 CONTRACT - ENHANCED ADMIN FEATURES - DEPLOYED (MONAD)
export const MONAD_NFT_TRADING_V6_ADDRESS = "0x9e2c22E0D77500ddD9e15d5ff3D27F7643e1dCE3";

// 🔐 fhEVM V7 CONTRACT - PRIVACY-ENABLED TRADING WITH V7 INTERFACE - DEPLOYED (SEPOLIA)
export const FHEVM_NFT_TRADING_ADDRESS = "0xf898Ecf6aE3e69cAA21026d95b4964c6641fe7bD";

// 🆕 BASIC CONTRACT - NON-ENCRYPTED TRADING - FOR TESTING (SEPOLIA)  
export const BASIC_NFT_TRADING_ADDRESS = "0x695a59b769FcFD3Af710891fc24282772DCd6302"; // Old fhEVM address

// Current active contract (fhEVM with encrypted amounts)
export const MONAD_NFT_TRADING_ADDRESS = FHEVM_NFT_TRADING_ADDRESS;

// Contract configurations
export const CONTRACT_V5_CONFIG = {
  address: MONAD_NFT_TRADING_V5_ADDRESS,
  abi: MONAD_NFT_TRADING_ABI,
} as const;

export const CONTRACT_V6_CONFIG = {
  address: MONAD_NFT_TRADING_V6_ADDRESS,
  abi: MONAD_NFT_TRADING_V6_ABI,
} as const;

export const CONTRACT_FHEVM_CONFIG = {
  address: FHEVM_NFT_TRADING_ADDRESS,
  abi: FHEVM_V7_ABI, // FHEV7 ABI with correct signature
} as const;

export const CONTRACT_BASIC_CONFIG = {
  address: BASIC_NFT_TRADING_ADDRESS,
  abi: BASIC_NFT_TRADING_ABI, // Basic contract without encryption
} as const;

// Current active contract config (fhEVM V7 for Sepolia)
export const CONTRACT_CONFIG = CONTRACT_FHEVM_CONFIG;

// Contract constants
export const TRADE_FEE = "0.01"; // 0.01 ETH fee per trade (FHEV7 contract - can be changed by admin)
export const FEE_RECIPIENT = "0x20ce27B140A0EEECceF880e01D2082558400FDd6";

// Monad Testnet configuration
export const MONAD_TESTNET = {
  chainId: 10143,
  name: 'Monad Testnet',
  rpcUrl: 'https://testnet-rpc.monad.xyz/',
  hyperRpcUrl: 'https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d',
  blockExplorer: 'https://testnet-explorer.monad.xyz/',
} as const;

// Sepolia Testnet configuration (for fhEVM)
export const SEPOLIA_TESTNET = {
  chainId: 11155111,
  name: 'Sepolia',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  blockExplorer: 'https://sepolia.etherscan.io/',
} as const;

// Current active network (Sepolia for fhEVM)
export const ACTIVE_NETWORK = SEPOLIA_TESTNET;

// Hybrid RPC provider that uses ACTIVE_NETWORK configuration
export const getOptimalProvider = () => {
  return {
    // Use standard RPC for Sepolia (no HyperRPC support for Sepolia)
    hyperRpc: ACTIVE_NETWORK.rpcUrl,
    standardRpc: ACTIVE_NETWORK.rpcUrl,
  };
};

// HyperRPC supported methods (from docs)
export const HYPER_RPC_SUPPORTED_METHODS = [
  'eth_chainId',
  'eth_blockNumber',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_getBlockReceipts',
  'eth_getTransactionByHash',
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_getTransactionReceipt',
  'eth_getLogs',
  'trace_block',
] as const;