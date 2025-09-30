const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 Deploying MonadNFTTradingV4 with Decline Functionality');
  console.log('=======================================================');
  
  // Check if we have a private key
  if (!process.env.PRIVATE_KEY) {
    console.log('❌ No PRIVATE_KEY found in environment variables.');
    console.log('💡 Make sure to set PRIVATE_KEY before running this script.');
    process.exit(1);
  }
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log('📝 Deploying with account:', deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log('💰 Account balance:', ethers.formatEther(balance), 'MONAD');
  console.log('');
  
  if (balance < ethers.parseEther('1.0')) {
    console.log('⚠️  Warning: Low balance. Make sure you have enough MONAD for deployment.');
  }
  
  try {
    // Deploy the V4 contract with decline functionality
    console.log('📦 Deploying MonadNFTTradingV4...');
    const MonadNFTTradingV4 = await ethers.getContractFactory('MonadNFTTradingV4');
    const contract = await MonadNFTTradingV4.deploy();
    
    console.log('⏳ Waiting for deployment transaction...');
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log('✅ Contract deployed successfully!');
    console.log('🏠 Contract address:', contractAddress);
    console.log('');
    
    // Verify the deployment
    console.log('🔍 Verifying deployment...');
    const version = await contract.getVersion();
    const feeCollector = await contract.FEE_COLLECTOR();
    const tradeFee = await contract.TRADE_FEE();
    
    console.log('✅ Deployment verified:');
    console.log('   Version:', version);
    console.log('   Fee Collector:', feeCollector);
    console.log('   Trade Fee:', ethers.formatEther(tradeFee), 'MONAD');
    console.log('');
    
    // Instructions for updating the frontend
    console.log('📋 Next Steps for Production:');
    console.log('============================');
    console.log('');
    console.log('1. Update lib/contracts.ts:');
    console.log(`   export const CONTRACT_CONFIG = {`);
    console.log(`     address: '${contractAddress}',`);
    console.log(`     abi: [...] // Use the same ABI`);
    console.log(`   };`);
    console.log('');
    console.log('2. Update all scripts to use the new contract address');
    console.log('3. Test the fixed accept functionality');
    console.log('4. Migrate existing trades if needed');
    console.log('');
    console.log('🎯 Key Features in V4:');
    console.log('   ✅ declineTrade() - Counterparty can decline and return assets immediately');
    console.log('   ✅ No more 24-hour waiting period for declined trades');
    console.log('   ✅ TradeStatus.Declined for proper state management');
    console.log('   ✅ TradeDeclined event for tracking');
    console.log('');
    console.log('✅ Ready for production deployment!');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    
    if (error.message?.includes('insufficient funds')) {
      console.log('💡 Solution: Add more MONAD to your deployer account');
    } else if (error.message?.includes('nonce')) {
      console.log('💡 Solution: Try again, there might be a network issue');
    } else {
      console.log('💡 Check the error message above for details');
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 