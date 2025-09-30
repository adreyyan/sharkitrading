// backfill-transaction-hashes.js
// One-off utility to write missing `transactionHash` fields into Firestore trades
// Run with:  node scripts/backfill-transaction-hashes.js

import 'dotenv/config';
import { db } from '../lib/firebase.js';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { ethers } from 'ethers';
import { CONTRACT_CONFIG, MONAD_TESTNET } from '../lib/contracts.js';

const provider = new ethers.JsonRpcProvider(MONAD_TESTNET.rpcUrl);
const acceptedTopic = ethers.id('TradeAccepted(uint256,address,address)');

function getTradeIdTopic(tradeId) {
  return ethers.zeroPadValue(ethers.toBeHex(ethers.getBigInt(tradeId)), 32);
}

async function fetchTxHashForTrade(tradeId) {
  try {
    const filter = {
      address: CONTRACT_CONFIG.address,
      fromBlock: 0,
      toBlock: 'latest',
      topics: [acceptedTopic, getTradeIdTopic(tradeId)],
    };
    const logs = await provider.getLogs(filter);
    if (logs.length === 0) return null;
    return logs[0].transactionHash;
  } catch (e) {
    console.error(`Failed to fetch logs for tradeId ${tradeId}:`, e);
    return null;
  }
}

async function main() {
  const tradesRef = collection(db, 'trades');
  const q = query(tradesRef, where('status', '==', 'accepted'));
  const snapshot = await getDocs(q);

  let updated = 0;
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.transactionHash || !data.blockchainTradeId) continue;

    const txHash = await fetchTxHashForTrade(data.blockchainTradeId);
    if (!txHash) {
      console.warn(`⚠️  No tx hash found for trade ${docSnap.id} (blockchainTradeId ${data.blockchainTradeId})`);
      continue;
    }

    await updateDoc(doc(db, 'trades', docSnap.id), { transactionHash: txHash });
    console.log(`✅ Updated trade ${docSnap.id} with hash ${txHash}`);
    updated++;
  }

  console.log(`Finished. Updated ${updated} trades.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 