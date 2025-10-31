const fs = require('fs');
const path = require('path');

// Read the compiled contract artifact
const artifactPath = path.join(__dirname, '../artifacts/contracts/PrivateNFTVault.sol/PrivateNFTVault.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

// Extract ABI
const abi = artifact.abi;

// Create the TypeScript file content
const content = `// Auto-generated ABI for PrivateNFTVault
// Generated: ${new Date().toISOString()}

export const PRIVATE_NFT_VAULT_ABI = ${JSON.stringify(abi, null, 2)} as const;
`;

// Write to lib/abi-vault.ts
const outputPath = path.join(__dirname, '../lib/abi-vault.ts');
fs.writeFileSync(outputPath, content);

console.log('✅ Vault ABI exported to lib/abi-vault.ts');
console.log('📝 Functions available:');
const functions = abi.filter(item => item.type === 'function').map(item => item.name);
functions.forEach(fn => console.log(`  - ${fn}`));


