import type { Horse } from '@/types/game'

/**
 * Horse data from PRD Appendix A
 * All horses with their stats, bloodlines, and tier information
 */

// Tier 1 Horses - Basic stat distributions, no abilities
export const tier1Horses: Horse[] = [
  {
    id: 'dusty',
    name: 'Dusty',
    tier: 1,
    bloodline: 'Desert Wind',
    stats: {
      speed: 6,
      stamina: 5,
      grit: 5,
      temper: 5,
    },
    potential: {
      speed: 7,
      stamina: 6,
      grit: 6,
      temper: 5,
    },
    cost: 2,
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    tier: 1,
    bloodline: 'Northern Storm',
    stats: {
      speed: 5,
      stamina: 6,
      grit: 6,
      temper: 4,
    },
    potential: {
      speed: 6,
      stamina: 7,
      grit: 7,
      temper: 4,
    },
    cost: 2,
  },
  {
    id: 'sparky',
    name: 'Sparky',
    tier: 1,
    bloodline: 'Wild Card',
    stats: {
      speed: 7,
      stamina: 4,
      grit: 5,
      temper: 5,
    },
    potential: {
      speed: 8,
      stamina: 5,
      grit: 6,
      temper: 5,
    },
    cost: 2,
  },
  {
    id: 'pebbles',
    name: 'Pebbles',
    tier: 1,
    bloodline: 'Mudblood',
    stats: {
      speed: 5,
      stamina: 5,
      grit: 7,
      temper: 4,
    },
    potential: {
      speed: 6,
      stamina: 6,
      grit: 8,
      temper: 4,
    },
    cost: 2,
  },
]

// Tier 2 Horses - Specialist distributions, bloodline focus
export const tier2Horses: Horse[] = [
  {
    id: 'thunderbolt',
    name: 'Thunderbolt',
    tier: 2,
    bloodline: 'Desert Wind',
    stats: {
      speed: 7,
      stamina: 3,
      grit: 4,
      temper: 6,
    },
    potential: {
      speed: 9,
      stamina: 5,
      grit: 6,
      temper: 8,
    },
    cost: 3,
  },
  {
    id: 'mudslinger',
    name: 'Mudslinger',
    tier: 2,
    bloodline: 'Mudblood',
    stats: {
      speed: 5,
      stamina: 7,
      grit: 8,
      temper: 4,
    },
    potential: {
      speed: 6,
      stamina: 9,
      grit: 9,
      temper: 5,
    },
    cost: 3,
  },
  {
    id: 'steady-eddie',
    name: 'Steady Eddie',
    tier: 2,
    bloodline: 'Iron Heart',
    stats: {
      speed: 6,
      stamina: 6,
      grit: 6,
      temper: 3,
    },
    potential: {
      speed: 7,
      stamina: 8,
      grit: 7,
      temper: 4,
    },
    cost: 3,
  },
]

// Tier 3 Horses - Unique passive abilities
export const tier3Horses: Horse[] = [
  {
    id: 'chaos-reign',
    name: 'Chaos Reign',
    tier: 3,
    bloodline: 'Wild Card',
    stats: {
      speed: 8,
      stamina: 5,
      grit: 5,
      temper: 9,
    },
    potential: {
      speed: 9,
      stamina: 7,
      grit: 6,
      temper: 10,
    },
    cost: 4,
    ability: {
      name: 'Explosive',
      description: 'Double Temper variance (very good or very bad)',
      effect: 'temper_variance_multiplier',
    },
  },
  {
    id: 'iron-will',
    name: 'Iron Will',
    tier: 3,
    bloodline: 'Iron Heart',
    stats: {
      speed: 5,
      stamina: 8,
      grit: 7,
      temper: 4,
    },
    potential: {
      speed: 6,
      stamina: 10,
      grit: 9,
      temper: 5,
    },
    cost: 4,
    ability: {
      name: 'Endurance',
      description: 'No Stamina penalty in final 20%',
      effect: 'finish_stamina_bonus',
    },
  },
  {
    id: 'storm-chaser',
    name: 'Storm Chaser',
    tier: 3,
    bloodline: 'Northern Storm',
    stats: {
      speed: 7,
      stamina: 6,
      grit: 7,
      temper: 5,
    },
    potential: {
      speed: 9,
      stamina: 7,
      grit: 9,
      temper: 6,
    },
    cost: 4,
    ability: {
      name: 'Weatherproof',
      description: '+2 Speed in bad conditions',
      effect: 'bad_weather_speed_bonus',
    },
  },
]

// Tier 4 Horses - Powerful abilities, legendary horses
export const tier4Horses: Horse[] = [
  {
    id: 'sovereign',
    name: 'Sovereign',
    tier: 4,
    bloodline: 'Royal Line',
    stats: {
      speed: 8,
      stamina: 7,
      grit: 6,
      temper: 5,
    },
    potential: {
      speed: 10,
      stamina: 9,
      grit: 8,
      temper: 6,
    },
    cost: 5,
    ability: {
      name: 'Majesty',
      description: 'All owned horses gain +1 to highest stat',
      effect: 'stable_stat_bonus',
    },
  },
  {
    id: 'phantom',
    name: 'Phantom',
    tier: 4,
    bloodline: 'Wild Card',
    stats: {
      speed: 9,
      stamina: 5,
      grit: 6,
      temper: 7,
    },
    potential: {
      speed: 10,
      stamina: 7,
      grit: 7,
      temper: 9,
    },
    cost: 5,
    ability: {
      name: 'Ghost',
      description: '25% chance to ignore one stumble',
      effect: 'stumble_avoidance',
    },
  },
  {
    id: 'titan',
    name: 'Titan',
    tier: 4,
    bloodline: 'Iron Heart',
    stats: {
      speed: 6,
      stamina: 9,
      grit: 9,
      temper: 3,
    },
    potential: {
      speed: 7,
      stamina: 10,
      grit: 10,
      temper: 4,
    },
    cost: 5,
    ability: {
      name: 'Unstoppable',
      description: 'Cannot be slowed below 80% base Speed',
      effect: 'minimum_speed_percentage',
    },
  },
]

// All horses combined
export const allHorses: Horse[] = [
  ...tier1Horses,
  ...tier2Horses,
  ...tier3Horses,
  ...tier4Horses,
]

// Helper function to get horses by tier
export function getHorsesByTier(tier: number): Horse[] {
  switch (tier) {
    case 1:
      return tier1Horses
    case 2:
      return tier2Horses
    case 3:
      return tier3Horses
    case 4:
      return tier4Horses
    default:
      return []
  }
}

// Helper function to get a horse by ID
export function getHorseById(id: string): Horse | undefined {
  return allHorses.find((horse) => horse.id === id)
}

// Helper function to get horses by bloodline
export function getHorsesByBloodline(bloodline: string): Horse[] {
  return allHorses.filter((horse) => horse.bloodline === bloodline)
}
