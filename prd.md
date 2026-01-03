# Neighs of Thunder

## Product Requirements Document

**Version:** 0.2  
**Last Updated:** January 2026  
**Status:** Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Game Loop](#2-core-game-loop)
3. [Stats System](#3-stats-system)
4. [Betting System](#4-betting-system)
5. [Training & Upgrades](#5-training--upgrades)
6. [Synergies & Bloodlines](#6-synergies--bloodlines)
   - [Jockey-Horse Bonding System](#64-jockey-horse-bonding-system)
   - [Jockey Progression System](#65-jockey-progression-system)
7. [Tracks & Terrain](#7-tracks--terrain)
8. [Equipment](#8-equipment)
9. [Race Strategy](#9-race-strategy)
10. [Economy](#10-economy)
11. [Progression & Unlocks](#11-progression--unlocks)
12. [Visual Style](#12-visual-style)
13. [Technical Architecture](#13-technical-architecture)
14. [Open Questions](#14-open-questions)

---

## 1. Overview

### 1.1 Concept

Thunder Hooves is a **browser-based multiplayer horse racing autobattler**. Players draft horses and jockeys, train their stable, place bets, and watch automated races unfold. The last player standing wins.

The game combines:

- **Autobattler mechanics** (drafting, synergies, economy management) from games like Super Auto Pets
- **Horse racing theming** with stats like Speed, Stamina, and Grit
- **Betting mechanics** that create alternative strategies and comeback potential
- **Pixel art visuals** in a side-scrolling Excite Bike-inspired style

### 1.2 Core Pillars

| Pillar                 | Description                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| **Accessible Depth**   | Easy to learn, rewarding to master. First game should be fun; 100th game should reveal new strategies. |
| **Social Spectacle**   | Races are entertaining to watch together. Betting creates shared tension.                              |
| **Meaningful Choices** | Every gold spent matters. Draft, train, bet, or save?                                                  |
| **Comical Charm**      | Light-hearted tone. Horses trip, jockeys fly off, absurd cosmetics.                                    |

### 1.3 Target Platform

- **Platform:** Web browser (desktop and mobile responsive)
- **Players:** 8 players per match
- **Session Length:** 12-18 minutes
- **Networking:** WebSocket-based synchronous multiplayer

---

## 2. Core Game Loop

### 2.1 Match Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         MATCH                                │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐                    │
│  │ Round 1 │ → │ Round 2 │ → │ Round 3 │ → ... → Winner     │
│  └─────────┘   └─────────┘   └─────────┘                    │
│                                                              │
│  Players start with: 10 Gold, 5 Hearts                       │
│  Elimination: 0 Hearts                                       │
│  Victory: Last player standing                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Round Phases

Each round consists of four phases:

#### Phase 1: Shop (45 seconds)

Players view and purchase from a randomized shop.

**Shop Contents:**

- 5 units (mix of horses and jockeys)
- 3 equipment items
- Training options for owned horses

**Actions Available:**

- Purchase units/equipment (variable gold cost)
- Sell units (50% refund)
- Reroll shop (2 gold)
- Purchase training for owned horses

#### Phase 2: Preparation (30 seconds)

Players configure their race entry.

**Actions Available:**

- Assign one jockey to one horse
- Equip items (one per slot)
- Set race strategy (Start / Mid / Finish)
- View track conditions
- View opponents' entries (public information)

#### Phase 3: Betting (20 seconds)

Players place optional bets on race outcome.

**Actions Available:**

- Place Win bet (pick the winner)
- Place Place bet (pick top 3 finisher)
- Place Exacta bet (pick 1st and 2nd in order)
- Bet for Gold or bet for Heart Recovery
- Skip betting (keep gold)

#### Phase 4: Race (20-30 seconds)

All 8 horses race simultaneously. Fully automated simulation.

**During Race:**

- Animated pixel-art race unfolds
- Commentary callouts for dramatic moments
- Real-time position tracking

**After Race:**

- Placements determined (1st through 8th)
- Gold rewards distributed
- Heart damage applied to bottom finishers
- Bet payouts processed
- Eliminated players announced

### 2.3 Round Timing Summary

| Phase     | Duration   | Key Decisions                      |
| --------- | ---------- | ---------------------------------- |
| Shop      | 45 sec     | Buy, sell, train, reroll           |
| Prep      | 30 sec     | Assign jockey, equip, set strategy |
| Betting   | 20 sec     | Risk gold for rewards              |
| Race      | 20-30 sec  | Watch and cheer                    |
| **Total** | **~2 min** |                                    |

---

## 3. Stats System

All stats use a **1-10 scale**. Horses and jockeys have stat budgets to ensure balance.

### 3.1 Horse Stats

| Stat        | Description             | Race Impact                                              |
| ----------- | ----------------------- | -------------------------------------------------------- |
| **Speed**   | Raw top-end pace        | Peak velocity under optimal conditions                   |
| **Stamina** | Energy pool size        | Duration before fatigue; longer races favor high Stamina |
| **Grit**    | Toughness, heart        | Reduces terrain penalties; improves stumble recovery     |
| **Temper**  | Disposition, volatility | Affects consistency; interacts with jockey Weight        |

**Stat Budget:** 20-30 total points across four stats

**Genetic Potential:** Each horse has a base stat and a maximum stat (potential). Training can increase stats up to the genetic potential ceiling.

Example:

```
Thunderbolt
├── Speed:   7 (base) → 9 (potential)
├── Stamina: 3 (base) → 5 (potential)
├── Grit:    4 (base) → 6 (potential)
└── Temper:  6 (base) → 8 (potential)

Base Total: 20 points
Max Total:  28 points (after full training)
```

### 3.2 Jockey Stats

| Stat       | Description       | Race Impact                                              |
| ---------- | ----------------- | -------------------------------------------------------- |
| **Skill**  | Technical ability | Cleaner navigation; better obstacle handling; efficiency |
| **Timing** | Pace judgment     | Optimizes stamina burn; improves surge effectiveness     |
| **Weight** | Physical mass     | Lower = speed bonus; Higher = settles volatile horses    |

**Stat Budget:** 12-22 total points across three stats

**Note:** The Skill stat represents a jockey's technical ability and stamina management during the race. Higher Skill means better stamina conservation, cleaner obstacle navigation, and more efficient overall race execution.

### 3.3 Derived Stats

Calculated from horse + jockey combination:

```
Base Speed     = Horse.Speed + (10 - Jockey.Weight) × 0.5
Stamina Pool   = Horse.Stamina × (1 + Jockey.Timing × 0.1)
Burn Rate      = Base cost per tick, reduced by Jockey.Timing
Terrain Mod    = Horse.Grit determines penalty reduction
Efficiency     = Jockey.Skill reduces wasted movement, improves jumps
Consistency    = f(Horse.Temper, Jockey.Weight) — see below
```

### 3.4 Consistency Formula

The Temper/Weight interaction determines race variance:

```
Temper Threshold = Jockey.Weight + 2

If Horse.Temper <= Temper Threshold:
    Consistency = HIGH (±5% variance)
Else:
    Variance = (Horse.Temper - Temper Threshold) × 8%
    Consistency = LOW (±Variance)
```

**Example:**

- Chaos Reign (Temper 10) + Feather Martinez (Weight 3)
- Threshold = 3 + 2 = 5
- Temper 10 > 5, so Variance = (10 - 5) × 8% = ±40%
- This horse could win by 10 lengths or finish last

### 3.5 Skill Stat Implementation

Jockey Skill affects:

1. **Obstacle Efficiency:** Each obstacle/jump has a base time cost. Skill reduces this.
   ```
   Actual Time Cost = Base Cost × (1 - Skill × 0.05)
   ```
2. **Stumble Recovery:** When a horse stumbles, recovery time is reduced by Skill.

   ```
   Recovery Time = Base Recovery × (1 - Skill × 0.08)
   ```

3. **Optimal Pathing:** Skill provides a small passive speed bonus representing better line choice.
   ```
   Pathing Bonus = Skill × 0.02 (added to effective speed)
   ```

---

## 4. Betting System

### 4.1 Overview

After preparation and before the race, players can bet leftover gold on race outcomes. Betting is optional but creates:

- Alternative strategies (budget horse + smart bets)
- Comeback mechanics (bet to recover hearts)
- Increased spectator tension
- Meaningful use of "leftover" gold

### 4.2 Bet Types

| Bet Type   | Description                 | Base Odds  | Payout  |
| ---------- | --------------------------- | ---------- | ------- |
| **Win**    | Pick the 1st place finisher | Variable\* | 2x-8x   |
| **Place**  | Pick a top 3 finisher       | Variable\* | 1.5x-3x |
| **Exacta** | Pick 1st AND 2nd in order   | Fixed      | 10x     |

\*Variable odds calculated from horse stats and public sentiment

### 4.3 Odds Calculation

Win bet odds are calculated based on the horse's effective power rating:

```
Power Rating = (Speed × 1.2) + Stamina + (Grit × Terrain Factor) - (Temper Variance)

Win Probability = Horse Power Rating / Sum of All Power Ratings

Payout Multiplier = 1 / Win Probability (capped at 8x)
```

**Example:**

- 8 horses racing, your pick has 20% calculated win chance
- Payout = 1 / 0.20 = 5x
- Bet 3 gold → Win 15 gold (12 profit)

### 4.4 Betting for Hearts

Players can make a special **Recovery Bet** to regain a lost heart:

**Requirements:**

- Must have fewer than 5 hearts
- Must bet minimum 5 gold
- Must correctly predict an Exacta (1st and 2nd in order)

**Outcome:**

- Correct: Regain 1 heart, lose the gold bet
- Incorrect: Lose the gold bet

This creates high-risk comeback potential for eliminated or near-eliminated players.

### 4.5 Betting Limits

| Constraint     | Value                                              |
| -------------- | -------------------------------------------------- |
| Minimum bet    | 1 gold                                             |
| Maximum bet    | 10 gold (or all remaining gold, whichever is less) |
| Bets per round | 1 bet total                                        |
| Cannot bet on  | Your own horse                                     |

---

## 5. Training & Upgrades

### 5.1 Overview

Horses can be trained between races to improve their stats, up to their **genetic potential**. This creates mid-game investment decisions.

### 5.2 Training Mechanics

**How Training Works:**

1. In the Shop phase, owned horses show available training options
2. Each stat point costs gold to train
3. Stats cannot exceed the horse's genetic potential
4. Training is permanent for the match duration

**Training Costs:**

| Current Stat | Cost to +1 |
| ------------ | ---------- |
| 1-3          | 2 gold     |
| 4-6          | 3 gold     |
| 7-8          | 4 gold     |
| 9            | 5 gold     |

### 5.3 Genetic Potential Display

Horse cards show both current and potential stats:

```
┌─────────────────────────────┐
│  THUNDERBOLT                │
│  ⚡ Sprinter                 │
│                             │
│  SPD: ████████░░  8/9       │
│  STA: ███░░░░░░░  3/5       │
│  GRT: ████░░░░░░  4/6       │
│  TMP: ██████░░░░  6/8       │
│                             │
│  Bloodline: Desert Wind     │
│  Cost: 4 gold               │
└─────────────────────────────┘

█ = Current stat
░ = Trainable (genetic potential)
```

### 5.4 Strategic Implications

**Early Game:**

- Buy budget horses, save gold for bets or rerolls
- Low investment, high flexibility

**Mid Game:**

- Commit to a horse, begin training
- Training 2-3 stat points significantly improves performance

**Late Game:**

- Fully trained horses compete
- Players who invested wisely have stronger entries
- Players who bet successfully may have caught up

---

## 6. Synergies & Bloodlines

### 6.1 Bloodline System

Every horse belongs to a **bloodline**. Owning multiple horses of the same bloodline grants bonuses to all horses of that bloodline.

**Important:** Only one horse races at a time, but bloodline bonuses apply based on total stable ownership.

### 6.2 Bloodline List

| Bloodline          | 2+ Bonus                               | 3+ Bonus                                |
| ------------------ | -------------------------------------- | --------------------------------------- |
| **Northern Storm** | +1 Grit to all Northern Storm horses   | +1 Stamina to racing horse              |
| **Desert Wind**    | +1 Speed on dry tracks                 | Ignore heat/sand penalties              |
| **Iron Heart**     | +1 Stamina                             | +2 Stamina to racing horse              |
| **Wild Card**      | Temper variance becomes favorable only | Can reroll Temper outcome once per race |
| **Mudblood**       | +2 Grit on wet tracks                  | Gain speed in mud (instead of penalty)  |
| **Royal Line**     | +1 to all stats of highest-tier horse  | Shop offers +1 Royal Line horse         |

### 6.3 Jockey Traits

Jockeys may have one **trait** that provides conditional bonuses:

| Trait               | Effect                                              |
| ------------------- | --------------------------------------------------- |
| **Mudder**          | +2 Grit bonus on wet/muddy tracks                   |
| **Closer**          | +2 Speed in final stretch when behind by 2+ lengths |
| **Front-Runner**    | +1 Speed while in 1st place                         |
| **Horse Whisperer** | -3 effective Temper (calms any horse)               |
| **Lightweight**     | -1 Weight (stacks with base Weight)                 |
| **Veteran**         | +2 Timing when Stamina below 30%                    |
| **Lucky**           | 15% chance to avoid any stumble                     |

### 6.4 Jockey-Horse Bonding System

Jockeys develop bonds with horses they race together. The more races a specific jockey-horse pair completes, the stronger their bond becomes, unlocking performance bonuses.

**Bond Levels:**

| Bond Level | Races Together | Bonus                                                      |
| ---------- | -------------- | ---------------------------------------------------------- |
| **Level 0** | 0 races       | No bonus (default)                                         |
| **Level 1** | 1-2 races     | +1 to Jockey's Timing with this horse                      |
| **Level 2** | 3-4 races     | +1 Timing, +0.5 effective Skill                            |
| **Level 3** | 5-7 races     | +1 Timing, +1 Skill, -5% Stamina burn                      |
| **Level 4** | 8+ races      | +2 Timing, +1 Skill, -5% Stamina burn, +5% consistency     |

**Implementation Notes:**

- Bonding is tracked per jockey-horse pair within a match (resets each new match)
- Bonuses apply cumulatively with base stats
- Bonding encourages committing to a stable rather than constantly rotating
- Visual indicator shows bond level on horse/jockey cards
- Bond level increases immediately after race completion, applying to the next race

**Strategic Implications:**

- **Early Investment:** Players who find a working jockey-horse pair early and stick with them gain increasing advantages
- **Loyalty Reward:** Punishes players who constantly swap units trying to "chase the meta"
- **Comeback Pressure:** Players behind must decide: stick with bonded pair or try new combinations
- **Synergy with Training:** Encourages investing training into horses you're bonding with

### 6.5 Jockey Progression System

Jockeys gain experience through use, improving their base stats over the course of a match. This rewards players for investing in and retaining jockeys rather than constantly replacing them.

**Experience Gain:**

- **Per Race Completion:** +1 XP
- **Top 3 Finish:** +1 bonus XP
- **Win:** +2 bonus XP

**Stat Improvements:**

| Total XP | Improvement                                                |
| -------- | ---------------------------------------------------------- |
| 3 XP     | +1 to lowest stat (Skill, Timing, or Weight reduction)     |
| 6 XP     | +1 to second-lowest stat                                   |
| 10 XP    | +1 to highest stat                                         |
| 15 XP    | +1 to any stat of player's choice                          |

**Implementation Notes:**

- XP resets each match (like all progression)
- Stat improvements are temporary for the match duration
- Players see progress bar showing XP toward next improvement
- Improvements apply immediately after the race where XP threshold is reached
- Weight "improvement" means -1 Weight (lighter is better for speed)

**Balancing Considerations:**

- Early jockeys (hired in rounds 1-3) have more time to gain improvements
- Late-game jockey purchases are still viable but lack progression bonus
- Maximum theoretical improvement: ~+3 total stats by final rounds (requires consistent racing)
- Creates tension: sell experienced jockey for gold, or keep the stat bonuses?

**Interaction with Bonding:**

- Jockey progression and bonding stack multiplicatively
- A Level 4 bonded jockey with +3 progression stats becomes significantly powerful
- Encourages finding "your jockey" early and building around them

---

## 7. Tracks & Terrain

### 7.1 Track Rotation

Track conditions are **randomized each round** within a category. The category follows a set rotation:

| Rounds | Category      | Characteristics                |
| ------ | ------------- | ------------------------------ |
| 1-2    | Sprint        | Short distance, Speed favored  |
| 3-4    | Mixed         | Medium distance, balanced      |
| 5-6    | Distance      | Long distance, Stamina favored |
| 7+     | Cross-Country | Obstacles, Grit favored        |

### 7.2 Track Categories

#### Sprint Tracks (4-6 furlongs)

- Favor high Speed, low Stamina requirements
- Explosive starts matter
- Little time to recover from poor position
- Example: _Dusty Dash_, _Lightning Lane_

#### Distance Tracks (10-14 furlongs)

- Favor high Stamina; Speed matters less
- Timing stat crucial for pace management
- Comeback strategies viable
- Example: _Endurance Oval_, _Marathon Meadow_

#### Cross-Country Tracks (Variable)

- Multiple terrain types in one race
- Jumps, water, mud, rough patches
- Grit is primary stat; Skill helps with obstacles
- High variance; upsets common
- Example: _Chaos Canyon_, _Wilderness Run_

### 7.3 Surface Conditions

Each track has a surface condition (randomized):

| Surface          | Effect                                  | Counter Stat |
| ---------------- | --------------------------------------- | ------------ |
| **Dry Dirt**     | Baseline; no modifiers                  | —            |
| **Wet/Muddy**    | -15% Speed; +20% Stamina drain          | High Grit    |
| **Turf (Grass)** | +5% Speed; rewards low Temper           | Low Temper   |
| **Rocky**        | Random stumble chance (10% per segment) | High Skill   |
| **Sand**         | +30% Stamina drain                      | High Stamina |
| **Frozen**       | -10% Speed; stumble on sharp turns      | High Grit    |

### 7.4 Track Reveal

Track conditions are revealed at the **start of the Preparation phase**, giving players time to:

- Swap equipment
- Adjust strategy
- Choose a different horse (if they have options)

---

## 8. Equipment

### 8.1 Equipment Slots

Each horse has three equipment slots:

| Slot           | Affects                       |
| -------------- | ----------------------------- |
| **Saddle**     | Stamina, jockey effectiveness |
| **Horseshoes** | Speed, terrain handling       |
| **Blinders**   | Temper, focus                 |

### 8.2 Equipment List

#### Saddles

| Item                 | Effect                | Cost   |
| -------------------- | --------------------- | ------ |
| Racing Saddle        | +1 Speed, -1 Stamina  | 2 gold |
| Endurance Saddle     | +2 Stamina            | 3 gold |
| Balanced Saddle      | +1 Stamina, +1 Timing | 3 gold |
| Featherweight Saddle | Jockey Weight -2      | 4 gold |

#### Horseshoes

| Item            | Effect                     | Cost   |
| --------------- | -------------------------- | ------ |
| Speed Shoes     | +1 Speed                   | 2 gold |
| Mud Cleats      | Ignore wet terrain penalty | 3 gold |
| Grip Shoes      | +2 Grit                    | 3 gold |
| Lucky Horseshoe | 20% stumble avoidance      | 4 gold |

#### Blinders

| Item                | Effect                 | Cost   |
| ------------------- | ---------------------- | ------ |
| Calming Blinders    | -2 Temper              | 2 gold |
| Focus Blinders      | +1 Jockey Skill        | 3 gold |
| Tunnel Vision       | -3 Temper, -1 Grit     | 3 gold |
| Champion's Blinders | +1 Speed when in top 3 | 4 gold |

---

## 9. Race Strategy

### 9.1 Strategy System

Before each race, players set a **three-part strategy** that influences how the race simulation unfolds.

### 9.2 Strategy Phases

#### Start Phase (First 20% of race)

| Option        | Effect                                                            |
| ------------- | ----------------------------------------------------------------- |
| **Burst**     | +30% Speed, +50% Stamina burn. Attempt to take early lead.        |
| **Steady**    | Normal pace. Balanced approach.                                   |
| **Hang Back** | -20% Speed, -30% Stamina burn. Draft behind leaders, save energy. |

#### Mid Phase (Middle 60% of race)

| Option       | Effect                                                  |
| ------------ | ------------------------------------------------------- |
| **Push**     | +15% Speed, +25% Stamina burn. Maintain pressure.       |
| **Conserve** | -10% Speed, -40% Stamina burn. Save for finish.         |
| **React**    | Match leader's pace automatically. Stamina burn varies. |

#### Finish Phase (Final 20% of race)

| Option       | Effect                                                              |
| ------------ | ------------------------------------------------------------------- |
| **Sprint**   | Burn all remaining Stamina for maximum Speed boost.                 |
| **Maintain** | Steady pace to finish line. Safe option.                            |
| **Gamble**   | High variance push. Temper-influenced outcome. Big win or big loss. |

### 9.3 Strategy Presets

For new players, offer preset strategies:

| Preset           | Start     | Mid      | Finish   | Best For                |
| ---------------- | --------- | -------- | -------- | ----------------------- |
| **Front-Runner** | Burst     | Push     | Maintain | High Speed, low Stamina |
| **Closer**       | Hang Back | Conserve | Sprint   | High Stamina, low Speed |
| **Steady**       | Steady    | React    | Maintain | Balanced horses         |
| **Chaos**        | Burst     | Push     | Gamble   | High Temper horses      |

---

## 10. Economy

### 10.1 Starting Resources

| Resource | Starting Amount |
| -------- | --------------- |
| Gold     | 10              |
| Hearts   | 5               |

### 10.2 Gold Income

#### Race Placement Rewards

| Placement | Gold Reward |
| --------- | ----------- |
| 1st       | 5 gold      |
| 2nd       | 4 gold      |
| 3rd       | 3 gold      |
| 4th       | 2 gold      |
| 5th       | 2 gold      |
| 6th       | 1 gold      |
| 7th       | 1 gold      |
| 8th       | 1 gold      |

#### Other Income

| Source                | Amount                            |
| --------------------- | --------------------------------- |
| Base income per round | 3 gold                            |
| Win streak bonus (2+) | +1 gold per streak count (max +3) |
| Betting wins          | Variable (see Betting section)    |
| Selling units         | 50% of purchase price             |

### 10.3 Gold Costs

| Action                    | Cost                            |
| ------------------------- | ------------------------------- |
| Reroll shop               | 2 gold                          |
| Tier 1 horse              | 2-3 gold                        |
| Tier 2 horse              | 3-4 gold                        |
| Tier 3 horse              | 4-5 gold                        |
| Tier 4 horse              | 5-6 gold                        |
| Jockeys                   | 2-4 gold                        |
| Equipment                 | 2-4 gold                        |
| Training (per stat point) | 2-5 gold (see Training section) |

### 10.4 Heart Damage

| Placement | Hearts Lost |
| --------- | ----------- |
| 1st-4th   | 0           |
| 5th       | 0           |
| 6th       | 1           |
| 7th       | 1           |
| 8th       | 2           |

**Late Game Scaling (Round 5+):**

| Placement | Hearts Lost |
| --------- | ----------- |
| 1st-3rd   | 0           |
| 4th-5th   | 1           |
| 6th       | 2           |
| 7th       | 2           |
| 8th       | 3           |

---

## 11. Progression & Unlocks

### 11.1 In-Match Tier Progression

Higher tier units unlock as rounds progress:

| Round | Available Tiers | Pool Composition               |
| ----- | --------------- | ------------------------------ |
| 1     | Tier 1 only     | 100% T1                        |
| 2     | Tier 1-2        | 70% T1, 30% T2                 |
| 3-4   | Tier 1-3        | 40% T1, 40% T2, 20% T3         |
| 5-6   | Tier 1-4        | 20% T1, 30% T2, 30% T3, 20% T4 |
| 7+    | All tiers       | 10% T1, 25% T2, 35% T3, 30% T4 |

### 11.2 Tier Characteristics

| Tier       | Stat Budget  | Special Features                          |
| ---------- | ------------ | ----------------------------------------- |
| **Tier 1** | 20-22 points | Basic stat distributions, no abilities    |
| **Tier 2** | 22-25 points | Specialist distributions, bloodline focus |
| **Tier 3** | 24-27 points | Unique passive abilities                  |
| **Tier 4** | 26-30 points | Powerful abilities, legendary horses      |

### 11.3 Meta-Progression (Account Level)

Players earn XP from matches to unlock:

- Cosmetic horse skins
- Cosmetic jockey outfits
- Track themes
- Emotes and reactions
- Profile badges

**No gameplay-affecting unlocks** — all horses and mechanics available to all players.

---

## 12. Visual Style

### 12.1 Art Direction

**Style:** Pixel art, 16-bit inspired

**Reference Games:**

- Excite Bike (NES) — side-scrolling race feel
- Super Auto Pets — charming character design
- Kingdom (Two Crowns) — atmospheric pixel environments

### 12.2 Visual Components

#### Race View

- Side-scrolling perspective
- 8 horizontal lanes (one per player)
- Parallax background layers (crowd, sky, terrain)
- Pixel dust/mud particles
- Exaggerated animations (bouncy gallops, dramatic falls)

#### UI Style

- Clean, readable pixel fonts
- Card-based shop interface
- Color-coded rarity (white/green/blue/purple for tiers)
- Animated gold coins and heart icons

#### Horse Designs

- Distinct silhouettes per bloodline
- Color variations within bloodlines
- Expressive faces (determined, nervous, wild)
- Equipment visibly renders on horse

#### Jockey Designs

- Varied body types (reflects Weight stat)
- Colorful racing silks
- Exaggerated poses during race

### 12.3 Animation Priorities

| Animation         | Priority | Notes                            |
| ----------------- | -------- | -------------------------------- |
| Gallop cycle      | High     | Core visual, needs polish        |
| Stumble/recovery  | High     | Comedy moment, must read clearly |
| Jockey fall       | High     | Signature comedy beat            |
| Jump/landing      | Medium   | For cross-country tracks         |
| Victory pose      | Medium   | End-of-race celebration          |
| Shop interactions | Low      | Functional, doesn't need flair   |

### 12.4 Audio Style

- Chiptune / synth soundtrack
- Satisfying UI sounds (coin clinks, card flips)
- Crowd cheers (8-bit style)
- Horse sound effects (hooves, whinnies)
- Commentary callouts (text + sound cue)

---

## 13. Technical Architecture

### 13.1 Platform Requirements

| Requirement        | Specification                                     |
| ------------------ | ------------------------------------------------- |
| Browser Support    | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| Mobile Support     | Responsive design, touch-friendly UI              |
| Minimum Resolution | 1280×720                                          |
| Target Frame Rate  | 60 FPS (race animations)                          |

### 13.2 Networking Model

```
┌─────────────┐         ┌─────────────┐
│   Client    │ ←────── │   Server    │
│  (Browser)  │ ──────→ │ (WebSocket) │
└─────────────┘         └─────────────┘
       │                       │
       │  Shop/Prep/Bet:       │
       │  ← Sync game state    │
       │  → Send actions       │
       │  ← Validate & confirm │
       │                       │
       │  Race:                │
       │  ← Race inputs (all   │
       │     horses, stats,    │
       │     strategies)       │
       │  Client runs          │
       │  deterministic sim    │
       │  locally              │
       │                       │
```

### 13.3 Why This Architecture Works

| Benefit                  | Explanation                                                   |
| ------------------------ | ------------------------------------------------------------- |
| No real-time sync needed | Autobattler format means no live input during races           |
| Deterministic simulation | Given same inputs, all clients produce identical race results |
| Low bandwidth            | Only sync decisions, not continuous position data             |
| Spectating is trivial    | All clients run same simulation                               |
| Cheat-resistant          | Server validates all purchases/bets before race               |

### 13.4 Data Flow Per Round

1. **Shop Phase**
   - Server sends: Shop offerings, current gold, owned units
   - Client sends: Purchase/sell/train/reroll actions
   - Server validates and confirms each action

2. **Prep Phase**
   - Server sends: Track conditions, all players' selected horses (public)
   - Client sends: Jockey assignment, equipment, strategy
   - Server validates loadout

3. **Betting Phase**
   - Server sends: Calculated odds for each horse
   - Client sends: Bet selection (or skip)
   - Server validates bet amount

4. **Race Phase**
   - Server sends: Complete race input packet (all 8 entries with full stats)
   - Client runs deterministic simulation locally
   - Client displays animated race
   - Server sends: Official results (for verification)

5. **Results**
   - Server sends: Placements, gold changes, heart changes, bet outcomes
   - Client updates UI

### 13.5 Technology Recommendations

| Component        | Recommended                             |
| ---------------- | --------------------------------------- |
| Frontend         | React + TypeScript                      |
| Game Rendering   | Pixi.js (WebGL pixel rendering)         |
| State Management | Zustand or Redux                        |
| Networking       | Socket.io or native WebSocket           |
| Backend          | Node.js + Express                       |
| Database         | PostgreSQL (accounts, meta-progression) |
| Hosting          | Fly.io, Railway, or similar             |

---

## 14. Open Questions

### 14.1 Design Questions

| Question           | Context                                                         | Proposed Resolution                                      |
| ------------------ | --------------------------------------------------------------- | -------------------------------------------------------- |
| Stable size limit? | How many horses/jockeys can a player own?                       | Propose: 4 horses, 3 jockeys max                         |
| Duplicate horses?  | Can you own 2 of the same horse?                                | Propose: Yes, allows deep bloodline investment           |
| Jockey reuse?      | Can one jockey race multiple times if you have multiple horses? | Propose: Yes, jockeys are not "spent"                    |
| Spectator mode?    | Can eliminated players watch?                                   | Yes, and they should be able to bet for fun (no rewards) |
| Tie-breaking?      | What happens if two horses finish simultaneously?               | Propose: Higher Skill jockey wins tie                    |

### 14.2 Balance Questions

| Question                                      | Needs Playtesting |
| --------------------------------------------- | ----------------- |
| Is betting too strong as a catch-up mechanic? | Yes               |
| Is training cost curve correct?               | Yes               |
| Are bloodline bonuses impactful enough?       | Yes               |
| Does heart damage scale appropriately?        | Yes               |
| Is Temper/Weight interaction too punishing?   | Yes               |

### 14.3 Technical Questions

| Question        | Decision Needed                                    |
| --------------- | -------------------------------------------------- |
| Account system? | OAuth (Google/Discord) vs. guest accounts          |
| Matchmaking?    | Random lobby vs. skill-based vs. friend codes only |
| Anti-cheat?     | Server-authoritative validation sufficient?        |
| Reconnection?   | How to handle disconnects mid-match?               |

---

## Appendix A: Example Horse Roster

### Tier 1 Horses

| Name      | SPD | STA | GRT | TMP | Bloodline      | Notes              |
| --------- | --- | --- | --- | --- | -------------- | ------------------ |
| Dusty     | 6   | 5   | 5   | 5   | Desert Wind    | Balanced starter   |
| Snowflake | 5   | 6   | 6   | 4   | Northern Storm | Reliable, tanky    |
| Sparky    | 7   | 4   | 5   | 5   | Wild Card      | Fast but fragile   |
| Pebbles   | 5   | 5   | 7   | 4   | Mudblood       | Terrain specialist |

### Tier 2 Horses

| Name         | SPD | STA | GRT | TMP | Potential | Bloodline   | Notes             |
| ------------ | --- | --- | --- | --- | --------- | ----------- | ----------------- |
| Thunderbolt  | 7→9 | 3→5 | 4→6 | 6→8 | +8        | Desert Wind | Glass cannon      |
| Mudslinger   | 5→6 | 7→9 | 8→9 | 4→5 | +5        | Mudblood    | Loves bad weather |
| Steady Eddie | 6→7 | 6→8 | 6→7 | 3→4 | +5        | Iron Heart  | Mr. Reliable      |

### Tier 3 Horses

| Name         | SPD | STA  | GRT | TMP  | Potential | Bloodline      | Ability                                                     |
| ------------ | --- | ---- | --- | ---- | --------- | -------------- | ----------------------------------------------------------- |
| Chaos Reign  | 8→9 | 5→7  | 5→6 | 9→10 | +5        | Wild Card      | _Explosive_: Double Temper variance (very good or very bad) |
| Iron Will    | 5→6 | 8→10 | 7→9 | 4→5  | +6        | Iron Heart     | _Endurance_: No Stamina penalty in final 20%                |
| Storm Chaser | 7→9 | 6→7  | 7→9 | 5→6  | +6        | Northern Storm | _Weatherproof_: +2 Speed in bad conditions                  |

### Tier 4 Horses

| Name      | SPD  | STA  | GRT  | TMP | Potential | Bloodline  | Ability                                              |
| --------- | ---- | ---- | ---- | --- | --------- | ---------- | ---------------------------------------------------- |
| Sovereign | 8→10 | 7→9  | 6→8  | 5→6 | +7        | Royal Line | _Majesty_: All owned horses gain +1 to highest stat  |
| Phantom   | 9→10 | 5→7  | 6→7  | 7→9 | +6        | Wild Card  | _Ghost_: 25% chance to ignore one stumble            |
| Titan     | 6→7  | 9→10 | 9→10 | 3→4 | +4        | Iron Heart | _Unstoppable_: Cannot be slowed below 80% base Speed |

---

## Appendix B: Example Jockey Roster

| Name                | SKL | TMG | WGT | Total | Trait           | Cost |
| ------------------- | --- | --- | --- | ----- | --------------- | ---- |
| Rookie Kate         | 5   | 4   | 4   | 13    | —               | 2    |
| Feather Martinez    | 6   | 5   | 3   | 14    | Lightweight     | 3    |
| Steady Sam          | 6   | 6   | 5   | 17    | —               | 3    |
| Old Jim             | 8   | 9   | 7   | 24    | Veteran         | 4    |
| Anchor Adams        | 7   | 6   | 9   | 22    | Horse Whisperer | 4    |
| Lucky Lena          | 5   | 5   | 5   | 15    | Lucky           | 3    |
| Dash Williams       | 7   | 7   | 4   | 18    | Front-Runner    | 4    |
| Marina "Mud" Murphy | 6   | 7   | 6   | 19    | Mudder          | 3    |

---

## Appendix C: Glossary

| Term                  | Definition                                                          |
| --------------------- | ------------------------------------------------------------------- |
| **Autobattler**       | Genre where players draft/build teams that then fight automatically |
| **Bloodline**         | Horse family/breed that provides synergy bonuses                    |
| **Exacta**            | Bet type requiring prediction of 1st and 2nd place in exact order   |
| **Furlong**           | Unit of race distance (1/8 mile)                                    |
| **Genetic Potential** | Maximum stat value a horse can reach through training               |
| **Grit**              | Stat representing toughness and terrain handling                    |
| **Heart**             | Health resource; losing all hearts eliminates player                |
| **Temper**            | Stat representing volatility and consistency                        |
| **Tier**              | Unit power level; higher tiers unlock in later rounds               |

---

_End of Document_
