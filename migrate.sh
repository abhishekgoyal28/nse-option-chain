#!/bin/bash

# NSE Tracker Migration Script - JavaScript to TypeScript
# This script helps migrate from the old JavaScript version to the new TypeScript version

echo "🚀 NSE Option Chain Tracker - Migration to TypeScript v3.0.0"
echo "============================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 16.0.0"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version must be >= 16.0.0. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version check passed: $(node -v)"

# Backup old files
echo "📦 Creating backup of old files..."
mkdir -p backup
cp server.js backup/ 2>/dev/null || echo "No server.js to backup"
cp reliableGoogleSheets.js backup/ 2>/dev/null || echo "No reliableGoogleSheets.js to backup"
cp googleSheetsStorage.js backup/ 2>/dev/null || echo "No googleSheetsStorage.js to backup"
cp simpleGoogleSheets.js backup/ 2>/dev/null || echo "No simpleGoogleSheets.js to backup"
cp package.json.old backup/package.json 2>/dev/null || echo "No old package.json to backup"

echo "✅ Backup completed in ./backup/ directory"

# Install dependencies
echo "📦 Installing TypeScript dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your credentials:"
    echo "   - KITE_API_KEY"
    echo "   - KITE_API_SECRET"
    echo "   - Optional: Google Sheets credentials"
fi

# Build TypeScript
echo "🔨 Building TypeScript project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ TypeScript build failed"
    exit 1
fi

echo "✅ TypeScript build completed"

# Run type checking
echo "🔍 Running type checking..."
npm run type-check

if [ $? -ne 0 ]; then
    echo "⚠️  Type checking found issues, but build succeeded"
else
    echo "✅ Type checking passed"
fi

# Run linting
echo "🧹 Running linting..."
npm run lint

if [ $? -ne 0 ]; then
    echo "⚠️  Linting found issues. Run 'npm run lint:fix' to auto-fix"
else
    echo "✅ Linting passed"
fi

# Run tests
echo "🧪 Running tests..."
npm test

if [ $? -ne 0 ]; then
    echo "⚠️  Some tests failed, but migration can continue"
else
    echo "✅ All tests passed"
fi

# Create logs directory
mkdir -p logs
echo "✅ Created logs directory"

echo ""
echo "🎉 Migration completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Review and update your .env file with correct credentials"
echo "2. Start development server: npm run dev"
echo "3. Or build and start production: npm run build && npm start"
echo ""
echo "📚 Documentation:"
echo "- README_TYPESCRIPT.md - Complete TypeScript documentation"
echo "- README.md - Original documentation"
echo ""
echo "🔧 Available Commands:"
echo "- npm run dev          # Development with hot reload"
echo "- npm run build        # Build for production"
echo "- npm start            # Start production server"
echo "- npm test             # Run tests"
echo "- npm run lint         # Check code style"
echo "- npm run lint:fix     # Fix code style issues"
echo ""
echo "🗂️  Project Structure:"
echo "- src/                 # TypeScript source code"
echo "- dist/                # Compiled JavaScript (after build)"
echo "- backup/              # Backup of old files"
echo "- logs/                # Application logs"
echo ""
echo "Happy coding! 🚀"
