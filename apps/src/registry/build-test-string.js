// build-test-string.js - Run this in Node.js
const fs = require('fs');
const path = require('path');

// Read extractor test file
const testExtrPath = path.join(__dirname, '../../../dist/extractors/megaup.js');
const extractorTestCode = fs.readFileSync(testExtrPath, 'utf8');

// Read extension test file
const testExtPath = path.join(__dirname, '../../../dist/providers/anime/animekai/create-animekai.js');
const extensionTestCode = fs.readFileSync(testExtPath, 'utf8');

// Create React Native compatible file for extractor
const rnExtrCode = `// Auto-generated from test.js
export const testCodeString = ${JSON.stringify(extractorTestCode)};

export default testCodeString;

// CommonJS compatibility  
module.exports = { testCodeString };`;

// Create React Native compatible file for extension
const rnExtCode = `// Auto-generated from test.js
export const testCodeString = ${JSON.stringify(extensionTestCode)};

export default testCodeString;

// CommonJS compatibility  
module.exports = { testCodeString };`;

// Write to RN-compatible files
const outputExtrPath = path.join(__dirname, 'test-extr-code-generated.js');
fs.writeFileSync(outputExtrPath, rnExtrCode, 'utf8');

const outputExtPath = path.join(__dirname, 'test-ext-code-generated.js');
fs.writeFileSync(outputExtPath, rnExtCode, 'utf8');

console.log('Generated test code strings');
console.log('\nExtractor:');
console.log(`  Original: ${testExtrPath}`);
console.log(`  Generated: ${outputExtrPath}`);
console.log(`  Size: ${extractorTestCode.length} characters`);

console.log('\nExtension:');
console.log(`  Original: ${testExtPath}`);
console.log(`  Generated: ${outputExtPath}`);
console.log(`  Size: ${extensionTestCode.length} characters`);
