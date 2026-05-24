#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo "  Termai Manager - Development Mode"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

echo "[1/4] Installing server dependencies..."
cd "$DIR/server"
npm install

echo "[2/4] Installing web dependencies..."
cd "$DIR/web"
npm install

echo "[3/4] Starting server (port 6688)..."
cd "$DIR/server"
npm run dev &
SERVER_PID=$!

echo "[4/4] Starting web dev server (port 5173)..."
cd "$DIR/web"
npm run dev &
WEB_PID=$!

echo ""
echo "========================================"
echo "  Termai is starting up!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:6688"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop all servers..."

trap "kill $SERVER_PID $WEB_PID 2>/dev/null; echo 'Servers stopped.'; exit 0" SIGINT SIGTERM
wait
