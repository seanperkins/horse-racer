# Commit Skill

Smart git commit creation with automatic message generation and validation.

## Usage

```bash
/commit
# Creates commit with all staged changes and auto-generated message

/commit --all
# Stages all changes and commits

/commit --message "fix: resolve reconnection bug"
# Uses provided message instead of auto-generation

/commit --amend
# Amends the last commit (only if safe to do so)
```

## What This Skill Does

Analyzes staged changes (or all changes with `--all`) and creates a well-formatted commit with an appropriate message following conventional commit standards.

## Steps Performed

### 1. Pre-Commit Checks ✓
- Verify git repository exists
- Check for uncommitted changes
- Verify no merge conflicts
- Check branch status

### 2. Change Analysis 📊
```bash
git status
git diff --staged
git log -3 --oneline
```
- Review staged changes
- Analyze modification types (new features, bug fixes, refactoring)
- Check recent commit history for style consistency

### 3. Message Generation 📝

Generates commit message following conventional commit format:

```
<type>(<scope>): <description>

[optional body]

```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring without behavior change
- `perf`: Performance improvement
- `style`: Code style/formatting changes
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `chore`: Maintenance tasks (dependencies, config)
- `ci`: CI/CD changes

**Scopes (examples):**
- `websocket`: WebSocket handler changes
- `game-room`: GameRoom logic
- `lobby`: Lobby UI/logic
- `race-sim`: Race simulation
- `auth`: Authentication
- `db`: Database/Prisma changes

### 4. Commit Creation ✅
```bash
# Stage changes if --all flag provided
git add <files>

# Create commit
git commit -m "$(cat <<'EOF'
<generated message>
EOF
)"

# Verify commit created
git log -1
```

### 5. Post-Commit Summary 📋
```
✅ Commit created successfully

📝 Commit: abc1234
🔖 Message: feat(websocket): implement room join fixes
📁 Files changed: 2
   M server/websocket-handler.ts
   M server/GameRoom.ts
➕ Insertions: 67
➖ Deletions: 23
```

## Message Generation Examples

### Example 1: Bug Fix
**Changes:**
- Fixed reconnection logic in websocket-handler.ts
- Added socket cleanup on reconnect

**Generated Message:**
```
fix(websocket): prevent duplicate connections on reconnect

- Close existing socket when player reconnects
- Clean up stale playerSockets entries
- Add validation for connection-bound playerId

```

### Example 2: New Feature
**Changes:**
- Added ready-up system for results phase
- Updated GameRoom.ts with ready tracking
- Added ready button to UI

**Generated Message:**
```
feat(game-room): add ready-up system for results phase

- Players can ready up after viewing race results
- Game advances when all players ready or timeout
- Eliminated players don't see ready button
- 60s timeout for auto-advance

```

### Example 3: Refactoring
**Changes:**
- Extracted currentRoom restoration to helper
- Simplified message handler logic
- No behavior changes

**Generated Message:**
```
refactor(websocket): extract currentRoom restoration logic

Reduce code duplication across message handlers by
centralizing room lookup logic.

```

### Example 4: Multiple Changes
**Changes:**
- Updated game name to "Neighs of Thunder"
- Changed database name
- Updated all UI references

**Generated Message:**
```
chore: rename game to "Neighs of Thunder"

- Update all UI component titles
- Change database name in docker configs
- Update README and documentation
- Update PM2 and nginx config references

```

## Safety Features

### Amend Protection
Only allows `--amend` if:
1. User explicitly requested it
2. Last commit was created by Claude Code (check author)
3. Commit hasn't been pushed to remote
4. No merge conflicts exist

### Pre-commit Validation
- Warns if committing large files (>1MB)
- Warns if committing potential secrets (.env, etc.)
- Checks for TODO/FIXME comments in staged files
- Verifies TypeScript compiles (if .ts files changed)

### Interactive Confirmation
Shows preview and asks for confirmation:
```
📝 Proposed commit message:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
feat(websocket): implement room join fixes

- Reconnects bypass canJoin() check
- Join-by-code is now join-only
- Added sender identity validation
- Close duplicate connections on reconnect

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Files to be committed:
  M server/websocket-handler.ts (+67, -23)
  M server/GameRoom.ts (+15, -8)

Proceed with commit? (y/n)
```

## Implementation Notes

When implementing this skill:

1. **NEVER run git commands without user context** - Always show what will be committed
2. **Follow existing commit message style** - Check recent commits with `git log`
3. **Be concise but descriptive** - Message should explain WHY, not just WHAT
4. **Use conventional commits** - Helps with changelog generation
5. **Don't commit if uncertain** - Ask user to clarify scope if changes are ambiguous
6. **Respect .gitignore** - Never commit files that should be ignored
7. **Check for pre-commit hooks** - Don't skip them unless explicitly requested
8. **NEVER include AI attribution** - Commit messages should appear as if written by the developer

## Error Handling

### No Changes Staged
```
⚠️  No changes staged for commit

Run one of these commands first:
  git add <files>           Stage specific files
  git add .                 Stage all changes
  /commit --all             Auto-stage and commit
```

### Merge Conflict
```
❌ Cannot commit - merge conflict detected

Resolve conflicts in:
  - server/websocket-handler.ts

Run: git status
```

### Large Files Warning
```
⚠️  Large files detected:
  - public/sprites/horse-sheet.png (2.3 MB)

Consider using Git LFS for binary assets.
Proceed anyway? (y/n)
```

## Integration with Workflow

Works seamlessly with other skills:

```bash
# Development workflow
/race-sim                    # Test changes
npm run lint:fix             # Fix code style
/commit --all                # Commit with auto-generated message
git push                     # Push to remote
```

## Quick Commit Workflow

For rapid development:
```bash
# Make changes...
/commit --all
# ✅ Auto-stages, analyzes, generates message, and commits
```

## Custom Message Override

When you need specific wording:
```bash
/commit --message "fix: critical bug in race simulation"
# Uses your message but adds co-author tag
```

## Best Practices

✅ **DO:**
- Commit logical units of work
- Write descriptive but concise messages
- Use conventional commit types
- Stage related changes together

❌ **DON'T:**
- Commit half-finished features
- Mix unrelated changes in one commit
- Commit without testing
- Use vague messages like "fix stuff"

## Exit Codes

- `0` - Commit created successfully
- `1` - No changes to commit
- `2` - Validation failed (conflicts, large files, etc.)
- `3` - User cancelled commit
- `4` - Git error (not a repository, etc.)