const hre = require("hardhat");

async function main() {
  console.log("\n🎨 DEPLOYING TEST NFT FOR DEMO\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`============================================================`);
  console.log(`Deploying from: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);

  // Deploy TestNFT
  console.log(`\n📦 Deploying TestNFTForDemo...`);
  const TestNFT = await hre.ethers.getContractFactory("TestNFTForDemo");
  const nft = await TestNFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log(`✅ TestNFTForDemo deployed to: ${nftAddress}`);

  // Mint 5 NFTs for demo
  console.log(`\n🎨 Minting 5 demo NFTs...`);
  const tx = await nft.batchMint(deployer.address, 5);
  await tx.wait();
  console.log(`✅ Minted NFTs #1-5 to ${deployer.address}`);

  // Check total supply
  const totalSupply = await nft.totalSupply();
  console.log(`\n📊 Total Supply: ${totalSupply}`);

  console.log(`\n============================================================`);
  console.log(`🎉 DEPLOYMENT COMPLETE!`);
  console.log(`\n📝 CONTRACT INFO:`);
  console.log(`  Address: ${nftAddress}`);
  console.log(`  Name: Demo NFT`);
  console.log(`  Symbol: DEMO`);
  console.log(`  Owner: ${deployer.address}`);
  console.log(`  Minted: 5 NFTs (IDs 1-5)`);
  
  console.log(`\n🎬 FOR YOUR DEMO:`);
  console.log(`1. You now have 5 test NFTs in your wallet`);
  console.log(`2. Go to /vault and deposit them`);
  console.log(`3. Get receipts #1-5`);
  console.log(`4. Trade the receipts to show privacy!`);
  
  console.log(`\n📝 Add to your demo script:`);
  console.log(`"I minted 5 test NFTs. Now watch as I deposit them into the vault..."`);
  console.log(`============================================================`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
