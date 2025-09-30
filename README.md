# Sharki - Privacy-Enabled NFT Trading Platform

A fully decentralized P2P NFT trading platform powered by **Zama's fhEVM** (Fully Homomorphic Encryption Virtual Machine), bringing privacy-preserving digital asset exchanges to Ethereum.

Built with **encrypted on-chain transactions** - trade NFTs and ETH with complete privacy protection.

---

## 🔐 **What Makes Sharki Special?**

- **🛡️ Private Transactions**: ETH amounts are encrypted on-chain using fhEVM
- **🤝 P2P Trading**: Direct trades with specific wallets (like Steam trading)
- **🔒 Smart Contract Escrow**: Trustless atomic swaps
- **💎 Multi-Asset Support**: ERC721, ERC1155, and ETH in one trade
- **🔗 Shareable Links**: Generate unique URLs for each trade proposal
- **⚡ Complete Privacy**: Values remain encrypted permanently on blockchain

---

## 🛠️ **Setup Instructions**

### 1. Clone the Repository
```bash
git clone https://github.com/adreyyan/zamanfttrading.git
cd zamanfttrading
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory:

```env
# Firebase Configuration (for trade link sharing)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Alchemy API (for NFT fetching on Sepolia testnet)
NEXT_PUBLIC_ALCHEMY_API_KEY=your-alchemy-api-key

# Optional: Magic Eden API (for Monad mainnet - currently unused)
NEXT_PUBLIC_ME_API_KEY=your-magic-eden-api-key
```

### 3. Get API Keys

#### **Firebase Setup** (Required):
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Firestore Database**
4. Get your config from Project Settings → General → Your apps → Web app
5. Copy the config values to `.env.local`

#### **Alchemy API** (Required):
1. Visit [Alchemy Dashboard](https://dashboard.alchemy.com/)
2. Sign up for a free account
3. Create a new app on **Sepolia Testnet**
4. Copy your API key to `.env.local`

### 4. Run the Application
```bash
npm run dev
```

Visit **https://zamanfttrading.vercel.app/swap** to see the application.

---

## 🚀 **Deployment**

The app is production-ready and deployed on Vercel:

```bash
# Deploy to Vercel
vercel --prod
```

**Live Demo**: https://zamanfttrading-5gjizygp9-oxdomains-projects.vercel.app

---

## 📦 **Smart Contract**

### **NFTTradingFHEV7** (Deployed on Sepolia)
- **Contract Address**: `0xf898Ecf6aE3e69cAA21026d95b4964c6641fe7bD`
- **Network**: Sepolia Testnet (Chain ID: 11155111)
- **Explorer**: [View on Etherscan](https://sepolia.etherscan.io/address/0xf898Ecf6aE3e69cAA21026d95b4964c6641fe7bD)
- **Trade Fee**: 0.01 ETH

### **Features**:
- ✅ Encrypted ETH amounts using `euint64` (fhEVM)
- ✅ ERC721 and ERC1155 support
- ✅ Multi-admin system
- ✅ Auto-expiration after 7 days
- ✅ Accept/Decline/Cancel lifecycle
- ✅ Emergency pause functionality

---

## 🔧 **Tech Stack**

### **Frontend**
- **Framework**: Next.js 15 + React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Wallet Integration**: RainbowKit + wagmi + ethers.js
- **UI Components**: Custom components with dark/light theme

### **Blockchain & Privacy**
- **Privacy Layer**: [Zama fhEVM](https://docs.zama.ai/fhevm) (Fully Homomorphic Encryption)
- **Smart Contracts**: Solidity with `euint64` encrypted types
- **Network**: Ethereum Sepolia Testnet
- **Wallet Support**: MetaMask, Rainbow, Coinbase, WalletConnect

### **Backend Services**
- **Database**: Firebase Firestore (trade metadata & links)
- **NFT API**: Alchemy NFT API (Sepolia testnet)
- **Blockchain RPC**: Ethereum Sepolia public nodes

### **Security**
- OpenZeppelin Contracts (v5.0.0)
- ReentrancyGuard, Pausable, ERC1155Holder
- Zama fhEVM Library for encryption

---

## 🎯 **How It Works**

1. **Create Trade**
   - Select NFTs from your wallet
   - Optionally add ETH (encrypted via fhEVM)
   - Specify counterparty address
   - Add optional message

2. **Smart Contract Escrow**
   - NFTs are locked in contract
   - ETH amounts encrypted on-chain
   - Trade ID generated and stored

3. **Share Trade Link**
   - Firebase generates unique URL
   - Send link to trading partner
   - They can review and accept/decline

4. **Execute Trade**
   - Counterparty accepts → instant atomic swap
   - All assets transferred simultaneously
   - Trade recorded on blockchain

---

## 🔒 **Security Features**

### **Privacy Protection**
- ✅ **fhEVM Encryption**: ETH amounts stored as encrypted `euint64` on-chain
- ✅ **MEV Resistant**: Bots can't see trade values to frontrun
- ✅ **Private Valuations**: Only trade participants see actual amounts

### **Smart Contract Security**
- ✅ **Non-Custodial**: Platform never controls private keys
- ✅ **Reentrancy Guards**: Protection against reentrancy attacks
- ✅ **Ownership Verification**: Only NFT owners can trade
- ✅ **Approval System**: Automatic NFT approval checks
- ✅ **Emergency Pause**: Admin can pause in case of issues

### **Application Security**
- ✅ Server-side API routes for sensitive operations
- ✅ Environment variable protection
- ✅ Rate limiting and error handling
- ✅ Input validation and sanitization

---

## 📚 **Key Concepts**

### **What is fhEVM?**
Fully Homomorphic Encryption for Ethereum Virtual Machine allows smart contracts to perform computations on **encrypted data** without decrypting it. This means:

- Trade values remain encrypted on-chain forever
- Contract validates trades without seeing amounts
- True privacy-preserving DeFi

### **Traditional vs Sharki**

| Feature | Traditional DEX | Sharki (fhEVM) |
|---------|----------------|----------------|
| **Price Visibility** | Public on-chain | Encrypted on-chain |
| **MEV Protection** | ❌ Vulnerable | ✅ Protected |
| **P2P Direct** | ❌ Order books | ✅ Direct trading |
| **Bundle Trades** | ❌ Single items | ✅ Multi-asset |
| **Privacy** | ❌ All public | ✅ Fully encrypted |

---

## 🎨 **Use Cases**

- **High-Value OTC Deals**: Trade expensive NFTs without revealing valuations
- **Private Collectors**: Negotiate without exposing collection worth
- **NFT Gaming**: Swap in-game items with encrypted pricing
- **DAO Treasury**: Trade assets with confidential valuations
- **Competitive Trading**: Execute trades without alerting competitors

---

## 🚀 **Roadmap**

- [x] fhEVM integration for encrypted amounts
- [x] Multi-asset bundle trading
- [x] Shareable trade links
- [x] MetaMask support
- [ ] Custom domain deployment
- [ ] Mobile app (React Native)
- [ ] Multi-chain support (fhEVM on other chains)
- [ ] Trade history analytics
- [ ] Reputation system

---

## 📖 **Documentation**

- [Zama fhEVM Docs](https://docs.zama.ai/fhevm)
- [Smart Contract Source](./contracts/NFTTradingFHEV7.sol)
- [API Documentation](./docs/API.md) *(coming soon)*
- [Architecture Overview](./docs/ARCHITECTURE.md) *(coming soon)*

---

## 🤝 **Contributing**

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 **License**

MIT License - see [LICENSE](./LICENSE) file for details

---

## 🔗 **Links**

- **Live App**: https://zamanfttrading-5gjizygp9-oxdomains-projects.vercel.app
- **GitHub**: https://github.com/adreyyan/zamanfttrading
- **Smart Contract**: https://sepolia.etherscan.io/address/0xf898Ecf6aE3e69cAA21026d95b4964c6641fe7bD
- **Zama**: https://www.zama.ai/
- **fhEVM Docs**: https://docs.zama.ai/fhevm

---

## 🙏 **Acknowledgments**

- **Zama** for fhEVM technology
- **OpenZeppelin** for secure contract libraries
- **RainbowKit** for wallet connection
- **Alchemy** for NFT API
- **Vercel** for hosting

---

**Built with ❤️ using Zama's fhEVM for true on-chain privacy**

*Trade freely. Trade privately. Trade with Sharki.* 🦈🔐
