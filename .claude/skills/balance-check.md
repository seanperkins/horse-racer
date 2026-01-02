# Balance Check Skill

Validate game balance against PRD formulas and identify overpowered/underpowered units.

## Usage

```bash
/balance-check
```

## What This Skill Does

Analyzes all horses, jockeys, and equipment in the game data files to ensure proper balance according to the PRD specifications.

## Checks Performed

### 1. Stat Budget Validation
- **Tier 1 Horses**: Should have 20-22 total stat points
- **Tier 2 Horses**: Should have 22-25 total stat points
- **Tier 3 Horses**: Should have 24-27 total stat points
- **Tier 4 Horses**: Should have 26-30 total stat points
- **Jockeys**: Should have 12-22 total stat points

### 2. Power Rating Analysis
Calculates power rating using PRD formulas:
```
Power Rating = (Speed × 1.2) + Stamina + (Grit × Terrain Factor) - (Temper Variance)
```

### 3. Win Rate Simulation
Runs simulated races to determine actual win rates:
- Compares to expected win rate for tier
- Flags units that perform >10% above/below expectations

### 4. Equipment Balance
Validates that equipment costs match their stat bonuses

### 5. Bloodline Synergies
Checks that bloodline bonuses are properly balanced

## Output Format

```markdown
# Balance Report

## Summary
- Total Horses: 24
- Total Jockeys: 8
- Total Equipment: 12
- ⚠️ Balance Issues Found: 3

## Issues

### ⚠️ Thunderbolt (Tier 2 Horse)
- **Stat Budget**: 28 points (expected: 22-25) - OVER BUDGET
- **Win Rate**: 45% (expected: 25-35% for T2) - TOO STRONG
- **Recommendation**: Reduce Speed from 9→8 OR increase Temper from 6→8

### ⚠️ Rookie Kate (Jockey)
- **Stat Budget**: 13 points ✓
- **Cost**: 2 gold ✓
- **Win Rate**: 8% (expected: 12-15%) - TOO WEAK
- **Recommendation**: Increase Skill from 5→6 OR Timing from 4→5

## Balanced Units (21/24 horses ✓)
...
```

## Implementation

The skill will:
1. Read all data files from `/game/data/`
2. Parse horse, jockey, and equipment definitions
3. Calculate stat budgets and power ratings
4. Run Monte Carlo simulations for win rates
5. Generate detailed balance report
6. Provide specific stat adjustment recommendations
