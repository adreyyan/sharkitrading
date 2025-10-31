'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navigationItems = [
  { name: 'Vault', href: '/vault', emoji: '🏦', description: 'Private NFT vault' },
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
              <p className="text-zinc-400 text-[11px] leading-tight truncate">Private NFT trading platform built with Zama's fhEVM.</p>
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