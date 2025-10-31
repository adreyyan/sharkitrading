/**
 * FHEVM Integration Service
 * Handles client-side encryption for the NFT Trading platform
 */

import { createInstance, FhevmInstance, initFhevm } from 'fhevmjs';
import { ethers } from 'ethers';

// Singleton instance
let fhevmInstance: FhevmInstance | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize FHEVM (call once at app startup)
 */
export async function initializeFHEVM(): Promise<void> {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      console.log('🔐 Initializing FHEVM...');
      await initFhevm();
      console.log('✅ FHEVM initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize FHEVM:', error);
      throw error;
    }
  })();
  
  return initPromise;
}

/**
 * Get or create FHEVM instance for the current network
 */
export async function getFHEVMInstance(
  provider: ethers.Provider
): Promise<FhevmInstance> {
  // Ensure FHEVM is initialized
  await initializeFHEVM();
  
  // If we already have an instance, return it
  if (fhevmInstance) {
    return fhevmInstance;
  }
  
  try {
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    console.log(`🔐 Creating FHEVM instance for chain ${chainId}...`);
    
    // Get network configuration
    const networkUrl = await getNetworkRpcUrl(chainId);
    const gatewayUrl = await getGatewayUrl(chainId);
    
    fhevmInstance = await createInstance({
      chainId,
      networkUrl,
      gatewayUrl,
    });
    
    console.log('✅ FHEVM instance created successfully');
    return fhevmInstance;
  } catch (error) {
    console.error('❌ Failed to create FHEVM instance:', error);
    throw error;
  }
}

/**
 * Encrypt a uint64 value for FHEVM
 */
export async function encryptAmount(
  amount: string | number,
  provider: ethers.Provider
): Promise<{ encryptedData: string; inputProof: string }> {
  const instance = await getFHEVMInstance(provider);
  
  // Convert to wei if it's a string representing ETH
  const amountWei = typeof amount === 'string' && amount.includes('.')
    ? ethers.parseEther(amount).toString()
    : amount.toString();
  
  console.log(`🔐 Encrypting amount: ${amountWei} wei`);
  
  // Encrypt the value
  const encrypted = instance.encrypt64(BigInt(amountWei));
  
  return {
    encryptedData: encrypted.handles[0],
    inputProof: encrypted.inputProof,
  };
}

/**
 * Decrypt an encrypted value (only works if you have permission)
 */
export async function decryptAmount(
  contractAddress: string,
  encryptedValue: string,
  provider: ethers.Provider
): Promise<bigint> {
  const instance = await getFHEVMInstance(provider);
  
  try {
    console.log('🔓 Attempting to decrypt value...');
    const decrypted = await instance.decrypt(contractAddress, encryptedValue);
    console.log('✅ Decryption successful');
    return BigInt(decrypted);
  } catch (error) {
    console.error('❌ Decryption failed (no permission?):', error);
    throw new Error('Unable to decrypt value - you may not have permission');
  }
}

/**
 * Get RPC URL for the chain
 */
async function getNetworkRpcUrl(chainId: number): Promise<string> {
  // Map chain IDs to RPC URLs
  const rpcUrls: Record<number, string> = {
    31337: 'http://localhost:8545', // Hardhat local
    11155111: `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`, // Sepolia
    9728: 'https://devnet.zama.ai', // Zama devnet (example)
    // Add more networks as needed
  };
  
  const url = rpcUrls[chainId];
  if (!url) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  
  return url;
}

/**
 * Get gateway URL for the chain
 */
async function getGatewayUrl(chainId: number): Promise<string> {
  // Map chain IDs to gateway URLs
  const gatewayUrls: Record<number, string> = {
    31337: 'http://localhost:8545', // Hardhat local (use same as RPC)
    11155111: 'https://gateway.sepolia.fhevm.io', // Sepolia gateway (example)
    9728: 'https://gateway.devnet.zama.ai', // Zama devnet (example)
    // Add more networks as needed
  };
  
  const url = gatewayUrls[chainId];
  if (!url) {
    // Fallback to using RPC URL
    console.warn(`No gateway URL for chain ${chainId}, using RPC URL`);
    return getNetworkRpcUrl(chainId);
  }
  
  return url;
}

/**
 * Check if FHEVM is supported on the current network
 */
export async function isFHEVMSupported(provider: ethers.Provider): Promise<boolean> {
  try {
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    // List of supported chain IDs
    const supportedChains = [31337, 11155111, 9728]; // Add more as needed
    
    return supportedChains.includes(chainId);
  } catch {
    return false;
  }
}

/**
 * Reset FHEVM instance (useful for network changes)
 */
export function resetFHEVMInstance(): void {
  fhevmInstance = null;
  console.log('🔄 FHEVM instance reset');
}


