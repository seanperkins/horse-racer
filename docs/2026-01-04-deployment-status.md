# Deployment Status Check

## Check GitHub Actions

1. Go to: https://github.com/seanperkins/horse-racer/actions
2. Look for the latest "Deploy to DigitalOcean" workflow
3. It should show the deployment progress

## Check on Server

SSH into the server and check:

```bash
# Check if middleware.ts exists
ls -la /root/horse-racer/middleware.ts

# Check if build completed successfully
ls -la /root/horse-racer/.next/server/middleware-manifest.json

# Check PM2 status
pm2 status

# Check PM2 logs
pm2 logs --lines 50
```

## Expected Results

### After successful deployment:
- `middleware.ts` should exist in project root
- `.next/server/middleware-manifest.json` should exist
- PM2 should show app as "online"
- Logs should show: `> Ready on http://localhost:3000`
- Logs should show: `> WebSocket server listening on ws://localhost:3000/ws`

### Common Issues:

**If middleware-manifest.json is still missing:**
```bash
cd /root/horse-racer
npm run build
pm2 restart all
```

**If WebSocket auth still failing:**
```bash
# Check environment variables
grep -E "AUTH_SECRET|NEXTAUTH_SECRET" /root/horse-racer/.env

# Ensure both are set to the same value
# Then restart and re-login
pm2 restart all
```

## Manual Deploy

If GitHub Actions deployment fails, you can deploy manually:

```bash
ssh root@<your-server>
cd /root/horse-racer
git pull origin main
./deploy.sh
```
