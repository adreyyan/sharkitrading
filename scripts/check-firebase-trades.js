const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function isTradeExpired(expiresAt) {
  if (!expiresAt) return false;
  
  try {
    let expiryTime;
    
    // Handle Firestore timestamp
    if (expiresAt.toDate && typeof expiresAt.toDate === 'function') {
      expiryTime = expiresAt.toDate();
    }
    // Handle Firestore timestamp with seconds property
    else if (expiresAt.seconds) {
      expiryTime = new Date(expiresAt.seconds * 1000);
    }
    // Handle regular Date object or timestamp
    else {
      expiryTime = new Date(expiresAt);
    }
    
    // Check if the date is valid
    if (isNaN(expiryTime.getTime())) {
      return false;
    }
    
    return new Date() > expiryTime;
  } catch (error) {
    console.error('Error checking if trade is expired:', error);
    return false;
  }
}

function getTimeUntilExpiration(expiresAt) {
  if (!expiresAt) return 'No expiration';
  
  try {
    let expiryTime;
    
    // Handle Firestore timestamp
    if (expiresAt.toDate && typeof expiresAt.toDate === 'function') {
      expiryTime = expiresAt.toDate();
    }
    // Handle Firestore timestamp with seconds property
    else if (expiresAt.seconds) {
      expiryTime = new Date(expiresAt.seconds * 1000);
    }
    // Handle regular Date object or timestamp
    else {
      expiryTime = new Date(expiresAt);
    }
    
    // Check if the date is valid
    if (isNaN(expiryTime.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diff = expiryTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      const seconds = Math.floor(diff / 1000);
      return `${seconds}s`;
    }
  } catch (error) {
    console.error('Error calculating time until expiration:', error);
    return 'Error';
  }
}

async function main() {
  console.log('🔍 Checking Firebase Trades...');
  console.log('===============================');
  
  try {
    // Get all trades from Firebase
    const tradesRef = collection(db, 'trades');
    const q = query(tradesRef, orderBy('createdAt', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);
    
    const allTrades = [];
    const expiredTrades = [];
    const pendingTrades = [];
    
    querySnapshot.forEach((doc) => {
      const trade = {
        id: doc.id,
        ...doc.data()
      };
      allTrades.push(trade);
      
      if (trade.status === 'pending') {
        pendingTrades.push(trade);
        if (isTradeExpired(trade.expiresAt)) {
          expiredTrades.push(trade);
        }
      }
    });
    
    console.log(`📊 Found ${allTrades.length} total trades`);
    console.log(`📋 Found ${pendingTrades.length} pending trades`);
    console.log(`⚠️ Found ${expiredTrades.length} expired trades`);
    
    if (allTrades.length > 0) {
      console.log('\n📋 All Trades:');
      allTrades.forEach((trade, index) => {
        const expired = isTradeExpired(trade.expiresAt);
        const timeLeft = getTimeUntilExpiration(trade.expiresAt);
        
        console.log(`\n${index + 1}. Trade #${trade.id.slice(0, 8)}...`);
        console.log(`   From: ${trade.from || trade.fromAddress || 'N/A'}`);
        console.log(`   To: ${trade.to || trade.toAddress || 'N/A'}`);
        console.log(`   Status: ${trade.status}`);
        console.log(`   Offered MONAD: ${trade.offeredMonad || trade.offeredMONAD || '0'}`);
        console.log(`   Requested MONAD: ${trade.requestedMonad || trade.requestedMONAD || '0'}`);
        console.log(`   Blockchain ID: ${trade.blockchainTradeId || 'None'}`);
        console.log(`   Created: ${trade.createdAt ? new Date(trade.createdAt.seconds * 1000).toLocaleString() : 'N/A'}`);
        console.log(`   Expires: ${trade.expiresAt ? new Date(trade.expiresAt.seconds * 1000).toLocaleString() : 'N/A'}`);
        console.log(`   ${expired ? '❌ EXPIRED' : '✅ Active'} - ${timeLeft}`);
        
        if (trade.message) {
          console.log(`   Message: "${trade.message}"`);
        }
      });
    }
    
    if (expiredTrades.length > 0) {
      console.log('\n🔥 EXPIRED TRADES THAT NEED PROCESSING:');
      expiredTrades.forEach((trade, index) => {
        const expiredHours = Math.floor((new Date() - new Date(trade.expiresAt.seconds * 1000)) / (1000 * 60 * 60));
        
        console.log(`\n${index + 1}. Trade #${trade.id.slice(0, 8)}... - EXPIRED ${expiredHours}h ago`);
        console.log(`   From: ${trade.from || trade.fromAddress}`);
        console.log(`   Blockchain ID: ${trade.blockchainTradeId || 'Firebase only'}`);
        console.log(`   Offered MONAD: ${trade.offeredMonad || trade.offeredMONAD || '0'}`);
        console.log(`   Expired: ${new Date(trade.expiresAt.seconds * 1000).toLocaleString()}`);
      });
      
      console.log('\n🤖 NEXT STEPS:');
      console.log('1. Run Firebase expiration check:');
      console.log('   node scripts/test-expiration.js');
      console.log('\n2. Users can manually cancel/decline these trades via the UI.');
      console.log('\n3. Or manually expire individual trades:');
      expiredTrades.forEach(trade => {
        if (trade.blockchainTradeId) {
          console.log(`   node scripts/expire-stuck-trade.js ${trade.blockchainTradeId}`);
        }
      });
    } else {
      console.log('\n✨ No expired trades found in Firebase!');
    }
    
  } catch (error) {
    console.error('❌ Error checking Firebase trades:', error);
    console.error('Make sure your Firebase environment variables are set correctly');
  }
}

main().catch(console.error); 