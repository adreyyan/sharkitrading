import Image from 'next/image';
import { NFTItem } from '@/services/trade';
import { isVerifiedNFT, getVerifiedNFTName } from '@/app/config/verifiedNFTs';
import { ReactNode } from 'react';

interface TradeNFTDisplayProps {
  nfts: (NFTItem & { selectedCount?: number })[];
  title: ReactNode;
  monadAmount?: ReactNode;
  isLoading?: boolean;
}

const PLACEHOLDER_IMAGE = '/placeholder.svg';

export default function TradeNFTDisplay({ nfts, title, monadAmount, isLoading = false }: TradeNFTDisplayProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = PLACEHOLDER_IMAGE;
    target.onerror = null; // Prevent infinite loop
  };

  if (isLoading) {
    return (
      <div className="glass-card h-full flex flex-col p-4 shadow-lg animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-5 w-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-square bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card h-full flex flex-col p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-200">{title}</h3>
      </div>
      
      {/* Show monad amount at the top only when there are NFTs */}
      {nfts.length > 0 && monadAmount && (
        <div className="mb-3">{monadAmount}</div>
      )}

      {nfts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-600 dark:text-gray-500 min-h-[120px]">
          {monadAmount ? (
            /* Center the MONAD amount if no NFTs present */
            monadAmount
          ) : (
            <div className="text-center">
              <div className="text-2xl mb-2">📦</div>
              <p className="text-xs">No NFTs</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2">
          {nfts.map((nft, index) => {
            const collectionName = getVerifiedNFTName(nft.contract);
            const isVerified = isVerifiedNFT(nft.contract);
            const quantity = nft.selectedCount || parseInt(nft.amount || '1');
            
            return (
              <div key={`${nft.contract}-${nft.tokenId}-${index}`} className="relative group">
                <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                  <Image
                    src={nft.image || PLACEHOLDER_IMAGE}
                    alt={nft.name || `NFT #${nft.tokenId}`}
                    fill
                    sizes="(max-width: 640px) 20vw, 15vw"
                    className="object-cover transition-all duration-200 group-hover:scale-105"
                    onError={handleImageError}
                    priority={index < 6} // Prioritize loading first 6 images
                  />
                  {isVerified && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {/* Quantity Badge */}
                  {quantity > 1 && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 rounded text-white text-xs font-medium">
                      ×{quantity}
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <div className="text-xs text-white">
                      <p className="font-medium truncate">#{nft.tokenId}</p>
                      {collectionName && (
                        <p className="text-gray-300 truncate text-[9px] mt-0.5">{collectionName}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 