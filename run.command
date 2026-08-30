#!/bin/bash

# Navigate to script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=================================================="
echo "⚡ Launching OS Core Simulator (React + Vite Suite)"
echo "=================================================="

# 1. Compile C++ Engine in background/binary test
g++ -std=c++17 -Wall main.cpp -o scheduler

echo "🌐 Starting React Dev Server on http://localhost:3000 ..."
npm run dev
