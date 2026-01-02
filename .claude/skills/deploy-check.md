# Deployment Check Skill

Pre-deployment validation checklist to ensure production readiness.

## Usage

```bash
/deploy-check
```

## What This Skill Does

Runs a comprehensive suite of checks before deploying to Digital Ocean to catch issues early.

## Checks Performed

### 1. TypeScript Compilation ✓
```bash
tsc --noEmit
```
- Validates all TypeScript files compile without errors
- Checks for type mismatches and missing imports

### 2. Code Quality (Biome) ✓
```bash
biome check .
```
- Linting rules compliance
- Code formatting consistency
- No unused variables or imports

### 3. Unit Tests ✓
```bash
vitest run
```
- All unit tests pass
- Race simulation tests
- Stat formula validation tests
- WebSocket message tests

### 4. E2E Tests (Optional) ✓
```bash
playwright test
```
- Only runs if `SKIP_E2E` is not set
- Full game flow testing
- Critical path validation

### 5. Prisma Migration Status ✓
```bash
prisma migrate status
```
- All migrations applied
- Schema in sync with database
- No pending migrations

### 6. Environment Variables ✓
Checks required environment variables:
```
✓ DATABASE_URL
✓ NEXTAUTH_URL
✓ NEXTAUTH_SECRET
✗ NODE_ENV=production  ← Missing or not set to production
```

### 7. Build Test ✓
```bash
next build
```
- Next.js builds successfully
- No build-time errors
- Bundle size within limits

### 8. Security Checks 🔒
- No `.env` file in git
- No exposed secrets in code
- Dependencies have no critical vulnerabilities

## Output Format

```
🚀 Thunder Hooves - Deployment Readiness Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TypeScript Compilation................ ✅ PASS
   No type errors found

2. Code Quality (Biome).................. ✅ PASS
   All files formatted correctly

3. Unit Tests............................ ✅ PASS (24/24)
   ✓ Race simulation determinism
   ✓ Stat formula calculations
   ✓ Bloodline bonuses
   ✓ Betting odds calculation

4. E2E Tests............................. ⏭️  SKIPPED
   Set SKIP_E2E=false to run

5. Prisma Migrations..................... ✅ PASS
   All migrations applied

6. Environment Variables................. ⚠️  WARNING
   ✓ DATABASE_URL
   ✓ NEXTAUTH_URL
   ✓ NEXTAUTH_SECRET
   ✗ NODE_ENV not set to 'production'

7. Build Test............................ ✅ PASS
   Build completed in 45.3s
   Bundle size: 2.4 MB (within limits)

8. Security Checks....................... ✅ PASS
   No exposed secrets found

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Deployment Readiness: 87% (7/8 passing)

⚠️  Issues Found:
1. NODE_ENV should be set to 'production' in .env.production
   Fix: export NODE_ENV=production

✅ Safe to deploy with warnings
❌ DO NOT DEPLOY - fix critical issues first

Recommended action: Fix environment variable issue before deploying
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Detailed Error Output

When checks fail, provides actionable fixes:

```
❌ 3. Unit Tests - FAILED (21/24 passing)

Failed Tests:
─────────────────────────────────────────────────
✗ race-simulation.test.ts
  └─ "should produce identical results with same seed"
     Expected: [1,2,3,4,5,6,7,8]
     Received: [1,3,2,4,5,6,7,8]

     Issue: Race results not deterministic
     Fix: Check RaceSimulator.ts - ensure no Math.random()
          without seeded RNG

✗ betting-odds.test.ts
  └─ "should calculate correct win odds"
     Expected: 5.0x
     Received: 4.8x

     Issue: Odds calculation formula incorrect
     Fix: Review calculateWinOdds() in game/betting.ts

✗ bloodline-bonus.test.ts
  └─ "Northern Storm 3+ bonus applies correctly"
     Expected: +1 Stamina to racing horse
     Received: +1 Stamina to all horses

     Issue: Bloodline bonus applied incorrectly
     Fix: Check applyBloodlineBonuses() logic
─────────────────────────────────────────────────

Run failing tests: npm test -- race-simulation.test.ts
```

## Quick Fix Mode

```bash
/deploy-check --fix
```

Auto-fixes common issues:
- Format code with Biome
- Update environment variables
- Run migrations
- Clear Next.js cache

## CI/CD Integration

Can be used in GitHub Actions:

```yaml
- name: Deployment Check
  run: npm run deploy-check

- name: Deploy if passing
  if: success()
  run: npm run deploy
```

## Implementation

The skill will:
1. Run each check sequentially
2. Collect results and errors
3. Calculate readiness score (0-100%)
4. Provide detailed fix suggestions
5. Exit with proper code (0 = ready, 1 = not ready)
6. Generate summary for CI/CD systems
7. Support `--fix` flag for auto-fixes
