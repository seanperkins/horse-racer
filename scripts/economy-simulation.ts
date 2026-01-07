/**
 * Economy Simulation Script
 *
 * Simulates gold and prestige accumulation across different player performance levels.
 * Usage: npx tsx scripts/economy-simulation.ts
 */

const ROUNDS = 10 // Testing 10-round games
const STARTING_GOLD = 10
const STARTING_HEARTS = 5
const STARTING_PRESTIGE = 0

// Race rewards by position (1-indexed)
const GOLD_REWARDS = [5, 4, 3, 2, 2, 1, 1, 1]

// Heart damage progression by round (V8: accelerates after first elimination)
// Early game: gentle pressure builds
// After first elimination (~round 7-8): damage ramps up significantly
// Goal: 1-3 players survive to round 10, most eliminated by then
const getHeartDamage = (round: number, position: number, playersRemaining: number = 8): number => {
  // position is 1-indexed (1st place = 1)
  // playersRemaining: how many players are still alive

  // Once someone is eliminated, enter "endgame" mode with higher damage
  const endgame = playersRemaining < 8

  if (round <= 3) {
    // Grace period - no damage
    return 0
  } else if (round <= 6) {
    // Early pressure - only dead last takes 1
    if (position === 8) return 1
    return 0
  } else if (!endgame) {
    // Mid game (no eliminations yet) - 7th-8th take damage
    if (position === 8) return 2
    if (position === 7) return 1
    return 0
  } else {
    // ENDGAME: Someone was eliminated, ramp up pressure
    // Bottom half takes damage, accelerating elimination
    if (position >= 7) return 2 // 7th-8th: heavy damage
    if (position >= 5) return 1 // 5th-6th: light damage
    return 0
  }
}

// For simulation, we'll track players remaining and use simpler version
const getHeartDamageSimple = (round: number, position: number): number => {
  // V8 curve for 10-round games with more aggressive endgame
  if (round <= 3) return 0 // Grace period
  if (round <= 5) {
    // Early pressure - only 8th takes damage
    if (position === 8) return 1
    return 0
  }
  if (round <= 7) {
    // Mid game - 7th-8th take damage
    if (position === 8) return 2
    if (position === 7) return 1
    return 0
  }
  // Rounds 8-10: endgame acceleration
  if (position === 8) return 2
  if (position === 7) return 2
  if (position >= 5) return 1 // 5th-6th: light damage
  return 0
}

// Fixed costs
const JOCKEY_UPKEEP_AVG = 0 // TESTING: Removed jockey upkeep
const TRAINING_COST = 3 // Average training cost per round (if training)
const REROLL_COST = 2

// Free betting parameters (new system: one free bet per race)
// Place bet: pick 1 horse for top 3 (easy, 1 rep)
// Win bet: pick 1st place (medium, 3 rep)
// Exacta bet: pick 1st AND 2nd (hard, 5 rep)
const BET_TYPES = {
  place: { winRate: 0.375, reputation: 1 }, // 3/8 chance roughly
  win: { winRate: 0.125, reputation: 3 }, // 1/8 chance roughly
  exacta: { winRate: 0.018, reputation: 5 }, // 1/56 chance roughly
}

// Skill affects which bet type players choose and their accuracy
const BET_STRATEGY_BY_SKILL = {
  top: { preferredBet: 'win', accuracy: 1.5 }, // 50% better at picking
  average: { preferredBet: 'place', accuracy: 1.0 }, // baseline
  poor: { preferredBet: 'place', accuracy: 0.7 }, // 30% worse at picking
}

const PRESTIGE_PER_WIN = (betAmount: number) => Math.max(1, Math.floor(betAmount / 2.5))

interface PlayerScenario {
  name: string
  avgPosition: number // Average race finish position (1-8)
  positionVariance: number // How much position varies
  betAmount: number // How much they bet each round
  betSkill: 'top' | 'average' | 'poor'
  trainsPerRound: boolean
  rerollsPerRound: number
}

interface SimulationResult {
  scenario: string
  roundResults: RoundResult[]
  finalGold: number
  finalPrestige: number
  finalHearts: number
  eliminated: boolean
  eliminatedRound: number | null
  totalGoldEarned: number
  totalGoldSpent: number
  totalPrestigeEarned: number
  betsWon: number
  betsLost: number
}

interface RoundResult {
  round: number
  position: number
  goldReward: number
  heartDamage: number
  betWon: boolean
  prestigeEarned: number
  goldSpent: number
  goldAfter: number
  prestigeAfter: number
  heartsAfter: number
}

function simulatePlayer(scenario: PlayerScenario): SimulationResult {
  let gold = STARTING_GOLD
  let hearts = STARTING_HEARTS
  let prestige = STARTING_PRESTIGE
  let eliminated = false
  let eliminatedRound: number | null = null

  const roundResults: RoundResult[] = []
  let totalGoldEarned = 0
  let totalGoldSpent = 0
  let totalPrestigeEarned = 0
  let betsWon = 0
  let betsLost = 0

  for (let round = 1; round <= ROUNDS; round++) {
    if (eliminated) break

    // Calculate position for this round
    const variance = (Math.random() - 0.5) * 2 * scenario.positionVariance
    let position = Math.round(scenario.avgPosition + variance)
    position = Math.max(1, Math.min(8, position))

    // Gold reward
    const goldReward = GOLD_REWARDS[position - 1]
    gold += goldReward
    totalGoldEarned += goldReward

    // Heart damage
    const heartDamage = getHeartDamageSimple(round, position)
    hearts -= heartDamage

    if (hearts <= 0) {
      eliminated = true
      eliminatedRound = round
    }

    // Spending: jockey upkeep
    let goldSpent = JOCKEY_UPKEEP_AVG
    gold -= JOCKEY_UPKEEP_AVG

    // Spending: training (if applicable)
    if (scenario.trainsPerRound && gold >= TRAINING_COST) {
      gold -= TRAINING_COST
      goldSpent += TRAINING_COST
    }

    // Spending: rerolls
    const rerollCost = scenario.rerollsPerRound * REROLL_COST
    if (gold >= rerollCost) {
      gold -= rerollCost
      goldSpent += rerollCost
    }

    totalGoldSpent += goldSpent

    // Betting
    // Free betting (new system)
    let prestigeEarned = 0
    let betWon = false

    const strategy = BET_STRATEGY_BY_SKILL[scenario.betSkill]
    const betType = BET_TYPES[strategy.preferredBet as keyof typeof BET_TYPES]
    const adjustedWinRate = Math.min(0.9, betType.winRate * strategy.accuracy)

    betWon = Math.random() < adjustedWinRate
    if (betWon) {
      prestigeEarned = betType.reputation
      prestige += prestigeEarned
      totalPrestigeEarned += prestigeEarned
      betsWon++
    } else {
      betsLost++
    }
    // No gold cost - betting is free!

    roundResults.push({
      round,
      position,
      goldReward,
      heartDamage,
      betWon,
      prestigeEarned,
      goldSpent: goldSpent, // No betting cost anymore
      goldAfter: Math.max(0, gold),
      prestigeAfter: prestige,
      heartsAfter: Math.max(0, hearts),
    })

    gold = Math.max(0, gold)
  }

  return {
    scenario: scenario.name,
    roundResults,
    finalGold: gold,
    finalPrestige: prestige,
    finalHearts: hearts,
    eliminated,
    eliminatedRound,
    totalGoldEarned,
    totalGoldSpent,
    totalPrestigeEarned,
    betsWon,
    betsLost,
  }
}

function runSimulations(scenario: PlayerScenario, iterations: number): SimulationResult[] {
  return Array.from({ length: iterations }, () => simulatePlayer(scenario))
}

function summarize(results: SimulationResult[]) {
  const n = results.length
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / n

  const eliminatedCount = results.filter((r) => r.eliminated).length
  const avgGoldEarned = avg(results.map((r) => r.totalGoldEarned))
  const avgGoldSpent = avg(results.map((r) => r.totalGoldSpent))
  const avgPrestige = avg(results.map((r) => r.finalPrestige))
  const avgFinalGold = avg(results.map((r) => r.finalGold))
  const avgFinalHearts = avg(results.filter((r) => !r.eliminated).map((r) => r.finalHearts))
  const avgBetsWon = avg(results.map((r) => r.betsWon))
  const avgBetsLost = avg(results.map((r) => r.betsLost))

  return {
    eliminationRate: (eliminatedCount / n) * 100,
    avgGoldEarned,
    avgGoldSpent,
    avgNetGold: avgGoldEarned - avgGoldSpent,
    avgPrestige,
    avgFinalGold,
    avgFinalHearts,
    avgBetsWon,
    avgBetsLost,
    betWinRate: avgBetsWon / (avgBetsWon + avgBetsLost) * 100,
  }
}

// Define player scenarios
const scenarios: PlayerScenario[] = [
  {
    name: 'Top Racer (no betting)',
    avgPosition: 2,
    positionVariance: 1,
    betAmount: 0,
    betSkill: 'top',
    trainsPerRound: true,
    rerollsPerRound: 1,
  },
  {
    name: 'Top Racer (2g bets)',
    avgPosition: 2,
    positionVariance: 1,
    betAmount: 2,
    betSkill: 'top',
    trainsPerRound: true,
    rerollsPerRound: 1,
  },
  {
    name: 'Top Racer (5g bets)',
    avgPosition: 2,
    positionVariance: 1,
    betAmount: 5,
    betSkill: 'top',
    trainsPerRound: true,
    rerollsPerRound: 0,
  },
  {
    name: 'Average Racer (no betting)',
    avgPosition: 4.5,
    positionVariance: 2,
    betAmount: 0,
    betSkill: 'average',
    trainsPerRound: false,
    rerollsPerRound: 1,
  },
  {
    name: 'Average Racer (2g bets)',
    avgPosition: 4.5,
    positionVariance: 2,
    betAmount: 2,
    betSkill: 'average',
    trainsPerRound: false,
    rerollsPerRound: 1,
  },
  {
    name: 'Average Racer (5g bets)',
    avgPosition: 4.5,
    positionVariance: 2,
    betAmount: 5,
    betSkill: 'average',
    trainsPerRound: false,
    rerollsPerRound: 0,
  },
  {
    name: 'Poor Racer (no betting)',
    avgPosition: 7,
    positionVariance: 1,
    betAmount: 0,
    betSkill: 'poor',
    trainsPerRound: false,
    rerollsPerRound: 0,
  },
  {
    name: 'Poor Racer (2g bets)',
    avgPosition: 7,
    positionVariance: 1,
    betAmount: 2,
    betSkill: 'poor',
    trainsPerRound: false,
    rerollsPerRound: 0,
  },
  {
    name: 'Betting Only (no racing focus)',
    avgPosition: 5,
    positionVariance: 2,
    betAmount: 5,
    betSkill: 'top',
    trainsPerRound: false,
    rerollsPerRound: 0,
  },
]

// Run simulations
console.log('🏇 Economy Simulation\n')
console.log('='.repeat(80))
console.log(`Simulating ${ROUNDS} rounds per game, 1000 iterations per scenario\n`)

console.log('Race Rewards by Position: ', GOLD_REWARDS.map((g, i) => `${i + 1}st: ${g}g`).join(', '))
console.log('Heart Damage (V8 - endgame acceleration):')
console.log('  R1-3:  No damage (grace period)')
console.log('  R4-6:  8th: 1 dmg')
console.log('  R7-8:  7th: 1 dmg, 8th: 2 dmg')
console.log('  R9-10: 6th-7th: 1 dmg, 8th: 2 dmg (endgame)')
console.log(`Prestige per bet win:      Place=1, Win=3, Exacta=5`)
console.log('')
console.log('='.repeat(80))

const allResults: { scenario: string; summary: ReturnType<typeof summarize> }[] = []

for (const scenario of scenarios) {
  const results = runSimulations(scenario, 1000)
  const summary = summarize(results)
  allResults.push({ scenario: scenario.name, summary })
}

// Print comparison table
console.log('\n📊 Results Summary\n')
console.log(
  'Scenario'.padEnd(30) +
    'Elim%'.padStart(8) +
    'Gold+'.padStart(8) +
    'Gold-'.padStart(8) +
    'Net'.padStart(8) +
    '⭐Prstg'.padStart(8) +
    'Bets W/L'.padStart(12)
)
console.log('-'.repeat(82))

for (const { scenario, summary } of allResults) {
  console.log(
    scenario.padEnd(30) +
      summary.eliminationRate.toFixed(0).padStart(7) + '%' +
      summary.avgGoldEarned.toFixed(1).padStart(8) +
      summary.avgGoldSpent.toFixed(1).padStart(8) +
      summary.avgNetGold.toFixed(1).padStart(8) +
      summary.avgPrestige.toFixed(1).padStart(8) +
      `${summary.avgBetsWon.toFixed(1)}/${summary.avgBetsLost.toFixed(1)}`.padStart(12)
  )
}

// Analysis
console.log('\n' + '='.repeat(80))
console.log('\n📈 Analysis\n')

console.log('GOLD ECONOMY:')
console.log('- Top racers earn ~35-40g from racing over 10 rounds')
console.log('- Average racers earn ~22-25g from racing')
console.log('- Poor racers earn ~10-12g from racing (barely covers upkeep)')
console.log('- Jockey upkeep + training can consume most gold income')
console.log('')

console.log('PRESTIGE ECONOMY:')
console.log('- Betting is currently the ONLY way to earn prestige')
console.log('- At 2g bets with 50% win rate: ~4 prestige over 10 rounds')
console.log('- At 5g bets with 50% win rate: ~10 prestige over 10 rounds')
console.log('- Stable expansion costs 2+3=5 prestige for max slots')
console.log('- Most players can barely afford one stable expansion')
console.log('')

console.log('PROBLEMS IDENTIFIED:')
console.log('1. Betting drains gold with no gold return - creates death spiral')
console.log('2. Poor racers have no gold to bet, so no prestige, so stuck at 1 horse')
console.log('3. Catch-up mechanic (hearts→prestige) not implemented in this sim')
console.log('4. Prestige has very limited uses (only stable expansion)')
console.log('')

console.log('POTENTIAL SOLUTIONS:')
console.log('1. Give small prestige for race placements (not just betting)')
console.log('2. Reduce stable expansion costs (1+2 instead of 2+3)')
console.log('3. Add more prestige sinks so top players have reasons to earn more')
console.log('4. Consider giving losing racers bonus gold (not just prestige)')
console.log('5. Make betting optional-but-rewarding instead of gold-draining')
console.log('')

// New section: What if we tweak the economy?
console.log('='.repeat(80))
console.log('\n🔧 Alternative Economy Models\n')

// Model A: Prestige from racing
console.log('MODEL A: Prestige from Racing (in addition to betting)')
console.log('  1st-3rd place: +1 prestige')
console.log('  4th-8th place: 0 prestige')
console.log('  Losing hearts: +1 prestige per heart (catch-up)')
console.log('')
console.log('  Estimated prestige over 10 rounds:')
console.log('  - Top racer:     ~8 from racing + ~5 from betting = 13 total')
console.log('  - Average racer: ~3 from racing + ~3 from betting + ~3 from hearts = 9 total')
console.log('  - Poor racer:    ~0 from racing + ~1 from betting + ~8 from hearts = 9 total')
console.log('  → This creates catch-up parity!')
console.log('')

// Model B: Betting returns gold on loss
console.log('MODEL B: Betting Returns Partial Gold on Loss')
console.log('  Win bet: Lose gold stake, gain prestige')
console.log('  Lose bet: Get 50% of stake back (reduced loss)')
console.log('')
console.log('  This makes betting less punishing and encourages participation')
console.log('')

// Model C: Lower prestige requirements
console.log('MODEL C: Lower Stable Expansion Costs')
console.log('  Current: 2 + 3 = 5 prestige for full stable')
console.log('  Proposed: 1 + 2 = 3 prestige for full stable')
console.log('')
console.log('  Makes 2nd horse achievable in rounds 2-3 for most players')
console.log('')

console.log('='.repeat(80))

// ============================================================================
// MODEL A DETAILED SIMULATION
// ============================================================================
console.log('\n🧪 REPUTATION ECONOMY SIMULATION\n')
console.log('Changes from current:')
console.log('  - Rename "Prestige" → "Reputation"')
console.log('  - FREE BETTING: One bet per race, no gold cost')
console.log('    - Place bet (top 3): 1 rep on win')
console.log('    - Win bet (1st place): 3 rep on win')
console.log('    - Exacta bet (1st+2nd): 5 rep on win')
console.log('  - 1st-3rd place: +1 reputation from racing')
console.log('  - Heart loss: +2 reputation per heart lost (catch-up)')
console.log('  - Stable expansion: 1 + 2 = 3 reputation total (reduced from 5)')
console.log('')

interface ModelAResult {
  scenario: string
  survivalRate: number
  avgPrestigeFromRacing: number
  avgPrestigeFromBetting: number
  avgPrestigeFromHeartLoss: number
  totalPrestige: number
  canAfford2ndSlot: number // % who can afford by round 4
  canAfford3rdSlot: number // % who can afford by round 8
}

function simulateModelA(scenario: PlayerScenario, iterations: number): ModelAResult {
  let survivalCount = 0
  let totalPrestigeRacing = 0
  let totalPrestigeBetting = 0
  let totalPrestigeHearts = 0
  let canAfford2nd = 0
  let canAfford3rd = 0

  for (let i = 0; i < iterations; i++) {
    let gold = STARTING_GOLD
    let hearts = STARTING_HEARTS
    let prestige = STARTING_PRESTIGE
    let eliminated = false
    let prestigeFromRacing = 0
    let prestigeFromBetting = 0
    let prestigeFromHearts = 0
    let slot2Affordable = false
    let slot3Affordable = false

    for (let round = 1; round <= ROUNDS; round++) {
      if (eliminated) break

      // Calculate position
      const variance = (Math.random() - 0.5) * 2 * scenario.positionVariance
      let position = Math.round(scenario.avgPosition + variance)
      position = Math.max(1, Math.min(8, position))

      // Gold reward
      const goldReward = GOLD_REWARDS[position - 1]
      gold += goldReward

      // Prestige from racing (MODEL A: top 3 get 1 prestige)
      if (position <= 3) {
        prestige += 1
        prestigeFromRacing += 1
      }

      // Heart damage
      const heartDamage = getHeartDamageSimple(round, position)

      // Reputation from heart loss (catch-up: 2 rep per heart)
      if (heartDamage > 0) {
        prestige += heartDamage * 2
        prestigeFromHearts += heartDamage * 2
      }

      hearts -= heartDamage

      if (hearts <= 0) {
        eliminated = true
      }

      // Spending
      let spending = JOCKEY_UPKEEP_AVG
      if (scenario.trainsPerRound && gold >= TRAINING_COST) spending += TRAINING_COST
      spending += scenario.rerollsPerRound * REROLL_COST
      gold = Math.max(0, gold - spending)

      // Free Betting (new system: everyone bets, no gold cost)
      const strategy = BET_STRATEGY_BY_SKILL[scenario.betSkill]
      const betType = BET_TYPES[strategy.preferredBet as keyof typeof BET_TYPES]
      const adjustedWinRate = Math.min(0.9, betType.winRate * strategy.accuracy)

      if (Math.random() < adjustedWinRate) {
        prestige += betType.reputation
        prestigeFromBetting += betType.reputation
      }
      // No gold cost - betting is free!

      gold = Math.max(0, gold)

      // Check if can afford slots (MODEL A: costs 1 for 2nd, 2 for 3rd)
      if (round === 4 && prestige >= 1) slot2Affordable = true
      if (round === 8 && prestige >= 3) slot3Affordable = true
    }

    if (!eliminated) survivalCount++
    totalPrestigeRacing += prestigeFromRacing
    totalPrestigeBetting += prestigeFromBetting
    totalPrestigeHearts += prestigeFromHearts
    if (slot2Affordable) canAfford2nd++
    if (slot3Affordable) canAfford3rd++
  }

  return {
    scenario: scenario.name,
    survivalRate: (survivalCount / iterations) * 100,
    avgPrestigeFromRacing: totalPrestigeRacing / iterations,
    avgPrestigeFromBetting: totalPrestigeBetting / iterations,
    avgPrestigeFromHeartLoss: totalPrestigeHearts / iterations,
    totalPrestige: (totalPrestigeRacing + totalPrestigeBetting + totalPrestigeHearts) / iterations,
    canAfford2ndSlot: (canAfford2nd / iterations) * 100,
    canAfford3rdSlot: (canAfford3rd / iterations) * 100,
  }
}

const modelAScenarios: PlayerScenario[] = [
  {
    name: 'Top Racer',
    avgPosition: 2,
    positionVariance: 1,
    betAmount: 0, // ignored - free betting
    betSkill: 'top', // picks Win bets, 50% better accuracy
    trainsPerRound: true,
    rerollsPerRound: 0,
  },
  {
    name: 'Average Racer',
    avgPosition: 4.5,
    positionVariance: 2,
    betAmount: 0,
    betSkill: 'average', // picks Place bets, baseline accuracy
    trainsPerRound: false,
    rerollsPerRound: 0,
  },
  {
    name: 'Below Avg (6th)',
    avgPosition: 6,
    positionVariance: 1.5,
    betAmount: 0,
    betSkill: 'poor',
    trainsPerRound: false,
    rerollsPerRound: 0,
  },
  {
    name: 'Poor (7th)',
    avgPosition: 7,
    positionVariance: 1,
    betAmount: 0,
    betSkill: 'poor', // picks Place bets, 30% worse accuracy
    trainsPerRound: false,
    rerollsPerRound: 0,
  },
  {
    name: 'Dead Last (8th)',
    avgPosition: 8,
    positionVariance: 0.5,
    betAmount: 0,
    betSkill: 'poor',
    trainsPerRound: false,
    rerollsPerRound: 0,
  },
]

console.log(
  'Scenario'.padEnd(20) +
    'Surv%'.padStart(7) +
    'Race⭐'.padStart(8) +
    'Bet⭐'.padStart(7) +
    'Heart⭐'.padStart(8) +
    'Total⭐'.padStart(8) +
    '2nd@R4'.padStart(9) +
    '3rd@R8'.padStart(9)
)
console.log('-'.repeat(76))

for (const scenario of modelAScenarios) {
  const result = simulateModelA(scenario, 1000)
  console.log(
    result.scenario.padEnd(20) +
      result.survivalRate.toFixed(0).padStart(6) + '%' +
      result.avgPrestigeFromRacing.toFixed(1).padStart(8) +
      result.avgPrestigeFromBetting.toFixed(1).padStart(7) +
      result.avgPrestigeFromHeartLoss.toFixed(1).padStart(8) +
      result.totalPrestige.toFixed(1).padStart(8) +
      (result.canAfford2ndSlot.toFixed(0) + '%').padStart(9) +
      (result.canAfford3rdSlot.toFixed(0) + '%').padStart(9)
  )
}

console.log('')
console.log('Key insights:')
console.log('- Top racers get reputation from racing (consistent)')
console.log('- Poor racers get 2x reputation from heart loss (strong catch-up)')
console.log('- Betting becomes optional bonus, not required for progression')
console.log('- 2nd slot affordable by round 2-3 for most players')
console.log('')

// ============================================================================
// RECOMMENDATIONS
// ============================================================================
console.log('='.repeat(80))
console.log('\n✅ RECOMMENDED CHANGES\n')
console.log('1. ADD PRESTIGE FROM RACING:')
console.log('   - 1st place: 2 prestige')
console.log('   - 2nd place: 1 prestige')
console.log('   - 3rd place: 1 prestige')
console.log('')
console.log('2. ADD PRESTIGE FROM HEART LOSS (catch-up):')
console.log('   - Already in design doc, needs implementation')
console.log('   - +1 prestige per heart lost')
console.log('')
console.log('3. REDUCE STABLE EXPANSION COSTS:')
console.log('   - 2nd slot: 1 prestige (was 2)')
console.log('   - 3rd slot: 2 prestige (was 3)')
console.log('   - Total: 3 prestige (was 5)')
console.log('')
console.log('4. ADD MORE PRESTIGE SINKS:')
console.log('   - Premium training: bypass potential limit for 1 prestige')
console.log('   - Equipment fusion: combine 2 items for 2 prestige')
console.log('   - Horse breeding: create new horse for 3 prestige')
console.log('   - Legendary shop items: cost prestige instead of gold')
console.log('')
console.log('5. FIX BETTING GOLD DRAIN:')
console.log('   Option A: Return 50% of stake on loss')
console.log('   Option B: Betting costs 0 gold, stakes are "virtual"')
console.log('   Option C: Increase race gold rewards to offset betting')
console.log('')
console.log('='.repeat(80))

// ============================================================================
// FULL GAME SIMULATION - 100 GAMES
// ============================================================================
console.log('\n🎮 FULL GAME SIMULATION (100 games)\n')

interface Player {
  id: number
  name: string
  skillLevel: 'top' | 'good' | 'average' | 'below_avg' | 'poor' | 'bad' | 'terrible' | 'worst'
  basePosition: number // Average finish position
  positionVariance: number
  betSkill: 'top' | 'average' | 'poor'
  gold: number
  goldEarned: number
  reputation: number
  reputationEarned: number
  hearts: number
  eliminated: boolean
  eliminatedRound: number | null
}

interface GameResult {
  winner: Player
  winType: 'elimination' | 'score'
  survivors: number
  roundsPlayed: number
}

// Create 8 players with different skill levels
function createPlayers(): Player[] {
  return [
    { id: 1, name: '1st (Elite)', skillLevel: 'top', basePosition: 1.5, positionVariance: 0.8, betSkill: 'top', gold: STARTING_GOLD, goldEarned: 0, reputation: 0, reputationEarned: 0, hearts: STARTING_HEARTS, eliminated: false, eliminatedRound: null },
    { id: 2, name: '2nd (Strong)', skillLevel: 'good', basePosition: 2.5, positionVariance: 1.2, betSkill: 'top', gold: STARTING_GOLD, goldEarned: 0, reputation: 0, reputationEarned: 0, hearts: STARTING_HEARTS, eliminated: false, eliminatedRound: null },
    { id: 3, name: '3rd (Good)', skillLevel: 'average', basePosition: 3.5, positionVariance: 1.5, betSkill: 'average', gold: STARTING_GOLD, goldEarned: 0, reputation: 0, reputationEarned: 0, hearts: STARTING_HEARTS, eliminated: false, eliminatedRound: null },
    { id: 4, name: '4th (Average)', skillLevel: 'below_avg', basePosition: 4.5, positionVariance: 2.0, betSkill: 'average', gold: STARTING_GOLD, goldEarned: 0, reputation: 0, reputationEarned: 0, hearts: STARTING_HEARTS, eliminated: false, eliminatedRound: null },
    { id: 5, name: '5th (Below Avg)', skillLevel: 'poor', basePosition: 5.5, positionVariance: 2.0, betSkill: 'average', gold: STARTING_GOLD, goldEarned: 0, reputation: 0, reputationEarned: 0, hearts: STARTING_HEARTS, eliminated: false, eliminatedRound: null },
    { id: 6, name: '6th (Weak)', skillLevel: 'bad', basePosition: 6.5, positionVariance: 1.5, betSkill: 'poor', gold: STARTING_GOLD, goldEarned: 0, reputation: 0, reputationEarned: 0, hearts: STARTING_HEARTS, eliminated: false, eliminatedRound: null },
    { id: 7, name: '7th (Poor)', skillLevel: 'terrible', basePosition: 7.2, positionVariance: 1.0, betSkill: 'poor', gold: STARTING_GOLD, goldEarned: 0, reputation: 0, reputationEarned: 0, hearts: STARTING_HEARTS, eliminated: false, eliminatedRound: null },
    { id: 8, name: '8th (Worst)', skillLevel: 'worst', basePosition: 7.8, positionVariance: 0.5, betSkill: 'poor', gold: STARTING_GOLD, goldEarned: 0, reputation: 0, reputationEarned: 0, hearts: STARTING_HEARTS, eliminated: false, eliminatedRound: null },
  ]
}

function simulateFullGame(maxRounds: number): GameResult {
  const players = createPlayers()
  let roundsPlayed = 0

  for (let round = 1; round <= maxRounds; round++) {
    roundsPlayed = round
    const alivePlayers = players.filter(p => !p.eliminated)

    if (alivePlayers.length <= 1) break

    // Generate positions for this round (simulate race)
    // Each player gets a position based on their skill + variance
    const positionScores = alivePlayers.map(p => ({
      player: p,
      score: p.basePosition + (Math.random() - 0.5) * 2 * p.positionVariance
    }))
    positionScores.sort((a, b) => a.score - b.score)

    // Assign actual positions - last place among alive = 8th for damage purposes
    const numAlive = alivePlayers.length
    positionScores.forEach((ps, idx) => {
      const player = ps.player
      // Position among alive players (0-indexed: 0 = first, numAlive-1 = last)
      // Map to 1-8: last alive = 8, second-to-last = 7, etc.
      // First place always = 1
      const actualPosition = idx + 1 // 1-indexed position among alive
      // For damage: last place = 8, second-to-last = 7, etc.
      const mappedPosition = actualPosition === numAlive ? 8 :
                             actualPosition === numAlive - 1 ? 7 :
                             actualPosition === numAlive - 2 ? 6 :
                             actualPosition // Otherwise use actual position

      // Gold reward
      const goldReward = GOLD_REWARDS[mappedPosition - 1] || 1
      player.gold += goldReward
      player.goldEarned += goldReward

      // Reputation from racing (top 3 positions among alive)
      if (idx < 3) {
        player.reputation += 1
        player.reputationEarned += 1
      }

      // Heart damage (use mapped position for damage calculation)
      const damage = getHeartDamageSimple(round, mappedPosition)

      // Catch-up reputation from heart loss
      if (damage > 0) {
        player.reputation += damage * 2
        player.reputationEarned += damage * 2
      }

      player.hearts -= damage

      if (player.hearts <= 0) {
        player.eliminated = true
        player.eliminatedRound = round
      }

      // Free betting
      const strategy = BET_STRATEGY_BY_SKILL[player.betSkill]
      const betType = BET_TYPES[strategy.preferredBet as keyof typeof BET_TYPES]
      const adjustedWinRate = Math.min(0.9, betType.winRate * strategy.accuracy)

      if (Math.random() < adjustedWinRate) {
        player.reputation += betType.reputation
        player.reputationEarned += betType.reputation
      }
    })
  }

  // Determine winner
  const alivePlayers = players.filter(p => !p.eliminated)

  if (alivePlayers.length === 1) {
    return {
      winner: alivePlayers[0],
      winType: 'elimination',
      survivors: 1,
      roundsPlayed
    }
  } else if (alivePlayers.length === 0) {
    // Everyone died - last to die wins
    const lastToDie = players.reduce((a, b) =>
      (a.eliminatedRound || 0) > (b.eliminatedRound || 0) ? a : b
    )
    return {
      winner: lastToDie,
      winType: 'elimination',
      survivors: 0,
      roundsPlayed
    }
  } else {
    // Multiple survivors - highest score wins
    const scored = alivePlayers.map(p => ({
      player: p,
      score: p.goldEarned + p.reputationEarned
    }))
    scored.sort((a, b) => b.score - a.score)

    return {
      winner: scored[0].player,
      winType: 'score',
      survivors: alivePlayers.length,
      roundsPlayed
    }
  }
}

// Run 100 games
const NUM_GAMES = 100
const gameResults: GameResult[] = []
const winCounts: Record<string, { total: number, byElim: number, byScore: number }> = {}

for (let i = 0; i < NUM_GAMES; i++) {
  const result = simulateFullGame(10)
  gameResults.push(result)

  const name = result.winner.name
  if (!winCounts[name]) {
    winCounts[name] = { total: 0, byElim: 0, byScore: 0 }
  }
  winCounts[name].total++
  if (result.winType === 'elimination') {
    winCounts[name].byElim++
  } else {
    winCounts[name].byScore++
  }
}

// Statistics
const eliminationWins = gameResults.filter(r => r.winType === 'elimination').length
const scoreWins = gameResults.filter(r => r.winType === 'score').length
const avgSurvivors = gameResults.reduce((sum, r) => sum + r.survivors, 0) / NUM_GAMES

console.log(`Games simulated: ${NUM_GAMES}`)
console.log(`Games won by elimination: ${eliminationWins} (${(eliminationWins / NUM_GAMES * 100).toFixed(0)}%)`)
console.log(`Games won by score: ${scoreWins} (${(scoreWins / NUM_GAMES * 100).toFixed(0)}%)`)
console.log(`Average survivors at round 10: ${avgSurvivors.toFixed(1)}`)
console.log('')

console.log('Win Distribution:')
console.log('Player              Total   By Elim   By Score')
console.log('-'.repeat(50))

// Sort by total wins
const sortedWinners = Object.entries(winCounts)
  .sort((a, b) => b[1].total - a[1].total)

for (const [name, counts] of sortedWinners) {
  console.log(
    name.padEnd(20) +
    counts.total.toString().padStart(5) +
    counts.byElim.toString().padStart(10) +
    counts.byScore.toString().padStart(10)
  )
}

// Win rate by player type
console.log('')
console.log('Win Rates:')
const playerNames = ['1st (Elite)', '2nd (Strong)', '3rd (Good)', '4th (Average)', '5th (Below Avg)', '6th (Weak)', '7th (Poor)', '8th (Worst)']
for (const name of playerNames) {
  const wins = winCounts[name]?.total || 0
  const pct = (wins / NUM_GAMES * 100).toFixed(0)
  const bar = '█'.repeat(Math.round(wins / 2))
  console.log(`${name.padEnd(18)} ${pct.padStart(3)}% ${bar}`)
}

// Run one more detailed game to show score breakdown
console.log('')
console.log('Example Game Score Breakdown:')
const examplePlayers = createPlayers()
let exRounds = 0
for (let round = 1; round <= 10; round++) {
  exRounds = round
  const alivePlayers = examplePlayers.filter(p => !p.eliminated)
  if (alivePlayers.length <= 1) break

  const positionScores = alivePlayers.map(p => ({
    player: p,
    score: p.basePosition + (Math.random() - 0.5) * 2 * p.positionVariance
  }))
  positionScores.sort((a, b) => a.score - b.score)

  const numAlive = alivePlayers.length
  positionScores.forEach((ps, idx) => {
    const player = ps.player
    const actualPosition = idx + 1
    const mappedPosition = actualPosition === numAlive ? 8 :
                           actualPosition === numAlive - 1 ? 7 :
                           actualPosition === numAlive - 2 ? 6 :
                           actualPosition

    const goldReward = GOLD_REWARDS[mappedPosition - 1] || 1
    player.goldEarned += goldReward
    if (idx < 3) player.reputationEarned += 1
    const damage = getHeartDamageSimple(round, mappedPosition)
    if (damage > 0) player.reputationEarned += damage * 2
    player.hearts -= damage
    if (player.hearts <= 0) {
      player.eliminated = true
      player.eliminatedRound = round
    }

    const strategy = BET_STRATEGY_BY_SKILL[player.betSkill]
    const betType = BET_TYPES[strategy.preferredBet as keyof typeof BET_TYPES]
    if (Math.random() < Math.min(0.9, betType.winRate * strategy.accuracy)) {
      player.reputationEarned += betType.reputation
    }
  })
}

console.log('Player              Gold    Rep    Score   Status')
console.log('-'.repeat(55))
for (const p of examplePlayers) {
  const score = p.goldEarned + p.reputationEarned
  const status = p.eliminated ? `Elim R${p.eliminatedRound}` : 'Alive'
  console.log(
    p.name.padEnd(18) +
    p.goldEarned.toString().padStart(6) +
    p.reputationEarned.toString().padStart(7) +
    score.toString().padStart(8) +
    status.padStart(12)
  )
}

console.log('')
console.log('='.repeat(80))
