#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo "  Termai Manager - Production Mode"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

echo "[1/5] Installing server dependencies..."
cd "$DIR/server"
npm install

echo "[2/5] Installing web dependencies..."
cd "$DIR/web"
npm install

# Fix node-pty spawn-helper permissions (macOS: prebuild lacks execute bit)
find "$DIR/server/node_modules/node-pty/prebuilds" -name "spawn-helper" -exec chmod +x {} \; 2>/dev/null || true

echo "[3/5] Building web app..."
cd "$DIR/web"
npm run build

echo "[4/5] Building server..."
cd "$DIR/server"
npm run build

echo "[5/5] Starting production server..."
cd "$DIR/server"
node dist/index.js &
SERVER_PID=$!

echo ""
echo "========================================"
echo "  Termai is running in production mode!"
echo "  Access: http://localhost:6688"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop the server..."

trap "kill $SERVER_PID 2>/dev/null; echo 'Server stopped.'; exit 0" SIGINT SIGTERM
wait
