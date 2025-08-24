#!/bin/bash

echo "=== BUILDING PHISHGUARD LITE EXTENSION ==="
echo ""

# Clean dist folder
echo "1. Cleaning dist folder..."
rm -rf dist

# Build JavaScript files with Vite
echo "2. Building JavaScript files..."
npm run build

# Copy static assets
echo "3. Copying static assets..."
cp manifest.json dist/
cp -r public/* dist/
cp src/options/index.html dist/
cp src/options/styles.css dist/

echo "4. Build complete! Files in dist/:"
ls -la dist/

echo ""
echo "=== EXTENSION READY FOR TESTING ==="
echo "Load the 'dist' folder in Chrome as an unpacked extension"
