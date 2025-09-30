'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Sidebar from './components/Sidebar';
import MobileMenuButton from './components/MobileMenuButton';
import ChainSwitcher from './components/ChainSwitcher';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SharkiWord from '../assets/sharki2.png';

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className={`flex-1 ${isSidebarOpen ? 'lg:pl-72' : ''}`}>
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MobileMenuButton 
                isOpen={isSidebarOpen}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <ChainSwitcher />
              <ConnectButton label="Connect" showBalance={false} />
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          
          <div className="relative z-10 px-6 py-20">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                
                {/* Left Content */}
                <div className="text-white">

                  <Image src={SharkiWord} alt="Sharki" width={160} height={40} className="mb-6 object-contain" />
                  <p className="text-xl mb-8 text-zinc-200 leading-relaxed">
                    Sharki is your trusted platform for exploring the full potential of NFTs. Built for collectors, traders and creators, it offers a seamless experience for managing, trading, sending and lending digital assets all in one place.
                  </p>
                  <p className="text-lg mb-8 text-zinc-300 leading-relaxed">
                    With powerful tools and a growing community, Sharki makes Web3 simple without taking away control. Whether you are discovering your first NFT or managing an entire vault, Sharki is designed to make every step smooth, secure and enjoyable.
                  </p>
                  <p className="text-lg text-zinc-300 leading-relaxed">
                    NFTs are more than just tokens. They are culture, creativity and connection. Sharki brings it all together.
                  </p>
                </div>

                {/* Right Content - Sharki Logo */}
                <div className="flex justify-center">
                  <div className="w-80 h-80 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-sm border border-green-200/20 p-8 shadow-xl shadow-green-200/10">
                    <Image
                      src="/sharki.png"
                      alt="Sharki Logo"
                      width={240}
                      height={240}
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sharki Swap Section */}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-6 lg:px-20 py-20">
          {/* Video + Heading */}
          <div className="flex flex-col items-center lg:items-start self-center space-y-6">
            <h2 className="text-5xl font-black text-white leading-tight">Sharki Swap</h2>
            <video
              src="/trading.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full max-w-lg rounded-2xl shadow-xl"
            />
          </div>
          {/* Text */}
          <div className="space-y-6 text-white max-w-xl mx-auto lg:mx-0 self-center">
            <p className="text-xl mb-6 text-zinc-200">The easiest and most friendly way to trade NFTs</p>
            <p className="text-zinc-300">Sharki Swap makes NFT trading simple, secure and social. You can create a trade link to share with friends or fellow traders, or let them discover it through their notification bar. Add a personal message, include some coins to balance the trade if needed, and you're good to go.</p>
            <p className="text-zinc-300">When you propose a trade, your assets are placed into escrow. You can either cancel the trade or wait for the other person to accept or reject it. If you cancel, your NFTs and coins are safely returned to your wallet. This means you do not need to rely on the other person being online at the same time — it works on your terms.</p>
            <p className="text-zinc-300">One of the most important features of Sharki Swap is what we call restoring an orphan trade. An orphan trade happens when your assets are already in escrow but you lose connection or face issues like a power outage. With Sharki, you can simply paste your transaction hash and recover your NFTs instantly and safely.</p>
            <p className="text-zinc-300">We only fetch NFTs verified on our platform, ensuring every trade is secure. If you have traded on Steam before, you will feel right at home with the Sharki experience.</p>
          </div>
        </div>

        {/* Sharki Loan Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-6 lg:px-20 py-20">
          {/* Video */}
          <div className="flex flex-col items-center lg:items-start self-center space-y-6 order-last lg:order-first">
            <h2 className="text-5xl font-black text-white leading-tight">Sharki Loan</h2>
            <video
              src="/lending.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full max-w-lg rounded-2xl shadow-xl"
            />
          </div>
          {/* Text */}
          <div className="space-y-6 text-white max-w-xl mx-auto lg:mx-0 self-center">
                        <p className="text-xl mb-6 text-zinc-200">Borrow and lend using NFTs as collateral</p>
            <p className="text-zinc-300">Make loan offers on NFT collections. Explore verified collections and name your price. Your offer will be visible to all potential borrowers. If someone accepts, they will lock one of their NFTs from that collection as collateral. You get paid at the end of the loan term with interest. If the borrower does not repay on time, you receive the NFT.</p>
            <p className="text-zinc-300">My offers and contracts. Once your offer is accepted, a secure contract is created. The NFT stays in the borrower’s wallet but is frozen for the duration of the loan. When the loan ends, you receive the full repayment with interest. If the borrower defaults, you can foreclose and the NFT will be transferred to your wallet.</p>
            <p className="text-zinc-300">Borrow against your NFTs. Get instant liquidity by borrowing against your NFTs. With escrow-free loans, your NFT stays in your wallet but becomes frozen once the contract starts. Repay the loan on time to automatically unlock your NFT. If you miss the deadline, the lender can claim your NFT as repayment.</p>
          </div>
        </div>

        {/* Sharki Send Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-6 lg:px-20 py-20">
          {/* Video */}
          <div className="flex flex-col items-center lg:items-start self-center space-y-6 order-last lg:order-first">
            <h2 className="text-5xl font-black text-white leading-tight">Sharki Send</h2>
            <video
              src="/send.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full max-w-lg rounded-2xl shadow-xl"
            />
          </div>
          {/* Text */}
          <div className="space-y-6 text-white max-w-xl mx-auto lg:mx-0 self-center">
                        <p className="text-xl mb-6 text-zinc-200">Send NFTs in batches with ease</p>
            <p className="text-zinc-300">Tired of sending NFTs one by one? Sharki Send lets you transfer multiple NFTs in a single batch. Whether you are organizing your collection, sending gifts to friends or sharing drops with your community, Sharki makes it fast and simple.</p>
            <p className="text-zinc-300">For creators, Sharki Send is the perfect tool for airdrops and community rewards. Deliver NFTs to multiple addresses in just a few clicks — no more repeating the same transaction over and over.</p>
          </div>
        </div>

        {/* Split Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 hidden">
          
          {/* Video Section */}
          <div className="relative overflow-hidden">
            <div className="relative z-10 p-16 text-center">
              
              {/* Character */}
              <div className="mb-8 flex justify-center">
                <div className="w-40 h-40 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-orange-200/30 shadow-xl shadow-orange-200/10">
                  <div className="text-6xl">⚡</div>
                </div>
              </div>

              <h2 className="text-5xl font-black text-zinc-100 mb-8 leading-tight">
                THE MONAD
                <br />
                TRADING HUB
              </h2>
              
              <p className="text-zinc-200 text-lg mb-8 max-w-md mx-auto">
                LEARN ABOUT THE MONAD ECOSYSTEM AND DISCOVER AMAZING NFT COLLECTIONS
              </p>

              <Link href="/swap">
                <button className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-orange-200/30 hover:border-orange-200/50 rounded-full px-8 py-4 flex items-center gap-3 mx-auto transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-orange-200/20">
                  <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                    <span className="text-zinc-800 text-xl font-bold">→</span>
                  </div>
                  <span className="text-zinc-100 font-bold text-lg">DISCOVER</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Right Section - Start Trading */}
          <div className="relative overflow-hidden">
            <div className="relative z-10 p-16 text-center">
              
              {/* Character */}
              <div className="mb-8 flex justify-center">
                <div className="w-40 h-40 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-purple-200/30 shadow-xl shadow-purple-200/10">
                  <div className="text-6xl">🚀</div>
                </div>
              </div>

              <h2 className="text-5xl font-black text-zinc-100 mb-8 leading-tight">
                TRADE NFTS &
                <br />
                COLLECTIBLES
              </h2>
              
              <p className="text-zinc-200 text-lg mb-8 max-w-md mx-auto">
                START YOUR TRADING JOURNEY TODAY! SWAP, TRADE, AND COLLECT ON MONAD
              </p>

              <Link href="/swap">
                <button className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-purple-200/30 hover:border-purple-200/50 rounded-full px-8 py-4 flex items-center gap-3 mx-auto transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-purple-200/20">
                  <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                    <span className="text-zinc-800 text-xl font-bold">→</span>
                  </div>
                  <span className="text-zinc-100 font-bold text-lg">TRADE NOW</span>
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Section - Marketplace */}
        <div className="relative overflow-hidden hidden">
          <div className="relative z-10 px-6 py-16">
            <div className="max-w-4xl mx-auto text-center">
              
              {/* Character Row */}
              <div className="flex justify-center gap-8 mb-12">
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-blue-200/30 shadow-xl shadow-blue-200/10">
                  <div className="text-4xl">💎</div>
                </div>
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-blue-200/30 shadow-xl shadow-blue-200/10">
                  <div className="text-4xl">🎯</div>
                </div>
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-blue-200/30 shadow-xl shadow-blue-200/10">
                  <div className="text-4xl">⭐</div>
                </div>
              </div>

              <h2 className="text-5xl font-black text-zinc-100 mb-6">
                WHITELIST MARKETPLACE
              </h2>
              
              <p className="text-zinc-200 text-xl mb-8 max-w-2xl mx-auto">
                Get exclusive access to the hottest NFT drops and whitelist spots
              </p>

              <Link href="/wl-market">
                <button className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-blue-200/30 hover:border-blue-200/50 rounded-full px-10 py-5 flex items-center gap-4 mx-auto transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-200/20">
                  <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                    <span className="text-zinc-800 text-2xl font-bold">→</span>
                  </div>
                  <span className="text-zinc-100 font-bold text-xl">EXPLORE MARKETPLACE</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 