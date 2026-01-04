#!/bin/bash
# Fix application startup issues
# Run on server: bash scripts/fix-app.sh

set -e

echo "======================================"
echo "APP STARTUP FIX SCRIPT"
echo "======================================"
echo ""

# Get app directory from argument or use current directory
APP_DIR="${1:-$(pwd)}"
cd "$APP_DIR"

echo "Working directory: $APP_DIR"
echo ""

# Check PM2 status
echo "1. Checking PM2 status..."
pm2 status || true
echo ""

# Stop all PM2 processes
echo "2. Stopping all PM2 processes..."
pm2 stop all || true
pm2 delete all || true
echo ""

# Check what's using port 3000
echo "3. Checking if port 3000 is in use..."
if lsof -i :3000 2>/dev/null; then
    echo "⚠ Port 3000 is in use. Killing processes..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    sleep 2
else
    echo "✓ Port 3000 is free"
fi
echo ""

# Check environment variables
echo "4. Checking .env file..."
if [ -f .env ]; then
    echo "✓ .env file exists"
    # Check for required variables
    if grep -q "DATABASE_URL" .env; then
        echo "✓ DATABASE_URL is set"
    else
        echo "⚠ DATABASE_URL is missing!"
    fi
    if grep -q "NEXTAUTH_SECRET" .env; then
        echo "✓ NEXTAUTH_SECRET is set"
    else
        echo "⚠ NEXTAUTH_SECRET is missing!"
    fi
else
    echo "✗ .env file is missing!"
    echo "  Copy from .env.example: cp .env.example .env"
fi
echo ""

# Check if build exists
echo "5. Checking Next.js build..."
if [ -d .next ]; then
    echo "✓ .next build directory exists"
else
    echo "✗ No build found. Running build..."
    npm run build
fi
echo ""

# Test database connection
echo "6. Testing database connection..."
if npx prisma db execute --stdin <<< "SELECT 1;" 2>/dev/null; then
    echo "✓ Database connection successful"
else
    echo "⚠ Database connection failed"
    echo "  Check DATABASE_URL in .env"
fi
echo ""

# Start the app
echo "7. Starting application with PM2..."
if [ -f ecosystem.config.js ]; then
    pm2 start ecosystem.config.js --env production
    pm2 save
    echo "✓ App started with ecosystem.config.js"
else
    echo "⚠ ecosystem.config.js not found, starting with npm"
    pm2 start npm --name "horse-racer" -- start
    pm2 save
fi
echo ""

# Wait for app to start
echo "8. Waiting for app to start (10 seconds)..."
sleep 10
echo ""

# Check if app is running
echo "9. Checking if app is running..."
pm2 status
echo ""

# Test port 3000
echo "10. Testing port 3000..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✓ App is responding on port 3000!"
else
    echo "✗ App is NOT responding on port 3000"
    echo ""
    echo "Recent PM2 logs:"
    pm2 logs --lines 30 --nostream
fi
echo ""

echo "======================================"
echo "SCRIPT COMPLETE"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Check logs: pm2 logs"
echo "2. Test Nginx: curl http://localhost"
echo "3. View full status: pm2 status"
