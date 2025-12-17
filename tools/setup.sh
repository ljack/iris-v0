#!/bin/bash
set -e

# Detect OS
OS="$(uname -s)"
echo "Detected OS: $OS"

if [ "$OS" = "Darwin" ]; then
    echo "🍎 macOS detected. Checking for Homebrew..."
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew not found. Please install proper package manager."
        exit 1
    fi

    echo "📦 Installing system dependencies from Brewfile..."
    brew bundle --file=./Brewfile
else
    echo "⚠️  Non-macOS environment. Please install 'wabt' manually for your system."
fi

echo "📦 Installing NPM dependencies..."
npm install

echo "✅ Development environment setup complete!"
echo "   Try running: npm test"
