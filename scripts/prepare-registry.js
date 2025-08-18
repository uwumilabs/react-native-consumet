const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, '..', 'src', 'extension-registry.json');
const distPath = path.join(__dirname, '..', 'dist'); // Assuming 'dist' directory exists or will be created by the build process
const distRegistryPath = path.join(distPath, 'extension-registry.json');

// Ensure the 'dist' directory exists
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}
const branch = 'main';

let registryContent = fs.readFileSync(registryPath, 'utf8');
registryContent = registryContent.replace(/__BRANCH__/g, branch);

fs.writeFileSync(distRegistryPath, registryContent);

console.log(`Successfully prepared extension-registry.json for branch: ${branch}`);
