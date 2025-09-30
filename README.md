NFT Trading Platform

A decentralized NFT trading platform built on Zama

## 🛠️ Setup Instructions

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd 0xDTrade
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory:

```env
# Firebase Configuration (these can be public)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

### 3. Get API Keys

#### Firebase Setup:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Get your config values from Project Settings

#### Magic Eden API:
1. Visit [Magic Eden Developer Portal](https://docs.magiceden.dev/)
2. Sign up for API access
3. Get your API key for Monad testnet

### 4. Run the application
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🔧 Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS
- **Blockchain**: Ethers.js, RainbowKit
- **Database**: Firebase Firestore
- **NFT Data**: Magic Eden API
- **Network**: Monad Testnet

## 🔒 Security Features

- Server-side API routes for sensitive operations
- Environment variable protection
- Smart contract approval system
- Rate limiting and error handling

## 📝 License

MIT License - see LICENSE file for details 
