#!/bin/bash
# Nginx diagnostic script
# Run on your server: bash scripts/check-nginx.sh

echo "======================================"
echo "NGINX DIAGNOSTIC TOOL"
echo "======================================"
echo ""

# Check if Nginx is installed
echo "1. Checking Nginx installation..."
if command -v nginx &> /dev/null; then
    nginx -v
    echo "✓ Nginx is installed"
else
    echo "✗ Nginx is NOT installed"
    echo "  Install with: sudo apt update && sudo apt install nginx"
    exit 1
fi
echo ""

# Check Nginx service status
echo "2. Checking Nginx service status..."
if systemctl is-active --quiet nginx; then
    echo "✓ Nginx is running"
    systemctl status nginx --no-pager | head -5
else
    echo "✗ Nginx is NOT running"
    echo "  Start with: sudo systemctl start nginx"
    echo ""
    echo "  Recent errors:"
    sudo journalctl -u nginx -n 20 --no-pager
fi
echo ""

# Check if Nginx is enabled on boot
echo "3. Checking if Nginx starts on boot..."
if systemctl is-enabled --quiet nginx; then
    echo "✓ Nginx is enabled on boot"
else
    echo "⚠ Nginx will NOT start on boot"
    echo "  Enable with: sudo systemctl enable nginx"
fi
echo ""

# Check Nginx configuration syntax
echo "4. Testing Nginx configuration..."
sudo nginx -t
if [ $? -eq 0 ]; then
    echo "✓ Nginx configuration is valid"
else
    echo "✗ Nginx configuration has errors"
fi
echo ""

# Check what ports Nginx is listening on
echo "5. Checking Nginx listening ports..."
sudo netstat -tlnp | grep nginx || sudo ss -tlnp | grep nginx
echo ""

# Check if site config exists
echo "6. Checking site configuration..."
if [ -f /etc/nginx/sites-available/horse-racer ]; then
    echo "✓ Site config exists: /etc/nginx/sites-available/horse-racer"
    if [ -L /etc/nginx/sites-enabled/horse-racer ]; then
        echo "✓ Site is enabled"
    else
        echo "⚠ Site exists but is NOT enabled"
        echo "  Enable with: sudo ln -s /etc/nginx/sites-available/horse-racer /etc/nginx/sites-enabled/"
    fi
else
    echo "✗ No site configuration found"
    echo "  Expected: /etc/nginx/sites-available/horse-racer"
fi
echo ""

# Check recent Nginx error logs
echo "7. Recent Nginx errors (last 20 lines)..."
if [ -f /var/log/nginx/error.log ]; then
    sudo tail -20 /var/log/nginx/error.log
else
    echo "No error log found"
fi
echo ""

# Check if app is running
echo "8. Checking if Node.js app is running..."
if netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000; then
    echo "✓ Something is listening on port 3000"
else
    echo "✗ Nothing is listening on port 3000"
    echo "  Your Node.js app may not be running"
    echo "  Check with: pm2 status"
fi
echo ""

# Test Nginx proxy to localhost:3000
echo "9. Testing Nginx proxy to backend..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:80 2>/dev/null || echo "Cannot connect to Nginx"
echo ""

echo "======================================"
echo "DIAGNOSTIC COMPLETE"
echo "======================================"
