# PRD Compliance Checker Skill

Verify game implementation matches the Product Requirements Document.

## Usage

```bash
/prd-sync
```

## What This Skill Does

Compares the current game implementation against the PRD specifications, identifying deviations in stat formulas, game mechanics, and feature completeness.

## Options

When invoked, you can:
1. **Full Compliance Check**: Audit all PRD sections
2. **Stat Formulas**: Verify calculations match PRD
3. **Game Mechanics**: Check rules implementation
4. **Feature Checklist**: Track implemented vs planned features
5. **Generate Report**: Export compliance document

## PRD Sections Checked

### 1. Stat Formulas (Critical)
```
Base Speed = Horse.Speed × 2 + f(Jockey.Weight)
  where f(weight) = [3:+2, 4:+1, 5:0, 6:-1, 7:-2]

Stamina Pool = Horse.Stamina × (1 + Jockey.Timing × 0.2)

Burn Rate = 1.0 × (1 - Jockey.Timing × 0.025)

Strategy Modifiers:
  - Burst: Speed +20% start, Stamina ×1.5
  - Sprint: Speed +15% finish, Stamina ×1.3
  - Conserve: Burn -25%, Speed -10%
  - Push: Speed +10%, Burn +20%
```

### 2. Bloodline Bonuses
```
Northern Storm: 3+ horses → +1 Stamina to racing horse
Desert Wind: 2+ horses → +1 Speed to racing horse
Iron Heart: 2+ horses → +1 Grit to racing horse
Wild Card: 1 horse → Random +2 to any stat
Mudblood: 2+ horses → No mud penalty
Royal Line: 3+ horses → +10% Gold earnings
```

### 3. Jockey Traits
```
Mudder: No speed penalty in mud
Closer: +15% speed in final stretch
Front-Runner: +10% speed at start
Horse Whisperer: -20% stumble chance
Lightweight: +1 effective Speed
Veteran: -10% stamina burn
Lucky: 5% chance to avoid stumble entirely
```

### 4. Phase Timings
```
Lobby: Until all ready (min 2 players)
Shop: 45 seconds
Preparation: 30 seconds
Betting: 20 seconds
Race: Variable (track distance dependent)
Results: 60 seconds (or all ready)
```

### 5. Betting Rules
```
Win: Bet on 1st place (payout: odds × bet)
Place: Bet on top 3 (payout: odds/3 × bet)
Exacta: Bet on exact 1st+2nd (payout: odds × 5)
House Edge: 95% return rate
Min Bet: 10 gold
Max Bet: 100 gold (or current gold)
```

### 6. Economy Balance
```
Starting Gold: 500
Shop Reroll: 25 gold
Horse Prices: 100-300 based on total stats
Jockey Prices: 50-150 based on total stats
Equipment: 25-100 based on bonus
Race Reward: Base 50 + placement bonus
```

## Output Format

```
📋 PRD Compliance Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STAT FORMULAS
─────────────────────────────────────────────
✓ Base Speed calculation         COMPLIANT
✓ Stamina Pool calculation       COMPLIANT
✓ Burn Rate calculation          COMPLIANT
⚠️ Strategy modifiers            DEVIATION
  PRD: Burst Speed +20%
  Code: Burst Speed +25%
  File: game/simulation/RaceSimulator.ts:156

📦 BLOODLINE BONUSES
─────────────────────────────────────────────
✓ Northern Storm (3+ → +1 Stam)  COMPLIANT
✓ Desert Wind (2+ → +1 Speed)    COMPLIANT
✓ Iron Heart (2+ → +1 Grit)      COMPLIANT
✗ Wild Card (1 → Random +2)      NOT IMPLEMENTED
  Missing random stat assignment
✓ Mudblood (2+ → No mud pen)     COMPLIANT
⚠️ Royal Line (3+ → +10% Gold)   PARTIAL
  Gold bonus applied but only 8%

🎭 JOCKEY TRAITS
─────────────────────────────────────────────
✓ Mudder                         COMPLIANT
✓ Closer                         COMPLIANT
✓ Front-Runner                   COMPLIANT
✗ Horse Whisperer                NOT IMPLEMENTED
✓ Lightweight                    COMPLIANT
✓ Veteran                        COMPLIANT
✗ Lucky                          NOT IMPLEMENTED

⏱️  PHASE TIMINGS
─────────────────────────────────────────────
✓ Shop Phase: 45s                COMPLIANT
⚠️ Preparation Phase: 30s        DEVIATION (25s in code)
✓ Betting Phase: 20s             COMPLIANT
✓ Results Phase: 60s             COMPLIANT

💰 ECONOMY
─────────────────────────────────────────────
✓ Starting Gold: 500             COMPLIANT
✓ Reroll Cost: 25                COMPLIANT
⚠️ Horse Prices                  DEVIATION
  PRD: 100-300 range
  Code: 80-350 range

🎲 BETTING
─────────────────────────────────────────────
✓ Win bet mechanics              COMPLIANT
✓ Place bet mechanics            COMPLIANT
✓ Exacta bet mechanics           COMPLIANT
✓ House edge: 95%                COMPLIANT
⚠️ Max bet: 100g                 DEVIATION (150g in code)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 COMPLIANCE SUMMARY
─────────────────────────────────────────────
Total Checks:      42
Compliant:         35 (83%)
Deviations:        5  (12%)
Not Implemented:   2  (5%)

🔴 CRITICAL ISSUES (must fix):
1. Wild Card bloodline not implemented
2. Horse Whisperer trait not implemented
3. Lucky trait not implemented

🟡 DEVIATIONS (review with product):
1. Burst speed bonus: 25% vs PRD 20%
2. Royal Line gold bonus: 8% vs PRD 10%
3. Preparation phase: 25s vs PRD 30s
4. Horse price range expanded
5. Max bet increased to 150g

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## File References

When deviations found, provides exact file locations:
```
⚠️ Burst speed modifier deviation
   PRD Section: 4.2 Strategy Effects
   Code Location: game/simulation/RaceSimulator.ts:156

   PRD Value: 1.20 (20% boost)
   Code Value: 1.25 (25% boost)

   Suggested Fix:
   - const BURST_SPEED_MULTIPLIER = 1.20;  // Was 1.25
```

## Implementation

The skill will:
1. Parse PRD document for specifications
2. Scan codebase for implementation
3. Extract constants and formulas from code
4. Compare values against PRD specs
5. Identify deviations and missing features
6. Generate detailed compliance report
7. Provide file locations for fixes
8. Track compliance over time
