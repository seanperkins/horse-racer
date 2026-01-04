# Claude Code Configuration

This directory contains configuration for Claude Code, including custom skills, hooks, and agents.

## Directory Structure

```
.claude/
├── skills/           # Custom skills that can be invoked
│   └── update-tutorial.md
├── hooks/            # Hooks that run at specific events
│   └── post-task.sh
├── agents/           # Agent configurations for specialized tasks
│   └── tutorial-updater.json
└── settings.local.json  # Local settings (gitignored)
```

## Tutorial Update System

The tutorial update system ensures that the tutorial page stays synchronized with game implementation.

### Automatic Suggestions

After committing changes that may affect gameplay, the `post-task.sh` hook will suggest updating the tutorial:

```bash
🎓 Suggestion: Recent changes may affect the tutorial.
   Consider running: /update-tutorial
   Or ask: 'Please update the tutorial to reflect the recent changes'
```

### Manual Invocation

You can manually trigger tutorial updates in several ways:

**1. Using the skill (recommended):**
```
/update-tutorial
```

**2. Natural language:**
```
Please update the tutorial to reflect the recent changes
```

**3. Using the Task tool with the agent:**
```
Use the tutorial-updater agent to review and update the tutorial
```

### What Gets Updated

The tutorial updater will:

- ✅ Review recent commits for gameplay changes
- ✅ Verify tutorial accuracy against actual code
- ✅ Update stats, mechanics, and feature descriptions
- ✅ Add documentation for new features
- ✅ Fix outdated information
- ✅ Keep tone beginner-friendly
- ✅ Maintain consistent formatting

### Files Monitored

The tutorial updater pays special attention to changes in:

- `server/GameManager.ts` - Core game logic
- `server/raceSimulation.ts` - Race mechanics
- `types/units.ts` - Stats, bloodlines, equipment, jockeys
- `components/game/*` - Phase components and UI
- `lib/store/gameStore.ts` - Game state management
- `app/tutorial/page.tsx` - The tutorial itself

### Best Practices

1. **Run after major features:** Always update tutorial after implementing new game mechanics
2. **Verify before release:** Ensure tutorial matches implementation before deploying
3. **Keep it simple:** Tutorial should be accessible to new players
4. **Test examples:** Make sure code examples and strategies are valid

## Hooks

### post-task.sh

Runs after task completion. Currently:
- Checks if recent commits might affect tutorial
- Suggests running tutorial update if needed

To disable: Remove or rename the hook file.

## Skills

### update-tutorial

A specialized skill for maintaining tutorial documentation. Invoked with `/update-tutorial`.

See `skills/update-tutorial.md` for full documentation.

## Agents

### tutorial-updater

A documentation specialist agent configured to maintain the tutorial page.

Configuration in `agents/tutorial-updater.json`.

## Settings

Local settings are stored in `settings.local.json` (gitignored). This file can contain:
- Custom preferences
- API keys
- Local overrides

See Claude Code documentation for available settings.
