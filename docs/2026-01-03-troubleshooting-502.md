# 502 Bad Gateway Troubleshooting Guide

## Quick Fix

Run this on your server:
```bash
cd /path/to/horse-racer
bash scripts/fix-app.sh
```

This will automatically:
1. Check PM2 status
2. Clear port 3000
3. Verify environment variables
4. Check database connection
5. Restart the application
6. Test if it's responding

## Manual Troubleshooting Steps

### Step 1: Check if PM2 is running the app

```bash
pm2 status
```

Expected output:
```
┌─────┬──────────────────────┬─────────┬─────────┐
│ id  │ name                 │ status  │ cpu     │
├─────┼──────────────────────┼─────────┼─────────┤
│ 0   │ neighs-of-thunder    │ online  │ 0%      │
└─────┴──────────────────────┴─────────┴─────────┘
```

If status is **"errored"** or **"stopped"**:
```bash
pm2 logs neighs-of-thunder --lines 50
```

### Step 2: Check PM2 logs

```bash
# Real-time logs
pm2 logs

# Last 100 lines
pm2 logs --lines 100

# Just errors
pm2 logs --err
```

Common errors and solutions:

#### Error: "Cannot find module"
```bash
cd /path/to/app
npm install
pm2 restart all
```

#### Error: "EADDRINUSE: address already in use :::3000"
```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
lsof -ti :3000 | xargs kill -9

# Restart app
pm2 restart all
```

#### Error: "Prisma Client not generated"
```bash
npx prisma generate
pm2 restart all
```

#### Error: "DATABASE_URL is not set"
```bash
# Check .env file exists
ls -la .env

# Check DATABASE_URL
grep DATABASE_URL .env

# If missing, add it:
echo "DATABASE_URL=postgresql://..." >> .env
pm2 restart all
```

### Step 3: Test manually

```bash
# Stop PM2
pm2 stop all

# Run directly to see errors
cd /path/to/app
npm start

# Or with tsx directly
npx tsx server.ts
```

This will show errors directly in the terminal.

### Step 4: Check build

```bash
# Is there a build?
ls -la .next

# If not, build it
npm run build

# Then restart
pm2 restart all
```

### Step 5: Check environment

```bash
# View PM2 environment
pm2 env 0

# Check required variables
cat .env | grep -E "DATABASE_URL|NEXTAUTH_SECRET|NEXTAUTH_URL"
```

### Step 6: Test database connection

```bash
npx prisma db execute --stdin <<< "SELECT 1;"
```

If this fails, your database isn't accessible.

### Step 7: Fresh start

```bash
# Stop everything
pm2 stop all
pm2 delete all

# Clean build
rm -rf .next

# Reinstall
npm install

# Regenerate Prisma
npx prisma generate

# Rebuild
npm run build

# Start fresh
pm2 start ecosystem.config.js --env production
pm2 save
```

## Common Issues

### Issue: App keeps restarting

Check logs:
```bash
pm2 logs --lines 200
```

Usually caused by:
1. Uncaught exception in code
2. Database connection failing
3. Missing environment variables
4. Port already in use

### Issue: App starts but immediately stops

```bash
# Check PM2 startup logs
pm2 logs --lines 50

# Try running directly
npx tsx server.ts
```

### Issue: "online" but not responding on port 3000

```bash
# Is something actually listening?
lsof -i :3000

# Test locally
curl http://localhost:3000

# Check if bound to 0.0.0.0 or 127.0.0.1
netstat -tlnp | grep 3000
```

If bound to 127.0.0.1, Nginx can access it.
If not listening at all, check PM2 logs.

### Issue: Build succeeds but app won't start

Check for TypeScript errors that we're now ignoring:
```bash
npm run type-check
```

Fix any critical errors, then rebuild:
```bash
npm run build
pm2 restart all
```

## Nginx Configuration Issues

### Test Nginx config
```bash
sudo nginx -t
```

### Check Nginx can reach backend
```bash
# From server
curl http://localhost:3000

# Should return HTML or JSON
```

### Check Nginx error log
```bash
sudo tail -50 /var/log/nginx/error.log
```

Common Nginx errors:
- **"upstream timed out"** - App is frozen
- **"Connection refused"** - App not running on port 3000
- **"no live upstreams"** - App crashed

## Emergency Rollback

If the latest deploy broke everything:

```bash
cd /path/to/app

# See recent commits
git log --oneline -10

# Rollback to previous commit
git reset --hard <commit-hash>

# Redeploy
npm install
npm run build
pm2 restart all
```

Or use the rollback script:
```bash
bash scripts/rollback.sh <commit-hash>
```

## Diagnostic Checklist

- [ ] PM2 shows app as "online"
- [ ] Port 3000 is listening (`lsof -i :3000`)
- [ ] App responds to `curl http://localhost:3000`
- [ ] Nginx config is valid (`sudo nginx -t`)
- [ ] Nginx is running (`sudo systemctl status nginx`)
- [ ] .env file exists and has required variables
- [ ] Database is accessible (`npx prisma db execute`)
- [ ] Build directory exists (`.next/`)

## Getting Help

1. **Run diagnostics:**
   ```bash
   bash scripts/diagnose.sh
   bash scripts/check-nginx.sh
   ```

2. **Collect information:**
   - PM2 status: `pm2 status`
   - PM2 logs: `pm2 logs --lines 100 --nostream`
   - Nginx errors: `sudo tail -50 /var/log/nginx/error.log`
   - Port status: `lsof -i :3000`

3. **Try the fix script:**
   ```bash
   bash scripts/fix-app.sh
   ```

## Prevention

### 1. Always run type-check before pushing
```bash
npm run type-check
```

### 2. Test build locally
```bash
npm run build
npm start
curl http://localhost:3000
```

### 3. Monitor logs after deploy
```bash
pm2 logs --lines 50
```

### 4. Set up monitoring
```bash
# PM2 monitoring (optional)
pm2 install pm2-server-monit
```
