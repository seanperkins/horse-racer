import type { Jockey } from '@/types/game'

/**
 * Jockey data from PRD Appendix B
 * All jockeys with their stats, traits, and costs
 */

export const allJockeys: Jockey[] = [
  {
    id: 'rookie-kate',
    name: 'Rookie Kate',
    stats: {
      skill: 5,
      timing: 4,
      weight: 4,
    },
    trait: undefined,
    hireCost: 2,
    upkeepCost: 1,
  },
  {
    id: 'feather-martinez',
    name: 'Feather Martinez',
    stats: {
      skill: 6,
      timing: 5,
      weight: 3,
    },
    trait: 'Lightweight',
    hireCost: 3,
    upkeepCost: 1,
  },
  {
    id: 'steady-sam',
    name: 'Steady Sam',
    stats: {
      skill: 6,
      timing: 6,
      weight: 5,
    },
    trait: undefined,
    hireCost: 3,
    upkeepCost: 1,
  },
  {
    id: 'old-jim',
    name: 'Old Jim',
    stats: {
      skill: 8,
      timing: 9,
      weight: 7,
    },
    trait: 'Veteran',
    hireCost: 4,
    upkeepCost: 2,
  },
  {
    id: 'anchor-adams',
    name: 'Anchor Adams',
    stats: {
      skill: 7,
      timing: 6,
      weight: 9,
    },
    trait: 'Horse Whisperer',
    hireCost: 4,
    upkeepCost: 2,
  },
  {
    id: 'lucky-lena',
    name: 'Lucky Lena',
    stats: {
      skill: 5,
      timing: 5,
      weight: 5,
    },
    trait: 'Lucky',
    hireCost: 3,
    upkeepCost: 1,
  },
  {
    id: 'dash-williams',
    name: 'Dash Williams',
    stats: {
      skill: 7,
      timing: 7,
      weight: 4,
    },
    trait: 'Front-Runner',
    hireCost: 4,
    upkeepCost: 2,
  },
  {
    id: 'marina-mud-murphy',
    name: 'Marina "Mud" Murphy',
    stats: {
      skill: 6,
      timing: 7,
      weight: 6,
    },
    trait: 'Mudder',
    hireCost: 3,
    upkeepCost: 1,
  },
]

// Additional jockeys to increase pool variety (not in PRD but useful for gameplay)
export const additionalJockeys: Jockey[] = [
  {
    id: 'swift-sarah',
    name: 'Swift Sarah',
    stats: {
      skill: 7,
      timing: 8,
      weight: 3,
    },
    trait: 'Closer',
    hireCost: 4,
    upkeepCost: 2,
  },
  {
    id: 'rocky-rhodes',
    name: 'Rocky Rhodes',
    stats: {
      skill: 8,
      timing: 5,
      weight: 6,
    },
    trait: undefined,
    hireCost: 3,
    upkeepCost: 1,
  },
  {
    id: 'tiny-tim',
    name: 'Tiny Tim',
    stats: {
      skill: 4,
      timing: 5,
      weight: 2,
    },
    trait: 'Lightweight',
    hireCost: 2,
    upkeepCost: 1,
  },
]

// All jockeys including additional ones
export const extendedJockeyPool: Jockey[] = [
  ...allJockeys,
  ...additionalJockeys,
]

// Helper function to get a jockey by ID
export function getJockeyById(id: string, includeExtended = true): Jockey | undefined {
  const pool = includeExtended ? extendedJockeyPool : allJockeys
  return pool.find((jockey) => jockey.id === id)
}

// Helper function to get jockeys by trait
export function getJockeysByTrait(traitName: string, includeExtended = true): Jockey[] {
  const pool = includeExtended ? extendedJockeyPool : allJockeys
  return pool.filter((jockey) => jockey.trait === traitName)
}

// Helper function to get jockeys by cost range
export function getJockeysByCostRange(minCost: number, maxCost: number, includeExtended = true): Jockey[] {
  const pool = includeExtended ? extendedJockeyPool : allJockeys
  return pool.filter((jockey) => jockey.hireCost >= minCost && jockey.hireCost <= maxCost)
}
