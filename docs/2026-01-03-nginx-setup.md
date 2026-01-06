# Nginx Setup Guide for Horse Racer

## Quick Diagnostic

Run this on your server to check Nginx status:
```bash
bash scripts/check-nginx.sh
```

## Common Nginx Commands

### Check Status
```bash
# Is Nginx running?
sudo systemctl status nginx

# Is Nginx enabled on boot?
sudo systemctl is-enabled nginx
```

### Control Nginx
```bash
# Start Nginx
sudo systemctl start nginx

# Stop Nginx
sudo systemctl stop nginx

# Restart Nginx (full restart)
sudo systemctl restart nginx

# Reload config (no downtime)
sudo systemctl reload nginx

# Enable on boot
sudo systemctl enable nginx
```

### Test Configuration
```bash
# Test config syntax
sudo nginx -t

# Test and reload if valid
sudo nginx -t && sudo systemctl reload nginx
```

### View Logs
```bash
# Error log
sudo tail -f /var/log/nginx/error.log

# Access log
sudo tail -f /var/log/nginx/access.log

# Last 100 errors
sudo tail -100 /var/log/nginx/error.log
```

## Nginx Configuration for Horse Racer

Your Nginx config should be at: `/etc/nginx/sites-available/horse-racer`

### Example Configuration

```nginx
# /etc/nginx/sites-available/horse-racer

upstream nodejs_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Increase timeout for WebSocket connections
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    location / {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Real IP forwarding
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://nodejs_backend;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
    }
}
```

### Enable the Site

```bash
# Create symlink to enable site
sudo ln -s /etc/nginx/sites-available/horse-racer /etc/nginx/sites-enabled/

# Remove default site if exists
sudo rm /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Troubleshooting 502 Bad Gateway

### 1. Check if Node.js app is running
```bash
pm2 status
pm2 logs horse-racer --lines 50
```

If not running:
```bash
pm2 restart horse-racer
# or
cd /path/to/app && npm start
```

### 2. Check if port 3000 is listening
```bash
sudo netstat -tlnp | grep 3000
# or
sudo lsof -i :3000
```

If nothing is listening on 3000, your Node app isn't running.

### 3. Check Nginx can connect to backend
```bash
# Test from server itself
curl http://localhost:3000

# Check Nginx error log
sudo tail -50 /var/log/nginx/error.log
```

Common errors:
- `connect() failed (111: Connection refused)` - App not running on port 3000
- `upstream timed out` - App is frozen/not responding
- `permission denied` - SELinux blocking connection

### 4. Check firewall
```bash
# Check if port 80 is open
sudo ufw status

# Allow HTTP/HTTPS if needed
sudo ufw allow 'Nginx Full'
```

### 5. Test end-to-end
```bash
# From the server
curl http://localhost

# From your local machine
curl http://your-server-ip
```

## SSL/HTTPS Setup (Optional)

Using Let's Encrypt with Certbot:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate and auto-configure Nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Performance Tuning

Add to `/etc/nginx/nginx.conf` in the `http` block:

```nginx
# Worker processes (usually = number of CPU cores)
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
}

http {
    # Enable compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/json application/javascript;

    # Connection keep-alive
    keepalive_timeout 65;
    keepalive_requests 100;

    # Client body size (for file uploads)
    client_max_body_size 10M;
}
```

## Common Issues

### Issue: "nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)"
**Solution**: Another process is using port 80
```bash
sudo lsof -i :80
sudo systemctl stop apache2  # if Apache is running
```

### Issue: "403 Forbidden"
**Solution**: Check file permissions
```bash
sudo chown -R www-data:www-data /path/to/app
sudo chmod -R 755 /path/to/app
```

### Issue: "502 Bad Gateway"
**Solution**: See troubleshooting section above

### Issue: WebSocket connections failing
**Solution**: Ensure these headers are in your config:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

## Monitoring

### Real-time monitoring
```bash
# Watch access log
sudo tail -f /var/log/nginx/access.log

# Watch error log
sudo tail -f /var/log/nginx/error.log

# Watch both
sudo tail -f /var/log/nginx/*.log
```

### Log rotation
Logs are automatically rotated by logrotate at:
`/etc/logrotate.d/nginx`

## Quick Reference

| Task | Command |
|------|---------|
| Test config | `sudo nginx -t` |
| Reload config | `sudo systemctl reload nginx` |
| Restart | `sudo systemctl restart nginx` |
| View errors | `sudo tail -f /var/log/nginx/error.log` |
| Check status | `sudo systemctl status nginx` |
| Enable on boot | `sudo systemctl enable nginx` |

## Need Help?

Run the diagnostic script:
```bash
bash scripts/check-nginx.sh
```

This will check all common issues and provide specific guidance.
