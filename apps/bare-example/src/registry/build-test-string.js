// build-test-string.js - Run this in Node.js
const fs = require('fs');
const path = require('path');
const extractor=require('../../../../dist/extractors/megacloud.js')
// Read your actual test.js file
const testPath = path.join(__dirname,'../../../../dist/providers/anime/zoro/create-zoro.js');
const actualTestCode = fs.readFileSync(testPath, 'utf8');

// Create React Native compatible file
const rnCode = `// Auto-generated from test.js
export const testCodeString = ${JSON.stringify(actualTestCode)};

export default testCodeString;

// CommonJS compatibility  
module.exports = { testCodeString };`;

// Write to RN-compatible file
const outputPath = path.join(__dirname, 'test-code-generated.js');
fs.writeFileSync(outputPath, rnCode, 'utf8');

console.log('Generated test code string');
console.log(`Original: ${testPath}`);
console.log(`Generated: ${outputPath}`);
console.log(`Size: ${actualTestCode.length} characters`);