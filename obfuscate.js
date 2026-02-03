// Advanced obfuscation script for production
// Install: npm install -g javascript-obfuscator
// Run: npm run obfuscate:full

const fs = require('fs');
const path = require('path');

// Check if javascript-obfuscator is available
let obfuscator;
try {
  obfuscator = require('javascript-obfuscator');
} catch (e) {
  console.log('javascript-obfuscator not found. Installing...');
  console.log('Run: npm install -g javascript-obfuscator');
  console.log('Or: npm install --save-dev javascript-obfuscator');
  process.exit(1);
}

// Advanced obfuscation options for maximum protection
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: 2000,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

// Files to obfuscate
const files = [
  { input: 'js/app.js', output: 'js/app.obf.js' },
  { input: 'js/token-loader.js', output: 'js/token-loader.obf.js' }
];

files.forEach(({ input, output }) => {
  const inputPath = path.join(__dirname, input);
  const outputPath = path.join(__dirname, output);
  
  if (fs.existsSync(inputPath)) {
    const code = fs.readFileSync(inputPath, 'utf8');
    const obfuscated = obfuscator.obfuscate(code, obfuscationOptions);
    fs.writeFileSync(outputPath, obfuscated.getObfuscatedCode());
    console.log(`✓ Obfuscated: ${input} -> ${output}`);
    console.log(`  Size: ${(code.length / 1024).toFixed(2)} KB -> ${(obfuscated.getObfuscatedCode().length / 1024).toFixed(2)} KB`);
  } else {
    console.log(`✗ File not found: ${input}`);
  }
});

console.log('\n✓ Obfuscation complete!');
console.log('Update index.html to use .obf.js files instead of .js files');
