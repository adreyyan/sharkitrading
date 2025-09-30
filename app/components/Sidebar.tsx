'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navigationItems = [
  { name: 'Swap', href: '/swap', emoji: '⇄', description: 'Peer-to-peer swap' },
];

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className={`
      fixed top-0 left-0 h-screen w-72 bg-zinc-900 border-r border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out flex flex-col overflow-hidden
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Header - Fixed height */}
      <div className="p-6 border-b border-zinc-800 flex-shrink-0 h-20">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-1">
            {/* Logo removed */}
            <div className="min-w-0">
              <h1 className="text-green-300 font-bold text-2xl leading-7 tracking-[-0.01em] truncate">Sharki</h1>
              <p className="text-zinc-400 text-sm truncate">Home of NFTs</p>
            </div>
          </div>
          
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation - Fixed height with no scroll */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <nav className="p-4 space-y-1 flex-shrink-0">
          <div className="text-zinc-500/90 text-[11px] font-semibold uppercase tracking-[.08em] mb-4 px-2">
            Explore Apps
          </div>
          
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`
                block px-3 py-2 rounded-lg transition-colors duration-150 ease-out group relative
                ${isActive(item.href)
                  ? 'border border-[#67e2c7]/30 bg-white/[0.02]'
                  : 'border border-transparent'
                }
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60
              `}
            >
              {/* Content */}
              <div className="relative flex items-center gap-2.5">
                <span className={`w-5 text-center text-[18px] leading-none transition-colors duration-150 flex-shrink-0 ${
                  isActive(item.href)
                    ? 'text-zinc-300'
                    : 'text-zinc-500 group-hover:text-green-400'
                }`}>
                  {item.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-[14px] leading-5 tracking-[-0.01em] transition-colors duration-150 truncate ${
                    isActive(item.href)
                      ? 'text-white font-bold'
                      : 'text-zinc-300 group-hover:text-green-300 font-semibold'
                  }`}>
                    {item.name}
                  </div>
                  <div className={`text-[12px] leading-4 font-normal transition-colors duration-150 truncate ${
                    isActive(item.href)
                      ? 'text-zinc-400'
                      : 'text-zinc-500'
                  }`}>
                    {item.description}
                  </div>
                </div>
                
                {/* Active indicator */}
                {isActive(item.href) && (
                  <div className="w-1.5 h-1.5 bg-[#67e2c7] rounded-full animate-pulse shadow-lg shadow-[#67e2c7]/50 flex-shrink-0" />
                )}
              </div>
            </Link>
          ))}
        </nav>

        {/* Spacer - takes remaining space */}
        <div className="flex-1 min-h-0"></div>

        {/* Social Media Links */}
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center justify-center gap-3">
            {/* X/Twitter */}
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-105"
            >
              <svg className="w-4 h-4 text-zinc-400 hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            
            {/* Discord */}
            <a 
              href="https://discord.gg" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-105"
            >
              <svg className="w-5 h-5 text-zinc-400 hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.369a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.08.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.84 19.84 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 00-.031-.03zM8.02 14.708c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.213 0 2.177 1.096 2.157 2.419 0 1.334-.955 2.419-2.157 2.419zm7.974 0c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.213 0 2.177 1.096 2.157 2.419 0 1.334-.944 2.419-2.157 2.419z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Network Status - Fixed at bottom */}
        <div className="p-4 border-t border-zinc-800 flex-shrink-0 h-20 hidden">
          <div className="jupiter-card p-3 text-center border border-[#67e2c7]/10 bg-green-200/5 h-full flex flex-col justify-center">
            <div className="text-xs text-[#67e2c7]/80 mb-1 font-semibold uppercase tracking-wider">Network Status</div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#67e2c7] rounded-full animate-pulse shadow-lg shadow-[#67e2c7]/50 flex-shrink-0"></div>
              <span className="text-xs font-medium text-[#67e2c7]">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 