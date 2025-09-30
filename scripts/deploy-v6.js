const hre = require("hardhat");
const readline = require('readline');

// Get private key from multiple sources
function getPrivateKey() {
  // Method 1: Environment variable DEPLOY_PK (fastest for deployment)
  if (process.env.DEPLOY_PK) {
    console.log('🔐 Using private key from DEPLOY_PK environment variable');
    return Promise.resolve(process.env.DEPLOY_PK);
  }
  
  // Method 2: Environment variable DEPLOY_PRIVATE_KEY
  if (process.env.DEPLOY_PRIVATE_KEY) {
    console.log('🔐 Using private key from DEPLOY_PRIVATE_KEY environment variable');
    return Promise.resolve(process.env.DEPLOY_PRIVATE_KEY);
  }
  
  // Method 3: Regular .env PRIVATE_KEY
  if (process.env.PRIVATE_KEY) {
    console.log('🔐 Using private key from PRIVATE_KEY environment variable');
    return Promise.resolve(process.env.PRIVATE_KEY);
  }
  
  // Method 4: Interactive input (fallback)
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('🔐 Please enter your private key (will not be displayed):');
    rl.question('Private Key: ', (privateKey) => {
      rl.close();
      resolve(privateKey.trim());
    });
    
    // Hide input
    rl.stdoutMuted = true;
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) {
        rl.output.write("*");
      } else {
        rl.output.write(stringToWrite);
      }
    };
  });
}

async function main() {
  console.log("🚀 Deploying MonadNFTTradingV6 Contract...\n");
  
  console.log("💡 Private Key Options:");
  console.log("   1. Environment: DEPLOY_PK=your_key (fastest)");
  console.log("   2. Environment: DEPLOY_PRIVATE_KEY=your_key");
  console.log("   3. .env file: PRIVATE_KEY=your_key");
  console.log("   4. Interactive input (fallback)\n");
  
  // Get network info
  const network = hre.network.name;
  const chainId = hre.network.config.chainId;
  console.log(`📡 Network: ${network} (Chain ID: ${chainId})`);
  
  if (network === 'hardhat' || network === 'localhost') {
    console.log("⚠️  Local development network detected");
  } else if (network === 'monadTestnet' || network === 'monad-testnet' || chainId === 10143) {
    console.log("🧪 Monad Testnet deployment");
  } else {
    console.log("🌐 Live network deployment");
  }
  
  // Get private key securely
  let privateKey = await getPrivateKey();
  
  // Clean and validate private key
  if (!privateKey) {
    console.error("❌ No private key provided.");
    process.exit(1);
  }
  
  // Remove 0x prefix if present
  if (privateKey.startsWith('0x')) {
    privateKey = privateKey.slice(2);
  }
  
  // Validate length (should be 64 hex characters = 32 bytes)
  if (privateKey.length !== 64) {
    console.error(`❌ Invalid private key format. Expected 64 characters, got ${privateKey.length}.`);
    console.error("💡 Private key should be 64 hex characters (with or without 0x prefix)");
    process.exit(1);
  }
  
  // Validate hex format
  if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
    console.error("❌ Invalid private key format. Must contain only hex characters (0-9, a-f, A-F).");
    process.exit(1);
  }
  
  // Create wallet with private key (add 0x prefix for ethers)
  const wallet = new hre.ethers.Wallet('0x' + privateKey, hre.ethers.provider);
  console.log(`\n💼 Deployer Address: ${wallet.address}`);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} MONAD`);
  
  if (balance < hre.ethers.parseEther("1.0")) {
    console.log("⚠️  Warning: Low balance. Ensure you have enough MONAD for deployment and gas fees.");
  }
  
  // Expected admin address
  const expectedAdmin = "0x20ce27B140A0EEECceF880e01D2082558400FDd6";
  
  if (wallet.address.toLowerCase() !== expectedAdmin.toLowerCase()) {
    console.log(`⚠️  Warning: Deployer address (${wallet.address}) differs from expected admin (${expectedAdmin})`);
    console.log("The contract will still set the expected admin as the initial admin.");
  }
  
  console.log("\n📋 V6 Contract Features:");
  console.log("• Dynamic fee management (0-1 MONAD cap)");
  console.log("• Multi-admin system (up to 3 admins)");
  console.log("• Admin force cancel for stuck trades");
  console.log("• All V5 functionality preserved");
  console.log(`• Initial admin: ${expectedAdmin}`);
  
  // Confirm deployment
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const confirm = await new Promise((resolve) => {
    rl.question('\n✅ Proceed with deployment? (y/N): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
  
  if (!confirm) {
    console.log("❌ Deployment cancelled.");
    process.exit(0);
  }
  
  try {
    // Deploy contract
    console.log("\n🔨 Deploying contract...");
    const MonadNFTTradingV6 = await hre.ethers.getContractFactory("MonadNFTTradingV6", wallet);
    
    // Set a safe gas limit for contract deployment (complex contracts need more gas)
    const safeGasLimit = 5000000; // 5M gas should be plenty for contract deployment
    console.log(`⛽ Using safe gas limit: ${safeGasLimit.toLocaleString()}`);
    
    // Deploy with high gas limit to ensure success
    const contract = await MonadNFTTradingV6.deploy({
      gasLimit: safeGasLimit
    });
    
    console.log("⏳ Waiting for deployment transaction...");
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log(`\n🎉 Contract deployed successfully!`);
    console.log(`📍 Contract Address: ${contractAddress}`);
    console.log(`🔗 Transaction Hash: ${contract.deploymentTransaction().hash}`);
    
    // Verify initial state
    console.log("\n🔍 Verifying initial contract state...");
    
    const tradeFee = await contract.getTradeFee();
    const adminCount = await contract.getAdminCount();
    const admins = await contract.getAdmins();
    const isAdminCheck = await contract.isAdmin(expectedAdmin);
    
    console.log(`💰 Initial Trade Fee: ${hre.ethers.formatEther(tradeFee)} MONAD`);
    console.log(`👥 Admin Count: ${adminCount}`);
    console.log(`🔑 Admins: ${admins.join(', ')}`);
    console.log(`✅ Expected Admin Status: ${isAdminCheck ? 'Confirmed' : 'Failed'}`);
    
    if (!isAdminCheck) {
      console.log("❌ Warning: Expected admin not properly set!");
    }
    
    // Contract interaction examples
    console.log("\n📖 Contract Interaction Examples:");
    console.log(`
// Connect to deployed contract
const contract = await ethers.getContractAt("MonadNFTTradingV6", "${contractAddress}");

// Admin functions (only for admins)
await contract.setTradeFee(ethers.parseEther("0.5")); // Set fee to 0.5 MONAD
await contract.addAdmin("0x..."); // Add new admin
await contract.removeAdmin("0x..."); // Remove admin
await contract.adminCancelTrade(tradeId); // Force cancel stuck trade

// View functions
const currentFee = await contract.getTradeFee();
const admins = await contract.getAdmins();
const adminCount = await contract.getAdminCount();
    `);
    
    console.log("\n🎯 Next Steps:");
    console.log("1. Update frontend to use V6 contract address");
    console.log("2. Update ABI in lib/abi.ts");
    console.log("3. Update contract address in lib/contracts.ts");
    console.log("4. Test admin functions in admin panel");
    console.log("5. Verify contract on block explorer (if on mainnet)");
    
    // Save deployment info
    const deploymentInfo = {
      network: network,
      contractAddress: contractAddress,
      deploymentHash: contract.deploymentTransaction().hash,
      deployer: wallet.address,
      timestamp: new Date().toISOString(),
      version: "V6",
      features: [
        "Dynamic fee management",
        "Multi-admin system", 
        "Admin force cancel",
        "All V5 functionality"
      ],
      initialState: {
        tradeFee: hre.ethers.formatEther(tradeFee),
        adminCount: adminCount.toString(),
        admins: admins
      }
    };
    
    console.log(`\n💾 Deployment info saved to deployment-v6-${network}.json`);
    require('fs').writeFileSync(
      `deployment-v6-${network}.json`, 
      JSON.stringify(deploymentInfo, null, 2)
    );
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("💡 Tip: Ensure you have enough MONAD for gas fees");
    } else if (error.message.includes("nonce")) {
      console.log("💡 Tip: Try again in a few moments (nonce issue)");
    }
    
    process.exit(1);
  }
}

// Handle errors gracefully
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  }); 