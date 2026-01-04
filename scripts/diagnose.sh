#!/bin/bash
# Diagnostic script for 502 errors
# Run this on your server: bash scripts/diagnose.sh

echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Last 50 PM2 Logs ==="
pm2 logs --lines 50 --nostream

echo ""
echo "=== Check if app is listening ==="
netstat -tlnp | grep 3000 || echo "Nothing listening on port 3000"

echo ""
echo "=== Nginx Status ==="
sudo systemctl status nginx | head -20

echo ""
echo "=== Recent Nginx Errors ==="
sudo tail -50 /var/log/nginx/error.log

echo ""
echo "=== Check Node/NPM versions ==="
node --version
npm --version

echo ""
echo "=== Check Environment ==="
pm2 env 0 | grep -E "NODE_ENV|PORT"
