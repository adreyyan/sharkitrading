/**
 * React Hook for FHEVM Integration
 * Automatically initializes FHEVM when component mounts
 */

import { useEffect, useState } from 'react';
import { initializeFHEVM, isFHEVMSupported } from '@/services/fhevm';
import { useProvider } from 'wagmi';

export function useFHEVM() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const provider = useProvider();

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        console.log('🔐 Initializing FHEVM...');
        
        // Initialize FHEVM
        await initializeFHEVM();
        
        // Check if current network supports FHEVM
        if (provider) {
          const supported = await isFHEVMSupported(provider);
          if (mounted) {
            setIsSupported(supported);
          }
        }
        
        if (mounted) {
          setIsInitialized(true);
          console.log('✅ FHEVM ready');
        }
      } catch (err) {
        console.error('❌ FHEVM initialization failed:', err);
        if (mounted) {
          setError(err as Error);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [provider]);

  return {
    isInitialized,
    isSupported,
    error,
  };
}


