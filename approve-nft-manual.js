// Manual NFT Approval Script
const { ethers } = require('ethers');

const NFT_ADDRESS = "0x1b1b25213bf07c3c60ffbdc076f70defa96aabe9";
const TRADING_CONTRACT = "0x695a59b769FcFD3Af710891fc24282772DCd6302";
const TOKEN_ID = "30"; // Or use "26" based on your NFT

// ERC721 ABI for approval
const ERC721_ABI = [
  "function approve(address to, uint256 tokenId) external",
  "function setApprovalForAll(address operator, bool approved) external",
  "function getApproved(uint256 tokenId) external view returns (address)",
  "function isApprovedForAll(address owner, address operator) external view returns (bool)"
];

async function approveNFT() {
  // Connect to MetaMask
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  
  console.log("Connected:", address);
  
  const nftContract = new ethers.Contract(NFT_ADDRESS, ERC721_ABI, signer);
  
  // Check current approval
  const currentApproval = await nftContract.getApproved(TOKEN_ID);
  console.log("Current approval:", currentApproval);
  
  if (currentApproval.toLowerCase() === TRADING_CONTRACT.toLowerCase()) {
    console.log("✅ Already approved!");
    return;
  }
  
  // Approve
  console.log("Approving NFT for trading contract...");
  const tx = await nftContract.approve(TRADING_CONTRACT, TOKEN_ID);
  console.log("Transaction sent:", tx.hash);
  
  await tx.wait();
  console.log("✅ NFT Approved!");
}

// Run in browser console
console.log("Copy this to browser console:");
console.log("Run: approveNFT()");

