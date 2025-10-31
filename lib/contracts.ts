import { FHEVM_V7_ABI } from './abi-fhev7';
import { PRIVATE_NFT_VAULT_ABI } from './abi-vault';
import { PRIVATE_TRADING_ABI } from './abi-private-trading';
import { PRIVATE_NFT_TRADING_V1_ABI } from './abi-v1';

// ═══════════════════════════════════════════════════════════════
// 🔐 PRIVATE NFT VAULT SYSTEM - TRUE PRIVACY!
// ═══════════════════════════════════════════════════════════════
export const PRIVATE_NFT_VAULT_ADDRESS = "0xaABBC3d80b9C7e33Eaf2D148f52d60A5ebBc4084"; // ✅ WITH WITHDRAW FIX!
export const PRIVATE_NFT_TRADING_V1_ADDRESS = "0xB4981E473Ad74a410b5479bf21635c47108D243a"; // ✅ FIXED!
export const FHEVM_V7_ADDRESS = "0xf898Ecf6aE3e69cAA21026d95b4964c6641fe7bD"; // Regular NFT trading
export const PRIVATE_NFT_TRADING_ADDRESS = "0xc5f8a764Ee8843cF7AF326845F2448a5e6C9f5eF"; // Old (fhevmjs)

// Main addresses
export const NFT_TRADING_ADDRESS = PRIVATE_NFT_TRADING_V1_ADDRESS; // ✅ ACTIVE: Receipt trading!
export const NFT_VAULT_ADDRESS = PRIVATE_NFT_VAULT_ADDRESS; // Vault for privacy

// ═══════════════════════════════════════════════════════════════
// CONTRACT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

// Main working contract - PrivateNFTTradingV1 for receipt trading!
export const CONTRACT_CONFIG = {
  address: PRIVATE_NFT_TRADING_V1_ADDRESS,
  abi: PRIVATE_NFT_TRADING_V1_ABI,
} as const;

// Vault system (for documentation)
export const CONTRACT_VAULT_CONFIG = {
  address: PRIVATE_NFT_VAULT_ADDRESS,
  abi: PRIVATE_NFT_VAULT_ABI,
} as const;

export const CONTRACT_PRIVATE_TRADING_CONFIG = {
  address: PRIVATE_NFT_TRADING_ADDRESS,
  abi: PRIVATE_TRADING_ABI,
} as const;

export const VAULT_CONFIG = CONTRACT_VAULT_CONFIG;

// Contract constants
export const TRADE_FEE = "0.01"; // 0.01 ETH fee per trade (FHEV7 contract - can be changed by admin)
export const FEE_RECIPIENT = "0x20ce27B140A0EEECceF880e01D2082558400FDd6";

// Legacy Network Configuration (kept for backwards compatibility)
export const LEGACY_TESTNET = {
  chainId: 10143,
  name: 'Legacy Testnet',
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