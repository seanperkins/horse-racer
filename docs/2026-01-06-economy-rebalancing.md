# Economy Rebalancing Plan

Based on simulation results from `scripts/economy-simulation.ts`.

**Key Change:** Renaming "Prestige" → "Reputation" for better thematic fit.

---

## Problems Identified

### Current Economy Issues

| Issue | Impact |
|-------|--------|
| Betting drains gold with no return | Players can't afford to bet after a few rounds |
| Poor racers get 0 prestige | No gold to bet = no prestige = stuck at 1 horse |
| Catch-up mechanic not implemented | Heart loss → prestige was planned but not coded |
| 92% elimination rate for average players | Economy is too punishing |
| Prestige has only one use | Stable expansion is the only sink |

### Simulation Data (10 rounds, 1000 iterations)

**Current System - Gold:**
- Top racer: ~40g earned, ~50g spent (net -10g)
- Average racer: ~16g earned, ~27g spent (net -10g)
- Poor racer: ~4g earned, ~14g spent (net -10g)

**Current System - Prestige:**
- Top with 2g bets: ~5 prestige
- Average with 2g bets: ~2.5 prestige
- Poor with 2g bets: ~0.8 prestige
- Required for full stable: 5 prestige (2+3)

---

## Approved Changes

### 1. Free Universal Betting

**Change:** Everyone gets one free bet per race. No gold involved.

**How it works:**
- Each player makes exactly one bet per race (mandatory/encouraged)
- Choose bet type (determines difficulty and reward)
- Pick your target horse(s)
- Win = earn reputation based on bet type
- Lose = nothing happens (no penalty)

**Bet Types:**

| Bet Type | What You Pick | Difficulty | Reputation |
|----------|---------------|------------|------------|
| **Place** | 1 horse to finish top 3 | Easy | 1 |
| **Win** | 1 horse to finish 1st | Medium | 3 |
| **Exacta** | 1st AND 2nd place (in order) | Hard | 5 |

**Rules:**
- Cannot bet on your own horse (no free reputation)
- Skip betting = no reputation gained (but no penalty)
- One bet per race, choose wisely

**Rationale:**
- Zero gold cost = everyone participates
- Simple choice: safe bet (Place) vs risky bet (Win/Exacta)
- Rewards game knowledge and prediction skill
- Creates engagement during every race

### 2. Reputation from Racing

**Change:** Top 3 finishers earn reputation from racing.

| Position | Reputation |
|----------|------------|
| 1st | 1 |
| 2nd | 1 |
| 3rd | 1 |
| 4th-8th | 0 |

**Rationale:**
- Racing becomes a reputation source (not just gold)
- Reduces dependence on betting for reputation
- Top players can progress without betting
- Combined with catch-up, creates balanced economy

### 3. Catch-Up Mechanic (Enhanced)

**Change:** +2 reputation per heart lost (doubled from original design)

**Applied in results phase.**

**Impact:**
- Poor racers losing 2 hearts/round = 4 reputation/round
- Creates *stronger* catch-up that exceeds top racers
- Losing players can still progress and compete

### 3a. Progressive Heart Damage (V8 Curve)

**Change:** Heart damage ramps up gradually, then accelerates in endgame to eliminate most players by round 10.

| Round | 8th Place | 7th Place | 6th Place | 1st-5th |
|-------|-----------|-----------|-----------|---------|
| 1-3 | 0 | 0 | 0 | 0 |
| 4-6 | 1 | 0 | 0 | 0 |
| 7-8 | 2 | 1 | 0 | 0 |
| 9-10 | 2 | 1 | 1 | 0 |

**Target game length:** 8-10 rounds

**Survival rates by game length:**

| Position | 8 Rounds | 10 Rounds |
|----------|----------|-----------|
| 1st-5th | 100% | 100% |
| 6th | 100% | 100% |
| 7th | 93% | 30% |
| 8th | 0% | 0% |

**Rationale:**
- 3-round grace period for early strategy adjustments
- Dead last starts taking light damage in round 4
- 7th place joins in round 7 (mid-game pressure)
- Rounds 9-10 add 6th place to damage (endgame acceleration)
- 8-round games: Most survive except dead-last
- 10-round games: More eliminations, higher tension

### 3b. Win Conditions

**Primary win condition:** Last player standing (all others eliminated)

**Secondary win condition (if multiple survive to round 10):**
- Winner = highest **Total Score**
- **Total Score = Gold Earned + Reputation Earned**

**Example scoring at end of 10-round game:**

| Player | Gold Earned | Rep Earned | Total Score |
|--------|-------------|------------|-------------|
| Top Racer | ~40g | ~16 rep | **56** |
| Average | ~20g | ~7 rep | **27** |
| 6th Place | ~10g | ~7 rep | **17** |

**Rationale:**
- Rewards both racing performance (gold) and strategic play (reputation)
- Top racers who dominated races have an advantage
- But underdogs who survived and bet well can compete
- Creates tension even when elimination seems unlikely

### 4. Reduced Stable Costs

| Slot | Old Cost | New Cost |
|------|----------|----------|
| 2nd | 2 reputation | 1 reputation |
| 3rd | 3 reputation | 2 reputation |
| Total | 5 reputation | 3 reputation |

**Rationale:**
- 2nd slot achievable by round 2-3 for most players
- 3rd slot achievable by round 5-6 for engaged players

### 5. New Reputation Sinks

#### 5a. Premium Training
Bypass stat potential limits with reputation.

| Action | Cost |
|--------|------|
| Train stat 1 point beyond potential | 1 reputation |

**Rules:**
- Can exceed potential by up to 2 points per stat
- Still capped at 10 (absolute max)
- Creates late-game reputation use

#### 5b. Jockey Upgrades
Jockeys can be upgraded using reputation (not gold).

| Upgrade | Cost | Effect |
|---------|------|--------|
| Skill +1 | 1 reputation | +1 to skill stat |
| Timing +1 | 1 reputation | +1 to timing stat |
| Weight +1 | 1 reputation | +1 to weight stat |

**Rules:**
- Each jockey stat capped at 10
- Creates meaningful attachment to jockeys
- Incentivizes keeping/upgrading vs replacing

#### 5c. Equipment Fusion
Combine 2 equipment of same slot → upgraded version.

| Action | Cost |
|--------|------|
| Fuse 2 equipment | 2 reputation + both items |

**Result:** New equipment with combined/enhanced stats.

**Example:**
- Light Saddle (Speed +1) + Racing Saddle (Speed +1)
- → Champion Saddle (Speed +3, Stamina +1)

#### 5d. Legendary Shop Items
Premium items that cost reputation, not gold.

| Item Type | Reputation Cost | Effect |
|-----------|-----------------|--------|
| Legendary Horse | 3 reputation | Tier 4 horse with exceptional stats |
| Legendary Equipment | 2 reputation | Quality 4 equipment |
| Star Jockey | 2 reputation | High-tier jockey with boosted stats |

**Availability:**
- Appear randomly in shop (10% chance per reroll)
- Cannot be purchased with gold
- Creates late-game reputation demand

---

## Economy Balance Reference (Updated)

### Reputation Earning
| Source | Amount |
|--------|--------|
| 1st-3rd place finish | 1 reputation |
| Winning Place bet | 1 reputation |
| Winning Win bet | 3 reputation |
| Winning Exacta bet | 5 reputation |
| Losing heart | **2 reputation per heart** |

### Reputation Spending
| Action | Cost |
|--------|------|
| Slot 1 → 2 | 1 reputation |
| Slot 2 → 3 | 2 reputation |
| Premium training | 1 reputation per point |
| Jockey upgrade | 1 reputation per stat point |
| Equipment fusion | 2 reputation |
| Legendary items | 2-3 reputation |

### Expected Reputation (V8 Simulation)

**10-round game:**

| Player Type | Survival | Racing | Betting | Catch-up | Total |
|-------------|----------|--------|---------|----------|-------|
| Top | 100% | 10 | 5.7 | 0 | **~15.7** |
| Average | 100% | 2.5 | 3.7 | 1.0 | **~7.2** |
| Below Avg (6th) | 100% | 0 | 2.7 | 4.0 | **~6.6** |
| Poor (7th) | 30% | 0 | 2.5 | 9.4 | **~12.0** |
| Dead Last (8th) | 0% | 0 | 1.8 | 10 | **~11.8** |

**8-round game:**

| Player Type | Survival | Racing | Betting | Catch-up | Total |
|-------------|----------|--------|---------|----------|-------|
| Top | 100% | 8.0 | 4.3 | 0 | **~12.3** |
| Average | 100% | 2.0 | 3.0 | 0 | **~5.0** |
| Below Avg (6th) | 100% | 0 | 2.1 | 1.3 | **~3.4** |
| Poor (7th) | 93% | 0 | 2.2 | 5.5 | **~7.6** |
| Dead Last (8th) | 0% | 0 | 1.8 | 10 | **~11.8** |

**Result:** Shorter games (8 rounds) are more forgiving - most players survive. Longer games (10 rounds) have endgame acceleration that eliminates more players. All eliminated players earn enough reputation for full stable + upgrades before dying.

---

## Implementation Priority

### Phase 1: Core Fixes (High Priority)
1. Rename prestige → reputation (types, store, UI, server)
2. Virtual stakes betting (no gold cost)
3. Reputation from racing placements (+1 for top 3)
4. Catch-up mechanic (heart loss → +2 reputation)
5. Progressive heart damage (V8 curve - see section 3a)
6. Reduce stable expansion costs (1+2=3)
7. Remove jockey upkeep costs
8. Win condition: last standing OR highest (gold + reputation) at round 10

### Phase 2: Reputation Sinks (Medium Priority)
9. Premium training beyond potential
10. Jockey stat upgrades

### Phase 3: Advanced Features (Lower Priority)
11. Equipment fusion
12. Legendary shop items

---

## Files to Modify

**Server:**
- `server/GameRoom.ts` - betting logic, prestige awards, stable costs

**Client:**
- `components/game/BettingPhase.tsx` - virtual stakes UI
- `components/game/ResultsPhase.tsx` - show prestige sources
- `components/game/ShopPhase.tsx` - jockey upgrades, legendary items

**Types:**
- `types/messages.ts` - update bet result messages

---

## Testing Checklist

- [ ] Rename: all prestige → reputation in code
- [ ] Virtual betting: no gold deducted, reputation awarded on win
- [ ] Racing reputation: top 3 get 1 reputation each
- [ ] Catch-up: heart loss grants 2 reputation per heart
- [ ] Progressive heart damage: V8 curve (R1-3=0, R4-6=8th, R7-8=7th+8th, R9-10=6th+)
- [ ] Stable costs: 1 + 2 = 3 total
- [ ] Jockey upkeep removed (free to maintain)
- [ ] Win condition: last standing wins, OR highest (gold + rep) at round 10
- [ ] Premium training: works beyond potential
- [ ] Jockey upgrades: stat increases correctly
- [ ] Economy simulation passes new scenarios
