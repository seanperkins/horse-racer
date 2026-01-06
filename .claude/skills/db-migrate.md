# Database Migration Manager Skill

Manage Prisma database migrations for development and production.

## Usage

```bash
/db-migrate
```

## What This Skill Does

Handles all database migration workflows including creating migrations, applying them, seeding data, and resetting the database for testing.

## Options

When invoked, you can:
1. **Check Status**: View pending and applied migrations
2. **Create Migration**: Generate a new migration from schema changes
3. **Apply Migrations**: Run all pending migrations
4. **Seed Database**: Populate with test/default data
5. **Reset Database**: Drop all data and re-apply migrations
6. **Generate Client**: Regenerate Prisma client after schema changes

## Commands

### Check Migration Status
```bash
npx prisma migrate status
```

### Create New Migration
```bash
npx prisma migrate dev --name <migration_name>
```
Example names: `add_match_history`, `update_user_stats`, `create_leaderboard`

### Apply Pending Migrations (Development)
```bash
npx prisma migrate dev
```

### Apply Migrations (Production)
```bash
npx prisma migrate deploy
```

### Reset Database (Development Only)
```bash
npx prisma migrate reset
```
⚠️ **Warning**: This drops all data!

### Seed Test Data
```bash
npx prisma db seed
```

### Generate Prisma Client
```bash
npx prisma generate
```

### View Database in Browser
```bash
npx prisma studio
```

## Migration Workflow

### Adding a New Table/Field
1. Edit `prisma/schema.prisma`
2. Run `/db-migrate` → "Create Migration"
3. Review generated SQL in `prisma/migrations/`
4. Migration auto-applies in dev mode

### Fixing a Migration Error
1. If migration failed mid-apply:
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```
2. Fix the issue in schema
3. Create new migration

### Syncing with Production
1. Pull production schema:
   ```bash
   npx prisma db pull
   ```
2. Compare with local schema
3. Create migration for differences

## Output Format

```
🗄️  Database Migration Manager
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Migration Status
─────────────────────────────────────────────
Database: postgresql://localhost:5432/horse_racer

Applied Migrations:
  ✓ 20250101_init                    (Jan 1, 2025)
  ✓ 20250115_add_match_history       (Jan 15, 2025)
  ✓ 20250120_user_prestige           (Jan 20, 2025)

Pending Migrations:
  ○ 20250125_add_leaderboard         (not applied)

Schema Status:
  ⚠️  Schema has unapplied changes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What would you like to do?
1. Apply pending migrations
2. Create new migration
3. Reset database
4. Seed test data
5. Open Prisma Studio
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Common Schema Changes

### Add a new field
```prisma
model User {
  // ... existing fields
  totalWins    Int      @default(0)  // New field
}
```

### Add a new table
```prisma
model MatchHistory {
  id        String   @id @default(uuid())
  odId    String
  placement Int
  goldEarned Int
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  userId    String
}
```

### Add index for performance
```prisma
model User {
  // ... fields
  @@index([prestige])  // Index for leaderboard queries
}
```

## Implementation

The skill will:
1. Check current migration status
2. Detect schema changes vs applied migrations
3. Present appropriate options based on state
4. Execute chosen operation
5. Regenerate Prisma client if needed
6. Verify database connectivity
7. Provide rollback instructions on failure
