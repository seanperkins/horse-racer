# Build Optimization Guide

## Current Build Performance

### Local Development
- **Before**: ~5 minutes (with TypeScript checking)
- **After**: ~5 seconds (TypeScript checking skipped)
- **Command**: `npm run build`

### Production Deployment
- **Server**: DigitalOcean droplet
- **Optimizations Applied**: See below

## Optimizations Implemented

### 1. Next.js Config (`next.config.ts`)
```typescript
typescript: {
  ignoreBuildErrors: true,  // Skip TS checking during build
}
```

**Impact**: Reduces build time by 90%+ (5 min → 5 sec)

**Trade-off**: TypeScript errors won't block builds
- Run `npm run type-check` separately
- Consider adding to pre-commit hooks

### 2. Deployment Script (`deploy.sh`)
- **npm install** instead of `npm ci` (reuses cached packages)
- **Conditional Prisma generation** (only when schema changes)
- **Memory optimization** (`NODE_OPTIONS=--max-old-space-size=2048`)

### 3. NPM Configuration (`.npmrc`)
- Prefer offline cache
- Disable audits and funding messages
- Skip unnecessary progress output

## Recommendations

### For Faster Deploys

1. **Use pnpm instead of npm** (3x faster)
   ```bash
   npm install -g pnpm
   # Then replace npm with pnpm in scripts
   ```

2. **Enable persistent build cache** on server
   - Keep `.next/cache` between deploys
   - Reduces rebuild time significantly

3. **Consider GitHub Actions** for builds
   - Build in GitHub Actions (parallel runners)
   - Deploy pre-built artifacts to server
   - Eliminates server CPU load

### For CI/CD

Add this to your workflow:
```yaml
- name: Type Check
  run: npm run type-check

- name: Build
  run: npm run build
```

### Server Resource Optimization

If builds are still slow on DigitalOcean:

1. **Upgrade droplet** (more CPU = faster builds)
2. **Add swap space** (if running out of memory)
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

3. **Use build caching**
   - Add `.next/cache` to persistent storage
   - Reuse between deploys

## Monitoring Build Performance

Track build times:
```bash
time npm run build
```

Expected times (with optimizations):
- **Local**: 5-10 seconds
- **Server (1 CPU)**: 15-30 seconds
- **Server (2 CPU)**: 10-20 seconds

## Troubleshooting

### Build Still Slow?

1. Check server resources:
   ```bash
   top
   df -h
   free -h
   ```

2. Check what's taking time:
   ```bash
   npm run build --verbose
   ```

3. Clear build caches:
   ```bash
   rm -rf .next node_modules/.cache
   ```

### TypeScript Errors in Production?

If you need type checking in production:
```bash
npm run type-check && npm run build
```

Or enable in `next.config.ts`:
```typescript
typescript: {
  ignoreBuildErrors: false,  // Re-enable TS checking
}
```
