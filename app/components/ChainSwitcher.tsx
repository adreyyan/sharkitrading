'use client';

import { useState } from 'react';
import Image from 'next/image';

const chains = [
  {
    name: 'Sepolia',
    symbol: 'ETH',
    active: true,
    comingSoon: false,
    color: 'blue'
  }
];

export default function ChainSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const activeChain = chains.find(chain => chain.active) || chains[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="jupiter-card p-3 flex items-center gap-3 hover:bg-zinc-800/80 transition-colors min-w-[140px]"
      >
        <div className="flex items-center gap-2">
          {/* Chain Icon */}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden ${
            activeChain.name === 'Sepolia' ? 'bg-blue-500/20 p-1' :
            activeChain.name === 'Solana' ? 'bg-white/10 p-1' :
            'bg-blue-500'
          }`}>
            {activeChain.name === 'Sepolia' ? (
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">Ξ</span>
              </div>
            ) : activeChain.name === 'Solana' ? (
              <Image
                src="/solana-logo.png"
                alt="Solana Logo"
                width={16}
                height={16}
                className="object-contain"
              />
            ) : (
              <span className="text-white font-bold text-xs">{activeChain.symbol.charAt(0)}</span>
            )}
          </div>
          {/* Chain Name */}
          <span className="text-white font-medium text-sm">{activeChain.name}</span>
        </div>
        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ml-auto ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="jupiter-card overflow-hidden min-w-[160px]">
            {chains.map((chain) => (
              <button
                key={chain.name}
                onClick={() => {
                  if (!chain.comingSoon) {
                    setIsOpen(false);
                  }
                }}
                disabled={chain.comingSoon}
                className={`
                  w-full p-3 flex items-center justify-between transition-colors border-b border-zinc-700/50 last:border-b-0
                  ${chain.active
                    ? 'bg-zinc-700/50'
                    : chain.comingSoon
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:bg-zinc-800/50'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Chain Icon */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden ${
                    chain.name === 'Sepolia' ? 'bg-blue-500/20 p-1' :
                    chain.name === 'Solana' ? 'bg-white/10 p-1' :
                    'bg-blue-500'
                  }`}>
                    {chain.name === 'Sepolia' ? (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs">Ξ</span>
                      </div>
                    ) : chain.name === 'Solana' ? (
                      <Image
                        src="/solana-logo.png"
                        alt="Solana Logo"
                        width={16}
                        height={16}
                        className="object-contain"
                      />
                    ) : (
                      <span className="text-white font-bold text-xs">{chain.symbol.charAt(0)}</span>
                    )}
                  </div>
                  {/* Chain Name */}
                  <span className="text-white font-medium text-sm">{chain.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {chain.active && (
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  )}
                  {chain.comingSoon && (
                    <div className="text-xs text-amber-400 font-medium px-2 py-1 bg-amber-400/10 rounded-md">
                      Soon
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 