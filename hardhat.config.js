require("@nomicfoundation/hardhat-ethers");
require("@fhevm/hardhat-plugin");
require("dotenv").config({ path: '.env.local' });

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
      viaIR: true,
    },
  },
  networks: {
    // Monad Testnet (camelCase)
    monadTestnet: {
      url: "https://testnet-rpc.monad.xyz/",
      chainId: 10143,
      accounts: (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length > 10) ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      timeout: 60000,
    },
    // Monad Testnet (kebab-case alias)
    "monad-testnet": {
      url: "https://testnet-rpc.monad.xyz/",
      chainId: 10143,
      accounts: (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length > 10) ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      timeout: 60000,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia.blockpi.network/v1/rpc/public",
      chainId: 11155111,
      accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
      timeout: 120000,
    },
    // Local development
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: "remote", // Use Hardhat's default accounts
    },
    hardhat: {
      chainId: 31337,
    },
  },
};