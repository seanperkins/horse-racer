# Tutorial Maintenance System

This document describes the automated tutorial maintenance system for keeping the game tutorial synchronized with actual implementation.

## Overview

The tutorial update system consists of three components:

1. **Skill** (`/update-tutorial`) - Command to manually trigger updates
2. **Hook** (`post-task.sh`) - Automatic suggestions after relevant commits
3. **Agent** (`tutorial-updater`) - Specialized agent for tutorial maintenance

## How It Works

### Automatic Detection

After you commit changes that affect gameplay (features, mechanics, stats, etc.), the post-task hook automatically suggests updating the tutorial:

```bash
🎓 Suggestion: Recent changes may affect the tutorial.
   Consider running: /update-tutorial
   Or ask: 'Please update the tutorial to reflect the recent changes'
```

### Manual Triggers

You can trigger tutorial updates in several ways:

```bash
# Using the skill command
/update-tutorial

# Natural language request
"Please update the tutorial to reflect the recent changes"

# Specific request
"Update the tutorial's stats section to include the new Fatigue mechanic"

# Review request
"Check if the tutorial accurately describes the current race simulation"
```

## What Gets Updated

The tutorial updater will:

✅ **Analyze Changes**
- Review recent git commits
- Identify gameplay-affecting changes
- List modified game files

✅ **Verify Accuracy**
- Compare tutorial content with actual code
- Check stat calculations and formulas
- Verify phase descriptions match implementation

✅ **Update Content**
- Fix inaccurate information
- Add new feature documentation
- Update examples and strategies
- Maintain consistent formatting

✅ **Report Results**
- Summarize what was updated
- Note any discrepancies found
- Suggest additional documentation needs

## Key Files Monitored

The system pays special attention to:

| File | What It Affects |
|------|----------------|
| `server/GameManager.ts` | Core game loop, phase logic, elimination |
| `server/raceSimulation.ts` | Race mechanics, calculations, events |
| `types/units.ts` | Stats, bloodlines, equipment, jockeys |
| `components/game/*` | UI, phase interactions, player actions |
| `lib/store/gameStore.ts` | Game state, data flow |

## Best Practices

### When to Update

- ✅ After adding new features or mechanics
- ✅ After changing stat calculations
- ✅ After modifying phase behavior
- ✅ Before releasing to players
- ✅ When you notice tutorial inaccuracies

### How to Update

1. **Make your game changes** - Implement features normally
2. **Commit your changes** - Use descriptive commit messages
3. **Watch for hook suggestion** - The system will alert you if needed
4. **Run the updater** - Use `/update-tutorial` or ask naturally
5. **Review the changes** - Check what was updated
6. **Commit tutorial updates** - Commit the updated tutorial

### Writing Good Tutorial Content

The updater follows these principles:

- 🎯 **Accuracy First** - Always matches actual implementation
- 📖 **Beginner-Friendly** - No technical jargon, clear explanations
- 🎨 **Visual Hierarchy** - Proper sections, headings, and formatting
- 💡 **Practical Tips** - Include strategy and gameplay advice
- ✨ **Examples** - Show concrete examples where helpful

## Example Workflow

```bash
# 1. You implement a new "Fatigue" stat for horses
git commit -m "feat(gameplay): add fatigue mechanic to horses"

# 2. Hook detects the change
🎓 Suggestion: Recent changes may affect the tutorial.
   Consider running: /update-tutorial

# 3. You trigger the update
/update-tutorial

# 4. Agent works through the process
Analyzing recent commits...
Reading game implementation...
Reviewing tutorial content...
Updating tutorial sections...

# 5. Agent reports results
Updated tutorial:
- Added "Fatigue" to Horse Stats section
- Updated strategy tips to include fatigue management
- Added example of how fatigue affects races
- Updated Results Phase to mention fatigue recovery

# 6. You review and commit
git diff app/tutorial/page.tsx
git commit -m "docs(tutorial): add fatigue mechanic documentation"
```

## Troubleshooting

### Hook Not Running

If the post-task hook isn't suggesting updates:

1. Check hook is executable: `ls -la .claude/hooks/post-task.sh`
2. Make it executable: `chmod +x .claude/hooks/post-task.sh`
3. Verify it's in the correct location: `.claude/hooks/post-task.sh`

### Skill Not Found

If `/update-tutorial` doesn't work:

1. Check skill file exists: `cat .claude/skills/update-tutorial.md`
2. Try asking naturally: "Please update the tutorial"
3. Use the agent directly via Task tool

### Inaccurate Updates

If the updater makes mistakes:

1. Provide specific feedback when requesting updates
2. Manually review and edit the tutorial after updates
3. The agent follows the code - if tutorial is wrong, check if code changed

## Configuration

### Customizing the Hook

Edit `.claude/hooks/post-task.sh` to change trigger keywords:

```bash
TUTORIAL_KEYWORDS=(
  "feat"
  "feature"
  "mechanic"
  "gameplay"
  # Add more keywords here
)
```

### Customizing the Agent

Edit `.claude/agents/tutorial-updater.json` to:
- Change the model used
- Modify the workflow steps
- Adjust instructions
- Add or remove tools

## Future Enhancements

Possible improvements to consider:

- [ ] Automated tutorial testing
- [ ] Screenshot generation for visual guides
- [ ] Video tutorial script generation
- [ ] Multi-language tutorial support
- [ ] Tutorial completeness checking
- [ ] Link validation
- [ ] Interactive tutorial mode

## Questions?

The tutorial update system is designed to:
- Save time maintaining documentation
- Ensure tutorial accuracy
- Keep players informed about game mechanics
- Reduce documentation drift

For more details, see [.claude/README.md](.claude/README.md).
