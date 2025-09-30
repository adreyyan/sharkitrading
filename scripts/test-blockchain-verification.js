const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing Blockchain NFT Verification System");
    console.log("=============================================");
    
    try {
        // Test wallet address (you can change this)
        const testWalletAddress = "0x1234567890123456789012345678901234567890";
        
        // Test some known verified NFT contracts
        const testContracts = [
            {
                address: "0x66e40f67afd710386379a6bb24d00308f81c183f",
                name: "Molandaks",
                tokenId: "1"
            },
            {
                address: "0x7370a0a9e9a833bcd071b38fc25184e7afb57aff",
                name: "Chog Pass",
                tokenId: "0"
            },
            {
                address: "0x46c66c40711a2953d1768926e53134c7ab272cd5",
                name: "Blench Pass",
                tokenId: "0"
            }
        ];

        console.log(`\n📋 Testing ${testContracts.length} contracts...`);
        
        for (const contract of testContracts) {
            console.log(`\n🔍 Testing: ${contract.name} (${contract.address})`);
            
            try {
                // Check if contract exists
                const provider = ethers.provider;
                const code = await provider.getCode(contract.address);
                
                if (code === "0x") {
                    console.log("❌ Contract does not exist");
                    continue;
                }
                
                console.log("✅ Contract exists");
                
                // Try to create contract instance with ERC721 functions
                const erc721Contract = new ethers.Contract(
                    contract.address,
                    [
                        'function supportsInterface(bytes4 interfaceId) view returns (bool)',
                        'function ownerOf(uint256 tokenId) view returns (address)',
                        'function balanceOf(address account, uint256 id) view returns (uint256)',
                        'function name() view returns (string)',
                        'function symbol() view returns (string)'
                    ],
                    provider
                );
                
                // Check ERC165 support
                try {
                    const supportsERC165 = await erc721Contract.supportsInterface('0x01ffc9a7');
                    console.log(`📋 Supports ERC165: ${supportsERC165}`);
                    
                    if (supportsERC165) {
                        // Check ERC721 interface
                        const isERC721 = await erc721Contract.supportsInterface('0x80ac58cd');
                        console.log(`📋 Is ERC721: ${isERC721}`);
                        
                        // Check ERC1155 interface
                        const isERC1155 = await erc721Contract.supportsInterface('0xd9b67a26');
                        console.log(`📋 Is ERC1155: ${isERC1155}`);
                    }
                } catch (error) {
                    console.log(`⚠️ ERC165 check failed: ${error.message}`);
                }
                
                // Try to get name
                try {
                    const name = await erc721Contract.name();
                    console.log(`📋 Collection Name: ${name}`);
                } catch (error) {
                    console.log(`⚠️ Name not available: ${error.message}`);
                }
                
                // Try to get symbol
                try {
                    const symbol = await erc721Contract.symbol();
                    console.log(`📋 Collection Symbol: ${symbol}`);
                } catch (error) {
                    console.log(`⚠️ Symbol not available: ${error.message}`);
                }
                
                // Try ERC721 ownerOf
                try {
                    const owner = await erc721Contract.ownerOf(contract.tokenId);
                    console.log(`📋 ERC721 Owner of token ${contract.tokenId}: ${owner}`);
                    
                    if (owner.toLowerCase() === testWalletAddress.toLowerCase()) {
                        console.log("✅ User owns this ERC721 token");
                    } else {
                        console.log("❌ User does not own this ERC721 token");
                    }
                } catch (error) {
                    console.log(`⚠️ ERC721 ownerOf failed: ${error.message}`);
                }
                
                // Try ERC1155 balanceOf
                try {
                    const balance = await erc721Contract.balanceOf(testWalletAddress, contract.tokenId);
                    console.log(`📋 ERC1155 Balance of token ${contract.tokenId}: ${balance.toString()}`);
                    
                    if (balance.gt(0)) {
                        console.log("✅ User owns this ERC1155 token");
                    } else {
                        console.log("❌ User does not own this ERC1155 token");
                    }
                } catch (error) {
                    console.log(`⚠️ ERC1155 balanceOf failed: ${error.message}`);
                }
                
            } catch (error) {
                console.error(`❌ Error testing contract ${contract.address}:`, error.message);
            }
        }
        
        console.log("\n✅ Blockchain verification test completed!");
        
    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 