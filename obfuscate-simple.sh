#!/bin/bash
# Simple obfuscation script

echo "Starting obfuscation..."

# Obfuscate app.js
javascript-obfuscator js/app.js \
  --output js/app.obf.js \
  --compact true \
  --control-flow-flattening true \
  --control-flow-flattening-threshold 0.75 \
  --dead-code-injection true \
  --dead-code-injection-threshold 0.4 \
  --debug-protection true \
  --debug-protection-interval 2000 \
  --disable-console-output true \
  --identifier-names-generator hexadecimal \
  --numbers-to-expressions true \
  --self-defending true \
  --simplify true \
  --split-strings true \
  --split-strings-chunk-length 10 \
  --string-array true \
  --string-array-encoding base64 \
  --string-array-index-shift true \
  --string-array-rotate true \
  --string-array-shuffle true \
  --string-array-wrappers-count 2 \
  --string-array-wrappers-chained-calls true \
  --string-array-wrappers-parameters-max-count 4 \
  --string-array-wrappers-type function \
  --string-array-threshold 0.75 \
  --transform-object-keys true

if [ $? -eq 0 ]; then
  echo "✓ app.js obfuscated successfully"
else
  echo "✗ Failed to obfuscate app.js"
  exit 1
fi

# Obfuscate token-loader.js
javascript-obfuscator js/token-loader.js \
  --output js/token-loader.obf.js \
  --compact true \
  --control-flow-flattening true \
  --control-flow-flattening-threshold 0.75 \
  --dead-code-injection true \
  --dead-code-injection-threshold 0.4 \
  --debug-protection true \
  --debug-protection-interval 2000 \
  --disable-console-output true \
  --identifier-names-generator hexadecimal \
  --numbers-to-expressions true \
  --self-defending true \
  --simplify true \
  --split-strings true \
  --split-strings-chunk-length 10 \
  --string-array true \
  --string-array-encoding base64 \
  --string-array-index-shift true \
  --string-array-rotate true \
  --string-array-shuffle true \
  --string-array-wrappers-count 2 \
  --string-array-wrappers-chained-calls true \
  --string-array-wrappers-parameters-max-count 4 \
  --string-array-wrappers-type function \
  --string-array-threshold 0.75 \
  --transform-object-keys true

if [ $? -eq 0 ]; then
  echo "✓ token-loader.js obfuscated successfully"
else
  echo "✗ Failed to obfuscate token-loader.js"
  exit 1
fi

echo ""
echo "✓ Obfuscation complete!"
echo "Files created:"
echo "  - js/app.obf.js"
echo "  - js/token-loader.obf.js"
echo ""
echo "Update index.html to use .obf.js files (already done - has fallback)"
