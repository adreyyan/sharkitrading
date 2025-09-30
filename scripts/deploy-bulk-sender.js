const { ethers } = require("hardhat");

async function main() {
  // Get private key from environment variable
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error("❌ Please provide your private key as environment variable:");
    console.error("   DEPLOYER_PRIVATE_KEY=your_private_key npx hardhat run scripts/deploy-bulk-sender.js --network monadTestnet");
    process.exit(1);
  }

  // Validate private key format
  const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  if (cleanPrivateKey.length !== 64) {
    console.error("❌ Invalid private key format. Should be 64 characters (without 0x prefix)");
    process.exit(1);
  }

  // Create wallet with private key
  const wallet = new ethers.Wallet('0x' + cleanPrivateKey, ethers.provider);
  
  console.log("🚀 Deploying BulkNFTSender contract...");
  console.log("📋 Deployer address:", wallet.address);

  // Get the contract factory with the specific wallet
  const BulkNFTSender = await ethers.getContractFactory("BulkNFTSender", wallet);

  // Deploy the contract
  const bulkSender = await BulkNFTSender.deploy();

  // Wait for deployment to complete
  await bulkSender.waitForDeployment();

  const contractAddress = await bulkSender.getAddress();
  console.log("✅ BulkNFTSender deployed to:", contractAddress);
  console.log("📋 Transaction hash:", bulkSender.deploymentTransaction().hash);

  // Wait for a few confirmations
  console.log("⏳ Waiting for confirmations...");
  await bulkSender.deploymentTransaction().wait(3);

  console.log("🎉 Contract deployed and confirmed!");
  console.log("");
  console.log("📝 Contract Details:");
  console.log("   Address:", contractAddress);
  console.log("   Network:", network.name);
  console.log("   Deployer:", wallet.address);
  
  // Save the contract address for frontend use
  const contractInfo = {
    address: contractAddress,
    network: network.name,
    deployedAt: new Date().toISOString(),
    deployer: wallet.address
  };

  const fs = require('fs');
  const path = require('path');
  
  // Create contracts info file for frontend
  const contractsDir = path.join(__dirname, '..', 'lib');
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Read existing contracts file or create new one
  const contractsFilePath = path.join(contractsDir, 'bulkSender.ts');
  const contractContent = `// Auto-generated contract information
// Last updated: ${new Date().toISOString()}

export const BULK_NFT_SENDER_ADDRESS = "${contractAddress}";

export const BULK_NFT_SENDER_NETWORK = "${network.name}";

export const BULK_NFT_SENDER_ABI = [
  "function bulkTransferERC721ToOne(address[] calldata nftContracts, uint256[] calldata tokenIds, address recipient) external",
  "function bulkTransferERC721ToMany(address[] calldata nftContracts, uint256[] calldata tokenIds, address[] calldata recipients) external",
  "function bulkTransferERC1155ToOne(address[] calldata nftContracts, uint256[] calldata tokenIds, uint256[] calldata amounts, address recipient) external",
  "function bulkTransferERC1155ToMany(address[] calldata nftContracts, uint256[] calldata tokenIds, uint256[] calldata amounts, address[] calldata recipients) external",
  "function isERC721Approved(address nftContract, uint256 tokenId, address owner) external view returns (bool)",
  "function isERC1155Approved(address nftContract, address owner) external view returns (bool)",
  "event BulkTransferERC721(address indexed sender, uint256 totalTransfers, bool singleRecipient)",
  "event BulkTransferERC1155(address indexed sender, uint256 totalTransfers, bool singleRecipient)"
] as const;

export const BULK_NFT_SENDER_DEPLOYMENT_INFO = ${JSON.stringify(contractInfo, null, 2)};
`;

  fs.writeFileSync(contractsFilePath, contractContent);
  console.log("📄 Contract info saved to:", contractsFilePath);

  return contractAddress;
}

main()
  .then((address) => {
    console.log(`\n🎯 Deployment completed successfully!`);
    console.log(`📋 Contract address: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });