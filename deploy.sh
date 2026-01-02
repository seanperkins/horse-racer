#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"

# Source nvm to ensure node/npm/pm2 are in PATH
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
fi

# Check if pm2 is available
if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 not found. Attempting to install globally..."
  npm install -g pm2
fi

cd "$APP_DIR"

echo "Installing dependencies..."
npm ci

echo "Generating Prisma client..."
npx prisma generate

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Building Next.js app..."
npm run build

echo "Configuring PM2 log rotation..."
pm2 install pm2-logrotate >/dev/null 2>&1 || true
pm2 set pm2-logrotate:max_size 10M >/dev/null
pm2 set pm2-logrotate:retain 14 >/dev/null
pm2 set pm2-logrotate:compress true >/dev/null

echo "Starting app with PM2..."
pm2 startOrReload ecosystem.config.js --env production
pm2 save

echo "Deployment complete."
