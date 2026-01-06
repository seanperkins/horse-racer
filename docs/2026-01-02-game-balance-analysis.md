# Game Balance & Fun Factor Analysis
**Date:** January 2026
**Purpose:** Deep analysis of game systems to identify fun-killing issues and opportunities

---

## Executive Summary

After analyzing the PRD, implementation code, and proposed bonding/progression systems, I've identified **5 critical balance issues** that could undermine fun, **3 major opportunities** to increase strategic depth, and **2 systemic risks** that need addressing.

**Most Critical Issue:** The interaction between multiple progression systems (training + bonding + jockey XP + bloodlines) creates exponential power growth that will cause early-game leaders to become unbeatable, eliminating comeback potential—the opposite of what makes autobattlers engaging.

**New Insight (from simulations):** Even after multiple rebalances, **Speed and Skill remain dominant** in 1v1 simulations. This indicates a structural issue: raw speed scales linearly while stamina and grit only apply conditionally. To make "most stat approaches valid," speed must carry a **cost** (burn), and stamina must **directly shape speed** before exhaustion, not just after.

---

## Recent Simulation Findings (Baseline Model Tests)
**Setup:** 1v1 races, baseline stats 6/6/6/6, steady/push/sprint strategy, no equipment, surfaces dry/wet/sand/rocky, distances 4f/10f, 500 races per scenario.

**Latest overall results:**
- Speed +1: 100% win rate (still dominant)
- Skill +1: 94.5% win rate
- Weight -1: 75.1% win rate
- Stamina +1: 56.3% win rate
- Grit +1: 60.0% win rate (mostly from wet/muddy benefit)
- Temper -1: ~49% win rate (nearly neutral)

**Conclusion:** The current model still produces a solved meta: prioritize speed and skill, then weight. To get diverse viable builds, speed must be constrained by burn and stamina must control speed earlier and harder.

---

## Part 1: Critical Balance Issues

### 🚨 Issue #1: Exponential Power Creep (HIGHEST PRIORITY)

**The Problem:**
Currently, a player who finds success early will compound advantages across FOUR different progression systems:

1. **Horse Training:** +2-5 gold per stat point → ~+8-12 total stats possible
2. **Jockey Bonding:** Up to +2 Timing, +1 Skill, -5% stamina burn, +5% consistency
3. **Jockey XP Progression:** Up to +3 total stats by late game
4. **Bloodline Bonuses:** +1-3 stats depending on stable composition

**Example Scenario (Round 8):**
- **Player A** (found good pair Round 1):
  - Base horse: 22 stat points
  - Training: +8 stat points (invested 24 gold)
  - Jockey bonding Level 4: +2 Timing, +1 Skill (effective +3)
  - Jockey XP: +3 stats
  - Bloodline bonus: +2
  - **Total: 38 effective stat points**

- **Player B** (struggling, just got new horse Round 6):
  - Base horse: 24 stat points
  - Training: +2 stat points (only 6 gold)
  - Jockey bonding Level 0: +0
  - Jockey XP: +1 stat
  - No bloodline bonus
  - **Total: 27 effective stat points**

**Gap: 11 stat points (40% power difference)**

This is a **death spiral**. Player A wins → earns more gold → trains more → wins more → bond increases → wins even more. Player B can't catch up even with perfect decisions.

**Impact on Fun:**
- ❌ Eliminates comeback mechanics
- ❌ Makes rounds 5+ feel predetermined
- ❌ Punishes experimentation (swapping horses/jockeys loses bonding)
- ❌ Creates "solved meta" where early optimization is everything

**Proposed Solutions:**

**Option A: Soft Caps on Stacking Bonuses** (Recommended)
```
Total bonus cap = Base stat × 1.5 (50% increase maximum)

If bonuses would exceed cap:
  - Training bonuses: Applied first (permanent investment)
  - Bloodline bonuses: Applied second (build commitment)
  - Bonding bonuses: Applied third (loyalty reward)
  - XP bonuses: Applied last, only up to cap
```

This allows meaningful progression but prevents runaway snowballing.

**Option B: Catch-up Mechanics**
- Players in bottom 3 get +1 gold per round
- Players behind get 20% bonus to bonding XP gain
- Training costs reduced 1 gold for players with <2 hearts

**Option C: Diminishing Returns on All Progression**
```
First +3 stats: Full value
Stats 4-6: 75% effective
Stats 7-9: 50% effective
Stats 10+: 25% effective
```

**Recommendation:** Implement Option A + selective parts of Option B. This preserves the feel of progression while preventing snowballing.

---

### ⚠️ Issue #2: Speed/Weight Dominance Problem

**The Problem:**
Looking at the speed calculation in `stats.ts`, speed is still the primary driver of race outcome:

```typescript
const rawBaseSpeed = modifiedHorseStats.speed * 2.0 + weightFactor
```

Speed is multiplied by 2.0, making it the **dominant stat** in the game. Meanwhile:
- Stamina only matters if race is long enough
- Grit only matters on bad terrain (33% of tracks)
- Temper is actively bad (increases variance)

**Impact:**
- Speed-focused horses win ~90-100% of 1v1 races in baseline tests
- Stamina horses only viable on distance tracks (rounds 5-6)
- Grit horses only viable on cross-country (round 7+)
- **Optimal strategy:** Always buy highest speed, ignore everything else until late game

**Evidence from Simulations:**
- Speed +1 still wins 100% of 1v1 races even after multiple tuning passes.
- Skill +1 is >90% win rate, despite reduced efficiency.
- Grit is only strongly viable on wet/muddy tracks.

**Proposed Solutions:**

**Option A: Make Speed Costly (Burn Coupling)**
```typescript
speedRatio = speed / baseSpeed
burn = baseBurn * (1 + (speedRatio - 1) * 0.8)
```

**Option B: Stamina-Weighted Speed (Always On)**
```
staminaRatio = stamina / maxStamina
speed *= 0.6 + 0.4 * staminaRatio
```

**Option C: Reduce Raw Speed Scaling**
```
rawBaseSpeed = speed * 1.6 + stamina * 0.2 + grit * 0.1 + weightFactor
```

**Option D: Phase Speed Caps**
```
start cap: 1.15x base
mid cap: 1.20x base
finish cap: 1.25x base
```

**Option E: Make Grit Affect Positioning**
Grit could provide "draft resistance" - horses with high Grit maintain position better in pack:
```
Position loss per tick when boxed in = 1.0 - (Grit × 0.05)
```

This makes Grit useful on ALL tracks, not just bad terrain.

**Recommendation:** Implement A + B + C, and add D if speed remains dominant. Speed should be important but not overwhelming.

---

### ⚠️ Issue #3: Jockey Skill Is Unclear and Underpowered

**The Problem:**
The PRD says Skill affects:
1. Obstacle efficiency (PRD 3.5.1) - but most tracks have no obstacles
2. Stumble recovery (PRD 3.5.2) - but stumbles are rare random events
3. Pathing bonus (PRD 3.5.3) - only +2% per skill point

Meanwhile, Timing affects:
- Stamina pool (+20% per point!)
- Burn rate (-2.5% per point)
- Strongly impacts finish strategy effectiveness

**Impact:**
- Timing is objectively better than Skill in 90% of scenarios
- Players will always prefer high Timing jockeys
- Skill feels like a "dump stat"
- The new note in PRD ("Skill represents stamina management") conflicts with Timing's role

**Proposed Solutions:**

**Option A: Make Skill Affect Speed Consistency**
```typescript
// Skill reduces the impact of variance
effectiveVariance = baseVariance * (1 - Skill × 0.08)
```

This makes Skill valuable for taming high-Temper horses. A skilled jockey can ride a chaotic horse successfully.

**Option B: Make Skill Affect Stamina Efficiency (Not Pool)**
```
Timing → Increases stamina pool (energy reserves)
Skill → Reduces stamina consumption (efficiency)

burnRate = baseBurn * (1 - Timing × 0.02) * (1 - Skill × 0.03)
```

Both stats become valuable but for different reasons.

**Option C: Make Skill Unlock Strategic Options**
```
Skill ≥ 7: Can use "Gamble" finish strategy without penalty
Skill ≥ 8: "React" mid strategy gains +5% speed
Skill ≥ 9: Can attempt risky overtake maneuvers
```

This makes Skill a gateway to advanced tactics.

**Recommendation:** Option A + Option B. Make Skill the "consistency and efficiency" stat while Timing is the "raw power" stat. Avoid direct speed scaling from Skill.

---

### ⚠️ Issue #4: Bonding System Creates "Lock-In" Penalty

**The Problem:**
The new bonding system requires 8+ races to reach Level 4. In a typical match:
- Round 1-2: Sprint (2 races)
- Round 3-4: Mixed (2 races)
- Round 5-6: Distance (2 races)
- Round 7+: Cross-Country (variable)

To reach Level 4 by Round 9, you must commit to ONE jockey-horse pair from Round 1 and NEVER switch. But:
- Different tracks favor different builds (speed vs stamina vs grit)
- Shop RNG might offer a clearly superior horse
- Opponent strategies might require counter-building

**Impact:**
- Bonding system PUNISHES adaptation and experimentation
- Optimal play becomes: Pick Round 1 pair, never deviate, ignore shop
- This is the opposite of what makes autobattlers fun (dynamic pivots, build flexibility)
- Players feel trapped by sunk cost fallacy

**Proposed Solutions:**

**Option A: Faster Bonding, Lower Caps**
```
Level 1: 1 race (+0.5 Timing)
Level 2: 2 races (+1 Timing, +0.5 Skill)
Level 3: 4 races (+1 Timing, +1 Skill, -3% stamina)
Level 4: 7 races (+2 Timing, +1 Skill, -5% stamina, +3% consistency)
```

Reaches Level 3 faster, but Level 4 still requires commitment. Early benefits make it feel good.

**Option B: Partial Bond Transfer**
```
When switching to new horse, retain 50% of bonding level with new jockey
When switching to new jockey, retain 50% of bonding level with new horse

Example:
- Old pair: Level 3 bonding
- Swap horse, keep jockey → Start at Level 1.5 (rounds up to 2)
- Swap jockey, keep horse → Start at Level 1.5 (rounds up to 2)
- Swap both → Start at Level 0
```

This rewards loyalty but doesn't punish adaptation as harshly.

**Option C: Multiple Bond Tracks**
```
Each jockey can bond with up to 3 horses simultaneously
Bonding level tracked per pair
Racing with Jockey A + Horse B uses their specific bond level
```

This allows building multiple viable pairs for different track types.

**Recommendation:** Option B + Option C. Allow flexibility while still rewarding commitment.

---

### ⚠️ Issue #5: Jockey XP System Conflicts With Match Length

**The Problem:**
The XP system grants improvements at 3, 6, 10, 15 XP. Earning rates:
- Race completion: +1 XP
- Top 3 finish: +1 XP
- Win: +2 XP

Best case scenario (winning every race):
- Round 1: 4 XP (1 win)
- Round 2: 8 XP (2 wins)
- Round 3: 12 XP (3 wins)
- Round 4: 16 XP (4 wins)

Worst case (always 4th-8th):
- Round 1: 1 XP
- Round 2: 2 XP
- Round 3: 3 XP
- Round 8: 8 XP

**Impact:**
- Winners get +3 stats by Round 4
- Losers get +1 stat by Round 8
- This AMPLIFIES the snowball problem (Issue #1)
- Creates "rich get richer" dynamics that kill comebacks

**Proposed Solutions:**

**Option A: Flatten XP Curve**
```
All race completions: +2 XP (not +1)
Remove top 3 bonus
Remove win bonus

Result: Everyone progresses at same rate regardless of performance
```

**Option B: Reverse XP Scaling (Catch-Up Mechanic)**
```
Completion: +1 XP
Finish 6-8th: +1 bonus XP (struggling players)
Finish 4-5th: +0 bonus
Finish 1-3rd: -1 XP penalty (leading players)

Result: Trailing players level faster, creating natural catch-up
```

**Option C: Team XP Pool**
```
Instead of individual XP, jockeys share a stable-wide XP pool
All jockeys in stable benefit from races
Encourages roster depth instead of single-jockey spam
```

**Recommendation:** Option B. This creates natural rubber-banding without feeling artificial.

---

## Part 2: Strategic Depth Opportunities

### 💡 Opportunity #1: Strategy Complexity Is Too Shallow

**Current State:**
Strategy is a simple 3-phase choice (Start/Mid/Finish). After a few games, optimal patterns emerge:
- Sprint tracks: Burst/Push/Sprint
- Distance tracks: Hang Back/Conserve/Sprint
- Balanced: Steady/React/Maintain

**Enhancement Ideas:**

**A. Add Conditional Triggers**
```
Strategy presets could have conditions:
"If stamina > 60% AND position > 3rd → Sprint early"
"If position = 1st → Defensive (block overtakes)"
"If behind by 2+ lengths → Risky overtake attempt"
```

**B. Add Mid-Race Decisions**
```
At 40% and 70% completion, player chooses:
- Maintain pace (safe)
- Surge (+15% speed, +30% burn, 1 tick)
- Draft (position next to leader, -10% burn)
```

**C. Strategy Counters**
```
Front-Runner weak to: Closer strategy (+2 speed when behind)
Burst Start weak to: Draft strategy (conserve early, follow)
Conserve weak to: Aggressive push (build lead before final sprint)
```

This creates rock-paper-scissors dynamics.

---

### 💡 Opportunity #2: Terrain Is Underutilized

**Current State:**
Terrain is revealed in Prep phase, but only affects modifiers. There's no terrain-based tactics.

**Enhancement Ideas:**

**A. Terrain-Specific Strategy Options**
```
Wet/Muddy tracks:
  - "Mud specialist" strategy (Mudblood bonus, ignore -15% penalty)

Rocky tracks:
  - "Careful navigation" (avoid stumbles, -5% speed)
  - "Aggressive risk" (ignore stumbles, +5% speed, +stumble chance)

Sand tracks:
  - "Pace conservation" (reduce stamina drain 50%, -10% speed)
```

**B. Dynamic Terrain Changes Mid-Race**
```
10% chance weather changes during race:
  - Dry → Light Rain (turf bonus goes away)
  - Rain → Heavy Rain (-5% more speed penalty)

Forces adaptation, creates exciting moments
```

**C. Terrain Mastery Bonuses**
```
Track history: Horses that race on same terrain type gain:
  - 1st time: No bonus
  - 2nd time: +2% adaptation
  - 3rd+ time: +5% adaptation

Rewards specialization but doesn't punish generalists too hard
```

---

### 💡 Opportunity #3: Betting Is Isolated From Core Loop

**Current State:**
Betting is a parallel gold-generation system that doesn't interact with race performance or build decisions.

**Enhancement Ideas:**

**A. Confidence Betting**
```
Bet on your own horse = "Confidence bet"
  - If win: +3 gold (instead of normal payout)
  - If lose: -2 hearts penalty (high risk!)

Creates tension: Do you believe in your build?
```

**B. Exotic Bet Types**
```
- "First to finish line" (not final placement after ties)
- "Fastest final furlong" (best finish sprint)
- "Most consistent" (lowest variance)
- "Biggest comeback" (furthest from last → top 3)

Each rewards different build types
```

**C. Betting as Information**
```
See what opponents bet on:
  - If 4 players bet on Player X → They think X is strong
  - Adjust strategy accordingly

OR

Bluff betting:
  - Bet on weak opponent to make others avoid betting on them
  - Then your horse faces easier odds
```

---

## Part 3: Systemic Risks

### 🔴 Risk #1: Too Many Systems = Analysis Paralysis

**The Problem:**
Currently players must track:
1. Horse stats (4 stats × potential)
2. Jockey stats (3 stats)
3. Equipment (3 slots × effects)
4. Bloodline bonuses (6 types × 2 thresholds)
5. Training progression (cost curves)
6. Bonding levels (4 levels × bonuses)
7. Jockey XP (4 thresholds)
8. Strategy options (3 phases × 3 choices)
9. Terrain effects (6 types)
10. Betting odds

**In a 45-second shop phase, this is overwhelming.**

**Mitigation Strategies:**

**A. Progressive Tutorial Complexity**
```
Round 1-2: Only show horse stats, simple strategy presets
Round 3-4: Introduce equipment and bloodlines
Round 5+: Introduce bonding and XP systems
```

**B. Automated Recommendations**
```
Shop phase shows:
"🔥 Recommended: This horse synergizes with your bloodline"
"⚡ Best value: This jockey has high win% on next track"
"💡 Opportunity: Training this stat costs only 2 gold"
```

**C. Simplify UI/UX**
```
Instead of showing raw numbers:
  - Speed: ████████░░ (8/10)
  - With bonuses: ████████▓░ (8→9/10)

Color-coded:
  - Green: Stat will improve with bonuses
  - Red: Stat is weak for upcoming track
  - Yellow: Good value training target
```

---

### 🔴 Risk #2: RNG Variance Feels Bad

**The Problem:**
Temper creates ±40% variance in outcomes. This means:
- A perfectly built horse can lose to RNG
- A terrible horse can randomly win
- Skill expression gets masked by luck

**Impact:**
- Players feel cheated when RNG screws them
- "Just got unlucky" excuses mask actual mistakes
- Hard to learn because feedback is noisy

**But also:**
- Variance creates excitement and tension
- Upsets make races unpredictable
- Comeback wins feel amazing

**Balance Goal: Skill > Luck > Perfect Information**

**Proposed Solutions:**

**A. Show Variance Ranges in UI**
```
Horse preview shows:
"Expected finish time: 52-61 seconds (±8%)"

Player can see: "This horse is volatile, could boom or bust"
```

**B. Add Variance Smoothing**
```
Instead of one big RNG roll:
  - Roll 5 times during race
  - Average the results
  - Creates more consistent outcomes

Math: StdDev of average = σ/√n
  - Single roll: ±40% swing
  - 5 rolls averaged: ±18% swing
```

**C. Variance Preview System**
```
Before race, show "RNG preview":
  - Your horse rolled: 73% (slightly above average)
  - Opponent 1 rolled: 45% (unlucky)
  - Opponent 2 rolled: 91% (very lucky!)

Doesn't change outcome, but explains it
Players don't feel blindsided
```

**Recommendation:** Option B + Option C. Reduce feels-bad moments while keeping excitement.

---

## Part 4: Immediate Action Items

### Priority 1 (Must Fix Before Launch):
1. **Implement soft caps on stacking bonuses** (Issue #1)
   - Prevents death spirals
   - 2-3 hours implementation

2. **Rebalance speed with burn coupling + stamina-weighted speed** (Issue #2)
   - Makes all stats viable
   - 2-4 hours implementation + testing

3. **Add catch-up XP mechanics** (Issue #5)
   - Reduces snowballing
   - 1 hour implementation

### Priority 2 (Important for Fun):
4. **Clarify Skill stat role** (Issue #3)
   - Make it affect variance or efficiency
   - 2 hours implementation

5. **Reduce bonding lock-in penalty** (Issue #4)
   - Add partial transfer or faster early levels
   - 2 hours implementation

6. **Add variance smoothing** (Risk #2)
   - Average multiple RNG rolls
   - 1 hour implementation

### Priority 3 (Nice to Have):
7. **Add UI automation/recommendations** (Risk #1)
   - Shop phase hints
   - 4-6 hours implementation

8. **Add conditional strategy triggers** (Opportunity #1)
   - Deeper tactical play
   - 6-8 hours implementation

9. **Terrain-specific tactics** (Opportunity #2)
   - More variety across races
   - 3-4 hours implementation

---

## Part 5: Recommended Balance Changes (Concrete Numbers)

### Speed Calculation:
```typescript
// Proposed
const rawBaseSpeed =
  modifiedHorseStats.speed * 1.6 +
  modifiedHorseStats.stamina * 0.2 +
  modifiedHorseStats.grit * 0.1 +
  weightFactor

const baseSpeed =
  rawBaseSpeed > 22
    ? rawBaseSpeed * (1 - (rawBaseSpeed - 22) * 0.03)
    : rawBaseSpeed
```

### Burn Coupling + Stamina-Weighted Speed:
```typescript
const speedRatio = speed / baseSpeed
const burn = baseBurn * (1 + (speedRatio - 1) * 0.8)

const staminaRatio = stamina / maxStamina
speed *= 0.6 + 0.4 * staminaRatio
```

### Skill Effects:
```typescript
// Add to derived stats:
consistency.variance = consistency.variance * (1 - jockeySkill * 0.06)
burnRate = burnRate * (1 - jockeySkill * 0.025)
```

### Stat Stacking Caps:
```typescript
function applyStackingCaps(baseStat: number, totalBonuses: number): number {
  const maxBonus = baseStat * 0.5 // 50% cap
  return baseStat + Math.min(totalBonuses, maxBonus)
}
```

### Jockey XP Catch-Up:
```typescript
function calculateXPGain(finishPosition: number, totalRacers: number): number {
  const baseXP = 2 // Everyone gets 2

  if (finishPosition <= 3) return baseXP + 0  // Top 3: just base
  if (finishPosition <= 5) return baseXP + 1  // Middle: +1 bonus
  return baseXP + 2  // Bottom 3: +2 bonus (catch-up)
}
```

### Bonding Acceleration:
```typescript
const bondingThresholds = {
  level1: 1,  // 1 race (was 2)
  level2: 2,  // 2 races (was 4)
  level3: 4,  // 4 races (was 7)
  level4: 7,  // 7 races (was 8)
}

const bondingBonuses = {
  level1: { timing: 0.5, skill: 0 },
  level2: { timing: 1, skill: 0.5 },
  level3: { timing: 1.5, skill: 1, staminaBurn: 0.97 },
  level4: { timing: 2, skill: 1.5, staminaBurn: 0.95, consistency: 1.03 },
}
```

---

## Conclusion

The game has a strong foundation, but the interaction of multiple progression systems creates a **snowball problem** that will make matches feel decided by Round 4.

The three most important changes:
1. **Cap stacking bonuses at +50% base stat**
2. **Reverse jockey XP scaling to favor trailing players**
3. **Rebalance speed to make stamina/grit viable**

These changes preserve the feel of progression and build optimization while ensuring that comebacks remain possible and races stay competitive throughout the match.

**Estimated implementation time for Priority 1 changes: 6-8 hours**

**Impact: Transforms game from "early winner takes all" to "dynamic comebacks possible"**
