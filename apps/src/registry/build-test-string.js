// build-test-string.js - Run this in Node.js
const fs = require('fs');
const path = require('path');

// Read extractor test file (MegaPlay for AniKoto)
const testExtrPath = path.join(__dirname, '../../../dist/extractors/megaplay.js');
if (!fs.existsSync(testExtrPath)) {
  console.error(`Error: Extractor file not found at ${testExtrPath}`);
  console.error('Please run "yarn build" first to compile dist artifacts.');
  process.exit(1);
}
const extractorTestCode = fs.readFileSync(testExtrPath, 'utf8');

// Read extension test file (AniKoto)
const testExtPath = path.join(__dirname, '../../../dist/providers/anime/anikoto/create-anikoto.js');
if (!fs.existsSync(testExtPath)) {
  console.error(`Error: Extension file not found at ${testExtPath}`);
  console.error('Please run "yarn build" first to compile dist artifacts.');
  process.exit(1);
}
const extensionTestCode = fs.readFileSync(testExtPath, 'utf8');

// Create React Native compatible file for extractor
const rnExtrCode = `// Auto-generated from build-test-string.js
export const testCodeString = ${JSON.stringify(extractorTestCode)};
export const testExtrCodeString = testCodeString;

export default testCodeString;

// CommonJS compatibility  
module.exports = { testCodeString, testExtrCodeString };`;

// Create React Native compatible file for extension
const rnExtCode = `// Auto-generated from build-test-string.js
export const testCodeString = ${JSON.stringify(extensionTestCode)};
export const testExtCodeString = testCodeString;

export default testCodeString;

// CommonJS compatibility  
module.exports = { testCodeString, testExtCodeString };`;

// Write to RN-compatible files
const outputExtrPath = path.join(__dirname, 'test-extr-code-generated.js');
fs.writeFileSync(outputExtrPath, rnExtrCode, 'utf8');

const outputExtPath = path.join(__dirname, 'test-ext-code-generated.js');
fs.writeFileSync(outputExtPath, rnExtCode, 'utf8');

// Also write test-code-generated.js for backwards compatibility
const outputLegacyPath = path.join(__dirname, 'test-code-generated.js');
fs.writeFileSync(outputLegacyPath, rnExtCode, 'utf8');

console.log('✅ Generated test code strings for AniKoto & MegaPlay');
console.log('\nExtractor (MegaPlay):');
console.log(`  Original: ${testExtrPath}`);
console.log(`  Generated: ${outputExtrPath}`);
console.log(`  Size: ${extractorTestCode.length} characters`);

console.log('\nExtension (AniKoto):');
console.log(`  Original: ${testExtPath}`);
console.log(`  Generated: ${outputExtPath}`);
console.log(`  Size: ${extensionTestCode.length} characters`);
