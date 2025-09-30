const { ethers } = require("hardhat");

// Simulate the frontend flow exactly
async function debugFrontendFlow() {
  console.log("🔍 Debugging Frontend Flow - Empty Transaction Data");
  console.log("===================================================");
  
  // Get the user's private key
  const userPrivateKey = process.env.USER_PRIVATE_KEY;
  if (!userPrivateKey) {
    console.log("❌ No USER_PRIVATE_KEY found.");
    console.log("💡 Set USER_PRIVATE_KEY to test the exact frontend flow");
    console.log("Example: $env:USER_PRIVATE_KEY=\"0x...\"; node scripts/debug-frontend-flow.js");
    return;
  }
  
  // Create provider and wallet (simulating wagmi walletClient)
  const provider = new ethers.JsonRpcProvider("https://10143.rpc.hypersync.xyz/5f7ec725-dcfb-426c-bbe1-a363cd56630d");
  const wallet = new ethers.Wallet(userPrivateKey, provider);
  const userAddress = await wallet.getAddress();
  
  console.log("👤 User Address:", userAddress);
  
  // Simulate walletClientToSigner function from frontend
  async function walletClientToSigner(walletClient) {
    console.log("🔄 Converting walletClient to signer...");
    // In the frontend, this uses BrowserProvider, but we'll simulate it
    return walletClient; // In our case, wallet is already a signer
  }
  
  // Simulate getContract function from frontend
  function getContract(signer) {
    console.log("🏗️ Creating contract instance...");
    
    const CONTRACT_ADDRESS = "0xd70aA9c1f3acFa306b1A0E9ff350D90434859678";
    
    // Import the ABI (we'll use a minimal ABI for testing)
    const ACCEPT_TRADE_ABI = [
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "tradeId",
            "type": "uint256"
          }
        ],
        "name": "acceptTrade",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "tradeId",
            "type": "uint256"
          }
        ],
        "name": "getTrade",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ];
    
    if (signer) {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ACCEPT_TRADE_ABI, signer);
      
      console.log('📋 Contract details:', {
        address: CONTRACT_ADDRESS,
        hasSigner: !!signer,
        hasAcceptTrade: typeof contract.acceptTrade === 'function',
        signerAddress: signer.address
      });
      
      return contract;
    }
    return null;
  }
  
  // Simulate the exact acceptTrade function from frontend
  async function acceptTrade(tradeId, walletClient) {
    console.log("\n🚀 Starting acceptTrade function...");
    console.log("Trade ID:", tradeId, typeof tradeId);
    
    const signer = await walletClientToSigner(walletClient);
    const contract = getContract(signer);
    if (!contract) throw new Error('Contract not available');

    try {
      console.log('🔍 Getting trade details for ID:', tradeId);
      
      // Get trade details to determine required MONAD amount and check status
      const tradeDetails = await contract.getTrade(tradeId);
      const [, , , , requestedMONAD, expiryTime, status] = tradeDetails;

      console.log('Trade details:', {
        tradeId,
        requiredAmount: ethers.formatEther(requestedMONAD),
        status,
        expiryTime: Number(expiryTime),
        currentTime: Math.floor(Date.now() / 1000)
      });

      // Ensure tradeId is properly formatted as BigNumber for the contract
      let tradeIdBigInt;
      try {
        tradeIdBigInt = BigInt(tradeId);
        console.log('✅ Trade ID converted to BigInt:', tradeIdBigInt.toString());
      } catch (error) {
        throw new Error(`Failed to convert trade ID to BigInt: ${tradeId} - ${error.message}`);
      }

      // Test transaction encoding first
      console.log("\n📝 Testing transaction encoding...");
      try {
        const txData = await contract.acceptTrade.populateTransaction(tradeIdBigInt, { 
          value: requestedMONAD 
        });
        
        console.log("Transaction data:", {
          to: txData.to,
          data: txData.data,
          value: txData.value?.toString(),
          dataLength: txData.data?.length,
          isEmpty: !txData.data || txData.data === "0x"
        });
        
        if (!txData.data || txData.data === "0x") {
          console.error("❌ CRITICAL: Transaction data is empty!");
          console.log("This explains why the frontend transaction fails.");
          return;
        } else {
          console.log("✅ Transaction data encoded successfully");
        }
      } catch (encodeError) {
        console.error("❌ Transaction encoding failed:", encodeError.message);
        return;
      }

      // First try to estimate gas
      let gasLimit;
      try {
        const gasEstimate = await contract.acceptTrade.estimateGas(tradeIdBigInt, { value: requestedMONAD });
        gasLimit = gasEstimate + (gasEstimate / 10n); // Add 10% buffer
        console.log('Gas estimate:', gasEstimate.toString(), 'with buffer:', gasLimit.toString());
      } catch (gasError) {
        console.error('❌ Gas estimation failed:', gasError.message);
        console.log('This is likely the root cause of the frontend issue');
        return;
      }

      console.log('📝 Sending acceptTrade transaction...');
      console.log('Parameters:', {
        tradeId: tradeIdBigInt.toString(),
        tradeIdType: typeof tradeIdBigInt,
        value: ethers.formatEther(requestedMONAD),
        gasLimit: gasLimit.toString()
      });
      
      // This is the exact call that the frontend makes
      const tx = await contract.acceptTrade(tradeIdBigInt, { 
        value: requestedMONAD,
        gasLimit: gasLimit
      });
      
      console.log('✅ Accept transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('🎉 Trade accepted successfully! Block:', receipt.blockNumber);
      
    } catch (error) {
      console.error('❌ Error accepting trade:', error);
      throw error;
    }
  }
  
  // Test with Trade ID 8
  const tradeId = "8";
  
  try {
    await acceptTrade(tradeId, wallet);
  } catch (error) {
    console.error("❌ Frontend flow failed:", error.message);
  }
}

debugFrontendFlow().catch(console.error); 