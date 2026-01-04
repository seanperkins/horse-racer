#!/bin/bash
# Clean rebuild script for fixing corrupted Next.js builds
# Run on server: bash scripts/clean-rebuild.sh

set -e

echo "======================================"
echo "CLEAN REBUILD SCRIPT"
echo "======================================"
echo ""

# Get app directory from argument or use current directory
APP_DIR="${1:-$(pwd)}"
cd "$APP_DIR"

echo "Working directory: $APP_DIR"
echo ""

# Stop PM2
echo "1. Stopping PM2 processes..."
pm2 stop all || true
echo ""

# Remove corrupted build directories
echo "2. Removing corrupted build directories..."
rm -rf .next
rm -rf node_modules/.cache
echo "✓ Cleaned .next and node_modules/.cache"
echo ""

# Reinstall dependencies (just to be safe)
echo "3. Reinstalling dependencies..."
npm install
echo ""

# Regenerate Prisma client
echo "4. Regenerating Prisma client..."
npx prisma generate
echo ""

# Clean build
echo "5. Running clean build..."
NODE_OPTIONS="--max-old-space-size=2048" npm run build
echo ""

# Verify build
echo "6. Verifying build..."
if [ -d .next ]; then
    echo "✓ .next directory exists"
else
    echo "✗ .next directory missing!"
    exit 1
fi

if [ -f .next/server/middleware-manifest.json ]; then
    echo "✓ middleware-manifest.json exists"
else
    echo "✗ middleware-manifest.json missing!"
    exit 1
fi

if [ -d .next/server/app ]; then
    echo "✓ app directory exists"
else
    echo "✗ app directory missing!"
    exit 1
fi

echo ""

# Start PM2
echo "7. Starting PM2..."
if [ -f ecosystem.config.js ]; then
    pm2 start ecosystem.config.js --env production
    pm2 save
else
    pm2 start npm --name "horse-racer" -- start
    pm2 save
fi
echo ""

# Wait for app to start
echo "8. Waiting for app to start (10 seconds)..."
sleep 10
echo ""

# Check status
echo "9. Checking status..."
pm2 status
echo ""

echo "======================================"
echo "CLEAN REBUILD COMPLETE"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Check logs: pm2 logs --lines 50"
echo "2. Test site: curl http://localhost:3000"
echo "3. Check browser: http://your-domain.com"
