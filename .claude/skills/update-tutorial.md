# Update Tutorial

**Description:** Automatically review and update the tutorial page when game mechanics or features change.

**When to use:** After implementing new features, changing game mechanics, or modifying existing gameplay systems.

## Instructions

You are responsible for keeping the tutorial page up-to-date with the actual game implementation.

### Steps:

1. **Analyze Recent Changes**
   - Review the git diff or recent commits to understand what changed
   - Identify if changes affect gameplay, UI, stats, mechanics, or features
   - Determine if these changes impact information in the tutorial

2. **Read Current Tutorial**
   - Read the current tutorial page at `app/tutorial/page.tsx`
   - Identify sections that may be outdated or inaccurate

3. **Review Game Implementation**
   - Check relevant game files to understand current mechanics
   - Verify actual stat calculations, phase logic, and feature implementations
   - Look at:
     - `server/GameManager.ts` - Core game logic
     - `server/raceSimulation.ts` - Race mechanics
     - `types/units.ts` - Stats, bloodlines, equipment
     - Phase components - UI and interactions
     - `lib/store/gameStore.ts` - Game state

4. **Update Tutorial Content**
   - Fix any inaccuracies or outdated information
   - Add documentation for new features
   - Update examples if mechanics changed
   - Ensure all stats, formulas, and descriptions match implementation
   - Keep tone consistent and beginner-friendly

5. **Verify Completeness**
   - Ensure all game phases are documented
   - Verify all stats and attributes are explained
   - Check that strategic tips are still relevant
   - Make sure new features are adequately explained

6. **Report Changes**
   - Provide a summary of what was updated in the tutorial
   - Note any discrepancies found between tutorial and implementation
   - Suggest additional documentation if gaps exist

## Example Usage

```
User: I just added a new "Fatigue" stat to horses
Skill: *Reads recent changes, reviews tutorial, checks implementation*
Skill: *Updates tutorial to include Fatigue in the stats section*
Skill: *Adds strategic tips about managing fatigue*
Skill: *Reports: "Added Fatigue stat to tutorial, updated strategy section"*
```

## Notes

- Always verify information against actual code, not assumptions
- Keep tutorial beginner-friendly and avoid technical jargon
- Maintain consistent formatting with existing content
- Focus on helping new players understand core mechanics
