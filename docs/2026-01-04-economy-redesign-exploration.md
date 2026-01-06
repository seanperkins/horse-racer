# Economy Redesign Exploration

## Overview

This document explores adding a second currency and participation requirements to create more meaningful decisions and catch-up mechanics.

---

## Two-Currency System

### Gold (existing)
- **Earned from:** Race placements (1-5g), selling items (50% value)
- **Spent on:** Shop purchases, training, rerolls, jockey upkeep
- **Purpose:** Short-term tactical decisions

### Stars (new)
- **Earned from:** Betting wins, losing hearts (catch-up)
- **Spent on:** Stable expansion, combining items, breeding horses
- **Purpose:** Long-term strategic progression

---

## Betting Changes

### Current System
- Win bet: gold × odds (2-8x)
- Place bet: gold × odds (1.5-3x)
- Exacta bet: gold × odds (up to 10x)

### Proposed System
Betting wins pay **Stars instead of gold**.

| Bet Type | Star Payout |
|----------|-------------|
| Win | 1 Star per 2-3 gold wagered |
| Place | 1 Star per 2-3 gold wagered |
| Exacta | 1 Star per 2-3 gold wagered |

**Example:** 6 gold bet on Win, horse wins → 2-3 Stars earned (gold is lost either way)

**Implications:**
- Betting becomes a gold → Stars conversion mechanism
- Higher bets = more potential Stars, but more gold at risk
- Forces choice: save gold for shop OR gamble for Stars
- Losing a bet = lose gold, gain nothing

---

## Stable Slot System

### Starting State
- Players begin with **1 horse slot** (down from unlimited)
- Cannot hold more horses than slots allow
- First horse is given free (or bought round 1)

### Expansion Costs (needs tuning)

| Slot | Cost | Cumulative | Bloodline Breakpoint |
|------|------|------------|---------------------|
| 1 | Free | - | None possible |
| 2 | 2 Stars | 2 Stars | 2+ synergies unlock |
| 3 | 3 Stars | 5 Stars | 3+ synergies unlock |

**Cap:** Maximum 3 horses

**Strategic implications:**
- Round 1: Everyone racing with 1 horse, no synergies
- Early expansion: Prioritize 2nd slot to unlock 2+ bloodline bonuses
- Late expansion: 3rd slot enables 3+ bonuses but costs more

---

## Catch-Up Mechanic

### Heart Loss = Star Gain

Whenever a player loses a heart (from bad race placement), they gain 1 Star.

**Rationale:**
- Losing players naturally accumulate Stars
- Enables stable expansion even when racing poorly
- Creates comeback potential: "I'm behind in hearts but ahead in Stars"
- Prevents death spiral where losers can never improve

**Balance considerations:**
- Early rounds: Positions 6-8 lose hearts → gain Stars
- Late rounds: Positions 4-8 lose hearts → more Stars flowing
- Eliminated players stop earning (already out)

---

## Participation Requirement

### Must Race or Lose Heart

If a player does not submit a race entry during Preparation phase, they lose 1 heart when the race concludes.

**No exceptions:**
- No horse? Lose heart (should have bought one)
- No jockey? Lose heart (should have hired one)
- Forgot? Lose heart (pay attention)

**Implications:**
- Prevents passive betting-only strategies
- Forces engagement with racing system
- Creates pressure to maintain raceable state
- Star catch-up still applies (lose heart → gain Star)

**Edge case:** If participation penalty causes heart loss, player still gains 1 Star from catch-up mechanic.

---

## Race Entry Fee (Exploration)

### Option A: No Entry Fee
Keep current system where racing is free. Gold pressure comes from shop/training.

### Option B: Fixed Entry Fee (2g)
- Creates additional gold drain
- Makes "should I race?" a real question (if we remove heart penalty for non-participation)
- Conflicts with heart penalty idea (double punishment)

### Option C: Entry Fee in Stars
- Separates economies further
- Could require 1 Star to enter (after first few rounds)
- Creates tension: expand stable OR keep racing

### Recommendation
**Start without entry fee.** The heart penalty for non-participation already creates pressure. Adding gold cost might over-constrain economy. Can add later if needed.

---

## Future Currency Sinks

Once stable expansion is implemented, Stars need additional uses:

### Equipment Combining
Merge 2 equipment of same slot → upgraded version
- Cost: 2 Stars + both items consumed
- Result: Combined stats or special effect

### Horse Breeding
Combine 2 horses → offspring with mixed traits
- Cost: 3-5 Stars + both horses consumed
- Result: New horse with inherited bloodline, blended stats, potential for rare abilities

### Training Boost
Bypass stat potential limits temporarily
- Cost: 1 Star per training point beyond potential
- Risk: Horse could "burn out" (stat regression?)

---

## Open Questions

1. **Star earning rate:** Is 1 Star per 2-3 gold bet the right ratio? Need playtesting.

2. **First stable expansion timing:** How quickly should players reach 2 horses?
   - Too fast: 1-slot start feels pointless
   - Too slow: Players stuck without synergies too long

3. **Betting without gold:** What if a player has 0 gold? Can they still bet for Stars? (Currently no, betting requires gold stake)

4. **Sell horses for Stars?** Could selling a horse give Stars instead of gold, providing another conversion path.

5. **Star inflation late game:** Once stable is maxed (3 slots), what do Stars do? Need end-game sinks.

---

## Implementation Phases

### Phase 1: Core Currency
- Add Stars to player state
- Modify betting to award Stars instead of gold
- Add heart loss → Star gain catch-up
- UI to display Stars

### Phase 2: Stable Slots
- Add stable capacity (default 1)
- Add expansion purchase mechanic
- Enforce slot limits in shop/inventory
- UI for stable management

### Phase 3: Participation Penalty
- Track whether player submitted race entry
- Apply heart penalty for non-participants
- Clear messaging about requirement

### Phase 4: Advanced Features
- Equipment combining
- Horse breeding
- Additional Star sinks

---

## Summary

| Change | Purpose |
|--------|---------|
| Stars currency | Long-term progression, separate from gold |
| Betting → Stars | Makes betting strategic, not just income |
| Start with 1 slot | Creates early-game progression goal |
| Lose heart = gain Star | Catch-up mechanic prevents death spiral |
| Must race or lose heart | Forces participation, prevents passive play |
| Cap at 3 horses | Keeps decisions meaningful, prevents hoarding |
