const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const registryPath = path.join(repoRoot, 'src', 'extension-registry.json');
const distPath = path.join(repoRoot, 'dist');
const distRegistryPath = path.join(distPath, 'extension-registry.json');

if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

const branch = 'main';

function sha256OfFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

// Extract local dist path from a raw GitHub URL
// e.g. https://raw.githubusercontent.com/.../main/dist/foo.js → dist/foo.js
function urlToLocalPath(url) {
  const marker = `/refs/heads/${branch}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length); // e.g. "dist/providers/..."
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Hash extensions
registry.extensions = registry.extensions.map((ext) => {
  const relPath = urlToLocalPath(ext.main);
  if (relPath) {
    const absPath = path.join(repoRoot, relPath);
    if (fs.existsSync(absPath)) {
      ext.sha256 = sha256OfFile(absPath);
      console.log(`  ✔ ${ext.id}: ${ext.sha256.slice(0, 12)}…`);
    } else {
      console.warn(`  ⚠ ${ext.id}: dist file not found at ${relPath}`);
    }
  }
  return ext;
});

// Hash extractors
registry.extractors = registry.extractors.map((ext) => {
  const relPath = urlToLocalPath(ext.main);
  if (relPath) {
    const absPath = path.join(repoRoot, relPath);
    if (fs.existsSync(absPath)) {
      ext.sha256 = sha256OfFile(absPath);
      console.log(`  ✔ ${ext.name}: ${ext.sha256.slice(0, 12)}…`);
    } else {
      console.warn(`  ⚠ ${ext.name}: dist file not found at ${relPath}`);
    }
  }
  return ext;
});

let registryContent = JSON.stringify(registry, null, 2);
registryContent = registryContent.replace(/__BRANCH__/g, branch);

fs.writeFileSync(registryPath, registryContent);
fs.writeFileSync(distRegistryPath, registryContent);

console.log(`\nSuccessfully prepared extension-registry.json for branch: ${branch}`);
