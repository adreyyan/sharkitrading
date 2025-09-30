'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { connectorsForWallets, RainbowKitProvider, darkTheme, lightTheme, Theme } from '@rainbow-me/rainbowkit'
import {
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { configureChains, createConfig, WagmiConfig } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'

// Define Sepolia Testnet for fhEVM
const sepoliaTestnet = {
  id: 11155111,
  name: 'Sepolia',
  network: 'sepolia',
  iconUrl: '/ethereum-logo.png',
  iconBackground: '#627EEA',
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
}

const { chains, publicClient } = configureChains(
  [sepoliaTestnet],
  [publicProvider()]
)

console.log('🔗 WalletProvider: Chains configured:', chains)
console.log('🔗 WalletProvider: Public client configured:', !!publicClient)

const connectors = connectorsForWallets([
  {
    groupName: 'Popular',
    wallets: [
      metaMaskWallet({ projectId: 'fhevm-nft-trading', chains }),
      injectedWallet({ chains }),
      coinbaseWallet({ appName: 'fhEVM NFT Trading', chains }),
    ],
  },
])

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

function RainbowKitProviderWithTheme({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  
  const createGlassTheme = (isDark: boolean): Theme => {
    const base = isDark
      ? darkTheme({
          accentColor: '#7c3aed',
          accentColorForeground: 'white',
          borderRadius: 'medium',
          fontStack: 'system',
          overlayBlur: 'small',
        })
      : lightTheme({
          accentColor: '#3b82f6',
          accentColorForeground: 'white',
          borderRadius: 'medium',
          fontStack: 'system',
          overlayBlur: 'small',
        });

    return {
      ...base,
      colors: {
        ...base.colors,
        // Make outer background transparent to avoid double-glass effect on mobile
        connectButtonBackground: 'transparent',
        connectButtonBackgroundError: isDark ? 'rgba(255,0,0,0.15)' : 'rgba(255,0,0,0.1)',
        connectButtonInnerBackground: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)',
        actionButtonBorder: 'transparent',
        actionButtonBorderMobile: 'transparent',
        menuItemBackground: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        modalBackground: isDark ? 'rgba(23,23,23,0.6)' : 'rgba(255,255,255,0.6)',
        modalBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
        generalBorderDim: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
      },
      shadows: {
        ...base.shadows,
        connectButton: '0 4px 20px rgba(0,0,0,0.15)',
      },
    } as Theme;
  };

  const rainbowKitTheme = createGlassTheme(theme === 'dark');

  return (
    <RainbowKitProvider chains={chains} theme={rainbowKitTheme}>
      {children}
    </RainbowKitProvider>
  )
}

export default function RainbowKitProviders({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    console.log('🔗 WalletProvider: Component mounting...')
    setIsMounted(true)
    console.log('🔗 WalletProvider: Component mounted!')
  }, [])

      if (!isMounted) {
    console.log('🔗 WalletProvider: Waiting for mount...')
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1A1A1A] text-gray-900 dark:text-white transition-colors duration-300">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  console.log('🔗 WalletProvider: Rendering providers...')
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProviderWithTheme>
          {children}
        </RainbowKitProviderWithTheme>
      </QueryClientProvider>
    </WagmiConfig>
  );
} 