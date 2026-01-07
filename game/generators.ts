import type { Horse, Jockey, Equipment, Bloodline, JockeyTrait, EquipmentSlot } from '@/types/game'

/**
 * Procedural generators for horses, jockeys, and equipment
 * Following PRD stat budgets and balance guidelines
 */

// ============================================================================
// NAME POOLS
// ============================================================================

const HORSE_NAMES_BY_BLOODLINE: Record<Bloodline, string[]> = {
  'Desert Wind': [
    'Sandstorm', 'Mirage', 'Dusty', 'Sunbeam', 'Dune Runner', 'Sahara', 'Oasis',
    'Phoenix', 'Solar Flare', 'Heat Wave', 'Desert Rose', 'Cactus Jack', 'Nomad',
    'Scorcher', 'Blaze', 'Inferno', 'Sun Dancer', 'Golden Dune', 'Sirocco',
  ],
  'Northern Storm': [
    'Snowflake', 'Blizzard', 'Frost', 'Aurora', 'Glacier', 'Ice Breaker', 'Avalanche',
    'Winter Wind', 'Polar Star', 'Storm Chaser', 'Thunder Snow', 'Frozen Heart',
    'Arctic Fury', 'Icicle', 'Hail Storm', 'Sleet', 'Permafrost', 'Tundra',
  ],
  'Iron Heart': [
    'Steady', 'Reliable', 'Marathon', 'Endurance', 'Patience', 'Iron Will', 'Titan',
    'Fortress', 'Steel Heart', 'Perseverance', 'Steadfast', 'Stalwart', 'Resilient',
    'Indomitable', 'Unwavering', 'Constant', 'True North', 'Rock Solid',
  ],
  'Wild Card': [
    'Chaos', 'Sparky', 'Zippy', 'Lucky Dice', 'Wild Fire', 'Gambler', 'Joker',
    'Chaos Reign', 'Lady Luck', 'Phantom', 'Wild Thing', 'Maverick', 'Rogue',
    'Wildcard', 'Ace', 'Jester', 'Trickster', 'Enigma', 'Paradox',
  ],
  'Mudblood': [
    'Pebbles', 'Muddy', 'Puddle', 'Mudslinger', 'Swamp Runner', 'Clay Hooves',
    'Bog Beast', 'Marsh Walker', 'Swamp Titan', 'Quicksand', 'Sludge', 'Mire',
    'Wetlands', 'Bog Trotter', 'Marsh King', 'Slick', 'Gumbo', 'Delta',
  ],
  'Royal Line': [
    'Noble', 'Duchess', 'Marquis', 'Countess', 'Baron', 'Prince Charming',
    'Princess Royal', 'Sovereign', 'Emperor', 'Empress', 'Majesty', 'Regal',
    'Crown Jewel', 'Royal Flush', 'Aristocrat', 'Duke', 'Earl', 'Viscount',
  ],
}

const JOCKEY_FIRST_NAMES = [
  'Sam', 'Alex', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Taylor', 'Jamie',
  'Ash', 'Blake', 'Cameron', 'Dakota', 'Ellis', 'Finley', 'Gray', 'Harper',
  'Kai', 'Logan', 'Mika', 'Nico', 'Parker', 'Quinn', 'Reese', 'Sage',
  'Skyler', 'Tanner', 'Val', 'West', 'Zion', 'River',
]

const JOCKEY_LAST_NAMES = [
  'Martinez', 'O\'Brien', 'Chen', 'Singh', 'Kim', 'Rodriguez', 'Nguyen', 'Patel',
  'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Moore',
  'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson',
  'Young', 'Lee', 'Walker', 'Hall', 'Allen', 'King',
]

// ============================================================================
// STAT BUDGET HELPERS
// ============================================================================

interface StatBudget {
  min: number
  max: number
  total: number
}

const HORSE_STAT_BUDGETS: Record<1 | 2 | 3 | 4, StatBudget> = {
  1: { min: 4, max: 6, total: 21 }, // Tier 1: 20-22 points
  2: { min: 4, max: 7, total: 23 }, // Tier 2: 21-24 points
  3: { min: 5, max: 8, total: 26 }, // Tier 3: 24-28 points
  4: { min: 6, max: 9, total: 29 }, // Tier 4: 27-31 points
}

const JOCKEY_STAT_BUDGETS: Record<number, StatBudget> = {
  1: { min: 3, max: 5, total: 13 }, // Budget jockey: 12-14 points
  2: { min: 4, max: 6, total: 16 }, // Average jockey: 15-18 points
  3: { min: 5, max: 7, total: 19 }, // Good jockey: 18-21 points
  4: { min: 6, max: 8, total: 22 }, // Elite jockey: 21-24 points
}

/**
 * Distribute stat budget across multiple stats
 * Uses a weighted random approach to create varied distributions
 */
function distributeStatBudget(
  budget: number,
  statCount: number,
  min: number,
  max: number
): number[] {
  const stats: number[] = Array(statCount).fill(min)
  let remaining = budget - min * statCount

  // Distribute remaining points with slight randomness
  while (remaining > 0) {
    const statIndex = Math.floor(Math.random() * statCount)
    if (stats[statIndex] < max) {
      stats[statIndex]++
      remaining--
    }
  }

  // Shuffle to avoid always having high stats in same position
  return stats.sort(() => Math.random() - 0.5)
}

// ============================================================================
// BLOODLINE SPECIALIZATIONS
// ============================================================================

/**
 * Apply bloodline-specific stat tendencies
 * Each bloodline favors certain stats
 */
function applyBloodlineSpecialization(
  stats: { speed: number; stamina: number; grit: number; temper: number },
  bloodline: Bloodline
): void {
  switch (bloodline) {
    case 'Desert Wind': // Speed-focused
      stats.speed = Math.min(10, stats.speed + 1)
      break
    case 'Northern Storm': // Grit-focused
      stats.grit = Math.min(10, stats.grit + 1)
      break
    case 'Iron Heart': // Stamina-focused
      stats.stamina = Math.min(10, stats.stamina + 1)
      break
    case 'Wild Card': // Temper-focused (high variance)
      stats.temper = Math.min(10, stats.temper + 1)
      break
    case 'Mudblood': // Grit-focused
      stats.grit = Math.min(10, stats.grit + 1)
      break
    case 'Royal Line': // Balanced (no adjustment)
      break
  }
}

// ============================================================================
// HORSE GENERATOR
// ============================================================================

let horseCounter = 0

export function generateHorse(tier: 1 | 2 | 3 | 4, bloodline?: Bloodline): Horse {
  const id = `horse-${++horseCounter}`

  // Random bloodline if not specified
  const bloodlines: Bloodline[] = [
    'Desert Wind',
    'Northern Storm',
    'Iron Heart',
    'Wild Card',
    'Mudblood',
    'Royal Line',
  ]
  const selectedBloodline = bloodline || bloodlines[Math.floor(Math.random() * bloodlines.length)]

  // Random name from bloodline pool
  const namePool = HORSE_NAMES_BY_BLOODLINE[selectedBloodline]
  const name = namePool[Math.floor(Math.random() * namePool.length)]

  // Generate stats based on tier budget
  const budget = HORSE_STAT_BUDGETS[tier]
  const statValues = distributeStatBudget(budget.total, 4, budget.min, budget.max)

  const stats = {
    speed: statValues[0],
    stamina: statValues[1],
    grit: statValues[2],
    temper: statValues[3],
  }

  // Apply bloodline specialization
  applyBloodlineSpecialization(stats, selectedBloodline)

  // Generate training potential (only for Tier 2+)
  const potential = { ...stats }
  if (tier >= 2) {
    const potentialGain = tier === 2 ? 6 : tier === 3 ? 5 : 6
    // Randomly distribute potential points
    for (let i = 0; i < potentialGain; i++) {
      const statKeys = Object.keys(potential) as Array<keyof typeof potential>
      const randomStat = statKeys[Math.floor(Math.random() * statKeys.length)]
      if (potential[randomStat] < 10) {
        potential[randomStat]++
      }
    }
  }

  // Generate ability for Tier 3+
  const ability = tier >= 3 ? generateHorseAbility(tier as 3 | 4, selectedBloodline) : undefined

  // Calculate cost
  const cost = tier === 1 ? 2 : tier === 2 ? 3 : tier === 3 ? 5 : 7

  return {
    id,
    name,
    tier,
    bloodline: selectedBloodline,
    stats,
    potential,
    ability,
    cost,
  }
}

function generateHorseAbility(tier: 3 | 4, bloodline: Bloodline) {
  const abilities = {
    'Desert Wind': {
      name: 'Heat Resistance',
      description: '+1 Speed on dry/sand tracks',
      effect: { type: 'surface_bonus', surface: ['dry_dirt', 'sand'], speedBonus: 1 },
    },
    'Northern Storm': {
      name: 'Weatherproof',
      description: '+1 Speed in wet/frozen conditions',
      effect: { type: 'surface_bonus', surface: ['wet_muddy', 'frozen'], speedBonus: 1 },
    },
    'Iron Heart': {
      name: 'Endurance',
      description: 'Stamina drains 15% slower',
      effect: { type: 'stamina_efficiency', multiplier: 0.85 },
    },
    'Wild Card': {
      name: 'Chaos Factor',
      description: 'Temper variance increased 50%',
      effect: { type: 'variance_multiplier', multiplier: 1.5 },
    },
    'Mudblood': {
      name: 'Mud Runner',
      description: '+1 Grit on wet tracks',
      effect: { type: 'surface_bonus', surface: ['wet_muddy'], gritBonus: 1 },
    },
    'Royal Line': {
      name: 'Noble Blood',
      description: '+1 to all stats when in top 3',
      effect: { type: 'position_bonus', minPosition: 3, allStats: 1 },
    },
  }

  return abilities[bloodline]
}

// ============================================================================
// JOCKEY GENERATOR
// ============================================================================

let jockeyCounter = 0

// Generate a free "drunken jockey" with very low stats and no upkeep
export function generateDrunkenJockey(): Jockey {
  const id = `jockey-drunk-${++jockeyCounter}`
  const drunkNames = [
    'Tipsy Tim', 'Wobbly Wilson', 'Stagger Stan', 'Dizzy Duke',
    'Sway Steve', 'Stumble Sam', 'Wobbles McGee', 'Hiccup Harry'
  ]
  const name = drunkNames[Math.floor(Math.random() * drunkNames.length)]

  return {
    id,
    name,
    stats: {
      skill: 1,
      timing: 1,
      weight: 3, // A bit heavy from all the drinking
    },
    trait: undefined,
    hireCost: 0,
    upkeepCost: 0,
  }
}

export function generateJockey(quality: 1 | 2 | 3 | 4 = 2, trait?: JockeyTrait): Jockey {
  const id = `jockey-${++jockeyCounter}`

  // Random name
  const firstName = JOCKEY_FIRST_NAMES[Math.floor(Math.random() * JOCKEY_FIRST_NAMES.length)]
  const lastName = JOCKEY_LAST_NAMES[Math.floor(Math.random() * JOCKEY_LAST_NAMES.length)]
  const name = `${firstName} ${lastName}`

  // Generate stats based on quality
  const budget = JOCKEY_STAT_BUDGETS[quality]
  const statValues = distributeStatBudget(budget.total, 3, budget.min, budget.max)

  const stats = {
    skill: statValues[0],
    timing: statValues[1],
    weight: statValues[2],
  }

  // Assign random trait for quality 3+
  const traits: JockeyTrait[] = [
    'Mudder',
    'Closer',
    'Front-Runner',
    'Horse Whisperer',
    'Lightweight',
    'Veteran',
    'Lucky',
  ]
  const assignedTrait = quality >= 3 && !trait
    ? traits[Math.floor(Math.random() * traits.length)]
    : trait

  // Jockeys are now free to hire and maintain (economy rebalancing)
  const hireCost = 0
  const upkeepCost = 0

  return {
    id,
    name,
    stats,
    trait: assignedTrait,
    hireCost,
    upkeepCost,
  }
}

// ============================================================================
// EQUIPMENT GENERATOR
// ============================================================================

let equipmentCounter = 0

export function generateEquipment(slot: EquipmentSlot, quality: 1 | 2 | 3 = 2): Equipment {
  const id = `equipment-${++equipmentCounter}`

  const equipmentTemplates = {
    saddle: [
      {
        name: 'Racing Saddle',
        effects: { speedMod: 1, staminaMod: -1 },
        cost: 2,
      },
      {
        name: 'Endurance Saddle',
        effects: { staminaMod: 2 },
        cost: 3,
      },
      {
        name: 'Balanced Saddle',
        effects: { staminaMod: 1, timingMod: 1 },
        cost: 3,
      },
      {
        name: 'Featherweight Saddle',
        effects: { weightMod: -2 },
        cost: 4,
      },
    ],
    horseshoes: [
      {
        name: 'Speed Shoes',
        effects: { speedMod: 1 },
        cost: 2,
      },
      {
        name: 'Mud Cleats',
        effects: { ignoreTerrainPenalty: 'wet_muddy' as const },
        cost: 3,
      },
      {
        name: 'Grip Shoes',
        effects: { gritMod: 2 },
        cost: 3,
      },
      {
        name: 'Lucky Horseshoe',
        effects: { stumbleAvoidance: 20 },
        cost: 4,
      },
    ],
    blinders: [
      {
        name: 'Calming Blinders',
        effects: { temperMod: -2 },
        cost: 2,
      },
      {
        name: 'Focus Blinders',
        effects: { skillMod: 1 },
        cost: 3,
      },
      {
        name: 'Tunnel Vision',
        effects: { temperMod: -3, gritMod: -1 },
        cost: 3,
      },
      {
        name: 'Champion\'s Blinders',
        effects: {
          conditional: {
            condition: 'position <= 3',
            effect: { speedMod: 1 },
          },
        },
        cost: 4,
      },
    ],
  }

  const templates = equipmentTemplates[slot]
  const template = templates[Math.min(quality - 1, templates.length - 1)]

  return {
    id,
    name: template.name,
    slot,
    effects: template.effects,
    cost: template.cost,
  }
}

// ============================================================================
// SHOP GENERATION
// ============================================================================

/**
 * Generate a shop offering for a specific round
 * Shop composition changes based on round progression
 */
export function generateShopOffering(round: number): {
  horses: Horse[]
  jockeys: Jockey[]
  equipment: Equipment[]
} {
  // Determine tier availability based on round (from PRD)
  const tierWeights = getTierWeights(round)

  // Generate 5 horses with weighted tier selection
  const horses: Horse[] = []
  for (let i = 0; i < 5; i++) {
    const tier = selectWeightedTier(tierWeights)
    horses.push(generateHorse(tier))
  }

  // Generate jockeys (mixed quality + always include a free drunken jockey)
  const jockeys: Jockey[] = [
    generateDrunkenJockey(), // Free but terrible jockey (no upkeep)
    generateJockey(1), // Budget jockey
    generateJockey(2), // Average jockey
    generateJockey(Math.random() > 0.5 ? 2 : 3), // Variable quality
  ]

  // Generate 3 equipment items (one per slot)
  const equipment: Equipment[] = [
    generateEquipment('saddle', Math.ceil(Math.random() * 3) as 1 | 2 | 3),
    generateEquipment('horseshoes', Math.ceil(Math.random() * 3) as 1 | 2 | 3),
    generateEquipment('blinders', Math.ceil(Math.random() * 3) as 1 | 2 | 3),
  ]

  return { horses, jockeys, equipment }
}

/**
 * Get tier weights based on round progression (from PRD Section 11.1)
 */
function getTierWeights(round: number): Record<1 | 2 | 3 | 4, number> {
  if (round === 1) {
    return { 1: 1.0, 2: 0.0, 3: 0.0, 4: 0.0 }
  }
  if (round === 2) {
    return { 1: 0.7, 2: 0.3, 3: 0.0, 4: 0.0 }
  }
  if (round >= 3 && round <= 4) {
    return { 1: 0.4, 2: 0.4, 3: 0.2, 4: 0.0 }
  }
  if (round >= 5 && round <= 6) {
    return { 1: 0.2, 2: 0.3, 3: 0.3, 4: 0.2 }
  }
  // Round 7+
  return { 1: 0.1, 2: 0.25, 3: 0.35, 4: 0.3 }
}

/**
 * Select a tier based on weighted probabilities
 */
function selectWeightedTier(weights: Record<1 | 2 | 3 | 4, number>): 1 | 2 | 3 | 4 {
  const rand = Math.random()
  let cumulative = 0

  for (const tier of [1, 2, 3, 4] as const) {
    cumulative += weights[tier]
    if (rand <= cumulative) {
      return tier
    }
  }

  return 1 // Fallback
}

// ============================================================================
// LEGACY AI COMPATIBILITY (for existing code)
// ============================================================================

export function generateAIHorse(tier: 1 | 2 | 3 | 4 = 2): Horse {
  return generateHorse(tier)
}

export function generateAIJockey(): Jockey {
  return generateJockey(2)
}

export function generateAIRaceEntry(playerNumber: number): {
  playerId: string
  playerName: string
  horse: Horse
  jockey: Jockey
  equipment: Record<string, unknown>
  strategy: Record<string, unknown>
} {
  return {
    playerId: `ai-player-${playerNumber}`,
    playerName: `AI Racer ${playerNumber}`,
    horse: generateAIHorse(2),
    jockey: generateAIJockey(),
    equipment: {},
    strategy: { baseStaminaBurn: 1.0, surgePhases: [] },
  }
}
