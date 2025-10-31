import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';

export interface NFTItem {
  contract: string;
  tokenId: string;
  image?: string;
  name?: string;
  collectionName?: string;
  amount?: string;
  standard?: string;
}

export interface TradeProposal {
  id?: string;
  from: string;
  to: string;
  offer: NFTItem[];
  requested: NFTItem[];
  offeredETH?: string;
  requestedETH?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: any;
  expiresAt?: any;
  blockchainTradeId?: string; // For trades created with blockchain integration
  transactionHash?: string; // Transaction hash for blockchain operations
}

// Cache duration for offline mode
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function proposeTrade({
  from,
  to,
  offer,
  requested,
  offeredETH,
  requestedETH,
  message,
  blockchainTradeId
}: {
  from: string;
  to: string;
  offer: NFTItem[];
  requested: NFTItem[];
  offeredETH?: string;
  requestedETH?: string;
  message?: string;
  blockchainTradeId?: string;
}): Promise<string> {
  console.log('Starting proposeTrade with data:', {
    from,
    to,
    offer,
    requested,
    offeredETH,
    requestedETH,
    message,
    blockchainTradeId
  });

  // Validate inputs
  if (!from || !to) {
    throw new Error('Both from and to addresses are required');
  }

  if ((!offer || offer.length === 0) && (!offeredETH || parseFloat(offeredETH) === 0)) {
    throw new Error('Must offer at least one NFT or some ETH');
  }

  if ((!requested || requested.length === 0) && (!requestedETH || parseFloat(requestedETH) === 0)) {
    throw new Error('Must request at least one NFT or some ETH');
  }

  try {
    const tradeData: Omit<TradeProposal, 'id'> = {
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      offer: offer || [],
      requested: requested || [],
      offeredETH: offeredETH || '0',
      requestedETH: requestedETH || '0',
      message: message || '',
      status: 'pending',
      createdAt: serverTimestamp(),

      ...(blockchainTradeId && { blockchainTradeId })
    };

    console.log('Adding trade to Firestore...');
    const docRef = await addDoc(collection(db, 'trades'), tradeData);
    console.log('✅ Trade added with ID:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('Error in proposeTrade:', {
      error,
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack
    });
    throw error;
  }
}

export async function getTrade(tradeId: string): Promise<TradeProposal | null> {
  try {
    const docRef = doc(db, 'trades', tradeId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as TradeProposal;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting trade:', error);
    throw error;
  }
}

export async function updateTradeStatus(
  tradeId: string, 
  status: 'accepted' | 'declined' | 'cancelled',
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    const docRef = doc(db, 'trades', tradeId);
    const updateData = {
      status,
      updatedAt: serverTimestamp(),
      ...additionalData
    };
    
    await updateDoc(docRef, updateData);
    console.log('✅ Trade status updated to:', status, additionalData ? 'with additional data' : '');
  } catch (error) {
    console.error('Error updating trade status:', error);
    throw error;
  }
}

export async function getUserTrades(userAddress: string): Promise<TradeProposal[]> {
  try {
    const tradesRef = collection(db, 'trades');
    const q = query(
      tradesRef,
      where('from', '==', userAddress.toLowerCase()),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const querySnapshot = await getDocs(q);
    const trades: TradeProposal[] = [];
    
    querySnapshot.forEach((doc) => {
      trades.push({
        id: doc.id,
        ...doc.data()
      } as TradeProposal);
    });
    
    return trades;
  } catch (error) {
    console.error('Error getting user trades:', error);
    throw error;
  }
}

// Offline mode functionality
let isOffline = false;
let offlineCache: { [key: string]: { data: any; timestamp: number } } = {};

export function setOfflineMode(offline: boolean) {
  isOffline = offline;
  console.log('Offline mode:', offline ? 'enabled' : 'disabled');
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

function getCachedData(key: string): any {
  const cached = offlineCache[key];
  if (cached && isCacheValid(cached.timestamp)) {
    console.log('📦 Using cached data for:', key);
    return cached.data;
  }
  return null;
}

function setCacheData(key: string, data: any): void {
  offlineCache[key] = {
    data,
    timestamp: Date.now()
  };
}

// Admin functions
export async function getAllTradesForAdmin(filters?: {
  status?: string[];
  limit?: number;
  offset?: number;
}): Promise<{ trades: TradeProposal[]; total: number; hasMore: boolean }> {
  try {
    const tradesRef = collection(db, 'trades');
    let q = query(tradesRef, orderBy('createdAt', 'desc'));
    
    // Apply status filter if provided
    if (filters?.status && filters.status.length > 0) {
      q = query(tradesRef, where('status', 'in', filters.status), orderBy('createdAt', 'desc'));
    }
    
    // Apply limit
    if (filters?.limit) {
      q = query(q, limit(filters.limit));
    }
    
    const querySnapshot = await getDocs(q);
    const trades: TradeProposal[] = [];
    
    querySnapshot.forEach((doc) => {
      trades.push({
        id: doc.id,
        ...doc.data()
      } as TradeProposal);
    });
    
    return {
      trades,
      total: trades.length,
      hasMore: false // Simple implementation, could be enhanced with pagination
    };
  } catch (error) {
    console.error('Error getting all trades for admin:', error);
    throw error;
  }
}

// Trade expiration utilities
export async function cancelExpiredTrades(): Promise<{ cancelled: number; errors: string[] }> {
  try {
    const tradesRef = collection(db, 'trades');
    const q = query(
      tradesRef,
      where('status', '==', 'pending'),
      where('expiresAt', '<=', new Date())
    );
    
    const querySnapshot = await getDocs(q);
    const batch = [];
    const errors: string[] = [];
    
    querySnapshot.forEach((doc) => {
      batch.push(
        updateTradeStatus(doc.id, 'cancelled', { 
          cancelReason: 'expired',
          cancelledAt: new Date()
        }).catch(error => {
          console.error(`Failed to cancel trade ${doc.id}:`, error);
          errors.push(`Trade ${doc.id}: ${error.message}`);
        })
      );
    });
    
    await Promise.all(batch);
    console.log('✅ Expired trades cancelled:', batch.length);
    return { cancelled: batch.length, errors };
  } catch (error) {
    console.error('Error cancelling expired trades:', error);
    throw error;
  }
}

export function isTradeExpired(expiresAt: any): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) <= new Date();
}

export function getTimeUntilExpiration(expiresAt: any): string {
  if (!expiresAt) return 'No expiration';
  
  const now = new Date();
  const expiration = new Date(expiresAt);
  const diff = expiration.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

 