#!/bin/bash

echo "Starting JMX Geek Manager Frontend..."
cd jmx-frontend

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting development server..."
npm run dev
