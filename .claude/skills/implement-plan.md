# Implement Plan Skill

Incrementally implements the unified implementation plan, tracking progress and committing changes.

## Usage

```bash
/implement-plan
# Reviews current progress, implements next step, updates plan, commits

/implement-plan --status
# Shows current milestone and remaining steps without implementing

/implement-plan --milestone 3
# Jump to specific milestone (use with caution)

/implement-plan --dry-run
# Shows what would be implemented next without making changes
```

## What This Skill Does

Manages the implementation of `docs/unified-implementation-plan.md` by:
1. Reading the plan and determining current progress
2. Implementing the next uncompleted step
3. Testing the changes work
4. Updating the plan with completion markers
5. Committing with a descriptive message

## Plan File Format

The skill tracks progress by looking for completion markers in the plan:

```markdown
### Milestone 1: Core Infrastructure
1. ✅ `types/game.ts` - Add SubmittedEntry type
2. ✅ `lib/store/gameStore.ts` - Add all new state fields
3. `server/GameRoom.ts` - Add prestige, stableSlots to player state  ← NEXT
4. `types/messages.ts` - Update message types
```

- `✅` prefix = completed
- No prefix = pending
- First pending item = next to implement

## Steps Performed

### 1. Read Current Progress 📋
```bash
# Read the plan file
cat docs/unified-implementation-plan.md

# Parse milestones and steps
# Find first uncompleted step
```

**Output:**
```
📋 Implementation Plan Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Milestone 1: Core Infrastructure [2/4 complete]
  ✅ types/game.ts - Add SubmittedEntry type
  ✅ lib/store/gameStore.ts - Add all new state fields
  ⬜ server/GameRoom.ts - Add prestige, stableSlots
  ⬜ types/messages.ts - Update message types

Overall Progress: 2/30 steps (6%)

Next step: server/GameRoom.ts - Add prestige, stableSlots to player state
```

### 2. Review Relevant Code 🔍

Before implementing, read:
- The target file(s) mentioned in the step
- Related files that might be affected
- Any types/interfaces being used

```bash
# Example for "Add prestige, stableSlots to player state"
cat server/GameRoom.ts
cat types/game.ts
```

### 3. Implement the Step 🛠️

Make the necessary code changes following the plan's specifications.

**Guidelines:**
- Follow existing code patterns in the file
- Add TypeScript types for new fields
- Include brief comments for non-obvious logic
- Don't over-engineer - implement exactly what's specified

### 4. Verify Changes ✓

Run relevant checks:
```bash
# TypeScript compilation
npx tsc --noEmit

# If tests exist for the area
npm test -- --testPathPattern="<relevant>"

# Quick visual check if UI change
npm run dev & sleep 5 && curl localhost:3000
```

### 5. Update the Plan 📝

Mark the completed step with ✅:

```markdown
# Before
3. `server/GameRoom.ts` - Add prestige, stableSlots to player state

# After
3. ✅ `server/GameRoom.ts` - Add prestige, stableSlots to player state
```

### 6. Commit Changes 💾

Create a commit with:
- Changed implementation files
- Updated plan file

```bash
git add <changed-files> docs/unified-implementation-plan.md
git commit -m "feat(<scope>): <description>

Implements step N of unified-implementation-plan.md
- <bullet points of changes>
"
```

## Milestone Breakdown

The plan has 9 milestones:

| # | Milestone | Steps | Description |
|---|-----------|-------|-------------|
| 1 | Core Infrastructure | 1-4 | Store + types foundation |
| 2 | UI State Sync | 5-6 | Betting skip fix (Issue #1) |
| 3 | Economy Display | 7-9 | Prestige in header |
| 4 | Betting Changes | 10-11 | Prestige payouts |
| 5 | Stable System | 12-15 | Slots + expansion |
| 6 | Participation & Catch-up | 16-18 | Penalties + Prestige |
| 7 | Synergy & Strategy | 19-24 | UI panels |
| 8 | Keyboard Shortcuts | 25-27 | Hotkey system |
| 9 | Polish | 28-30 | Final cleanup |

## Example Implementation Flow

### Step: "Add prestige, stableSlots to player state"

**1. Read current state:**
```typescript
// server/GameRoom.ts - current player interface
interface PlayerState {
  id: string
  name: string
  gold: number
  hearts: number
  // ...
}
```

**2. Add new fields:**
```typescript
interface PlayerState {
  id: string
  name: string
  gold: number
  hearts: number
  prestige: number      // NEW
  stableSlots: number   // NEW
  // ...
}
```

**3. Initialize in player creation:**
```typescript
const newPlayer: PlayerState = {
  // ...existing...
  prestige: 0,
  stableSlots: 1,  // Start with 1 slot
}
```

**4. Update any messages that send player state**

**5. Verify TypeScript compiles**

**6. Update plan, commit**

## Error Handling

### TypeScript Errors
```
❌ TypeScript compilation failed

src/server/GameRoom.ts:142:5 - error TS2339:
Property 'prestige' does not exist on type 'Player'

Fix the type error before proceeding.
```

### Test Failures
```
⚠️  Tests failed after changes

FAIL src/game/__tests__/stats.test.ts
  ● calculateBloodlineBonuses › should handle empty stable

Review test output and fix before committing.
```

### Merge Conflicts in Plan
```
⚠️  Plan file has been modified externally

Options:
1. Review changes and merge manually
2. Use --force to overwrite with current progress
3. Abort and resolve manually
```

## Best Practices

✅ **DO:**
- Implement one step at a time
- Test changes before committing
- Keep commits focused on single steps
- Read related code before implementing
- Follow existing patterns in the codebase

❌ **DON'T:**
- Skip steps without marking them
- Combine multiple steps in one commit
- Implement ahead without testing
- Ignore TypeScript errors
- Modify the plan structure (only add ✅ markers)

## Resuming After Break

When returning to implementation:

```bash
/implement-plan --status
# Shows exactly where you left off

/implement-plan
# Picks up from next uncompleted step
```

## Integration with Other Skills

```bash
# Full implementation workflow
/implement-plan              # Implement next step
/race-sim                    # Test if affects simulation
/commit                      # Already done by skill, but can verify
/deploy-check                # Verify deployment ready
```

## Plan Completion

When all steps are complete:

```
🎉 Implementation Plan Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All 30 steps across 9 milestones have been implemented.

Summary:
- UI/UX Issues: #1-#5 resolved
- Economy: Prestige currency + stable slots
- Keyboard shortcuts: All phases covered

Next steps:
1. Full integration testing
2. Balance tuning (Prestige earning rates)
3. User testing for UX flow
```
