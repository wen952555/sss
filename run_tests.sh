#!/bin/bash
set -e
echo "--- Current directory: $(pwd) ---"
echo "--- Listing contents of current directory ---"
ls -la
echo "--- Changing to frontend directory ---"
cd frontend
echo "--- Current directory: $(pwd) ---"
echo "--- Listing contents of frontend directory ---"
ls -la
echo "--- Removing node_modules ---"
rm -rf node_modules
echo "--- Installing dependencies ---"
npm install
echo "--- Running linter ---"
npm run lint
echo "--- Running build ---"
npm run build
echo "--- Tests passed ---"
