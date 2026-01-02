/**
 * Stat calculation utilities based on PRD Section 3
 * All formulas match the specifications exactly
 */

import type { Horse, Jockey, Equipment, DerivedStats, SurfaceCondition, Bloodline } from '@/types/game'

/**
 * Calculate derived stats from horse + jockey + equipment combination
 * PRD Section 3.3
 */
export function calculateDerivedStats(
  horse: Horse,
  jockey: Jockey,
  equipment: {
    saddle?: Equipment
    horseshoes?: Equipment
    blinders?: Equipment
  },
  terrain?: SurfaceCondition,
  bloodlineBonuses?: {
    speed: number
    stamina: number
    grit: number
    temper: number
    ignoreTerrain: boolean
    temperReroll: boolean
    gainSpeedInMud: boolean
    favorableVariance: boolean
  },
): DerivedStats {
  // Apply equipment modifiers to base stats
  let modifiedHorseStats = applyEquipmentModifiers(horse, equipment)
  const modifiedJockeyStats = applyEquipmentModifiers(jockey, equipment)

  // Apply bloodline bonuses to horse stats
  if (bloodlineBonuses) {
    modifiedHorseStats = {
      ...modifiedHorseStats,
      speed: modifiedHorseStats.speed + bloodlineBonuses.speed,
      stamina: modifiedHorseStats.stamina + bloodlineBonuses.stamina,
      grit: modifiedHorseStats.grit + bloodlineBonuses.grit,
      temper: modifiedHorseStats.temper + bloodlineBonuses.temper,
    }
  }

  // Apply Mudder trait: +2 Grit on wet/muddy tracks
  if (jockey.trait === 'Mudder' && terrain === 'wet_muddy') {
    modifiedHorseStats = {
      ...modifiedHorseStats,
      grit: modifiedHorseStats.grit + 2,
    }
  }

  // Base Speed = Horse.Speed + (10 - Jockey.Weight) × 0.5
  const baseSpeed =
    modifiedHorseStats.speed + (10 - modifiedJockeyStats.weight) * 0.5

  // Stamina Pool = Horse.Stamina × (1 + Jockey.Timing × 0.1)
  const staminaPool =
    modifiedHorseStats.stamina * (1 + modifiedJockeyStats.timing * 0.1)

  // Burn Rate = Base cost per tick, reduced by Jockey.Timing
  // Base burn rate is 1.0, reduced by 5% per timing point
  const burnRate = 1.0 * (1 - modifiedJockeyStats.timing * 0.05)

  // Check if equipment ignores terrain penalty
  const shouldIgnoreTerrain = checkEquipmentIgnoresTerrain(equipment, terrain)

  // Check if bloodline bonuses ignore terrain
  const bloodlineIgnoresTerrain = bloodlineBonuses?.ignoreTerrain || false

  // Terrain Mod = Horse.Grit determines penalty reduction
  const terrainMod = (shouldIgnoreTerrain || bloodlineIgnoresTerrain)
    ? 1.0
    : calculateTerrainModifier(
        modifiedHorseStats.grit,
        terrain,
        bloodlineBonuses?.gainSpeedInMud,
      )

  // Efficiency = Jockey.Skill reduces wasted movement, improves jumps
  // PRD Section 3.5
  const efficiency = 1 + modifiedJockeyStats.skill * 0.02 // Pathing bonus

  // Apply Horse Whisperer trait: -3 effective Temper
  let effectiveTemper = modifiedHorseStats.temper
  if (jockey.trait === 'Horse Whisperer') {
    effectiveTemper = Math.max(1, effectiveTemper - 3)
  }

  // Consistency = f(Horse.Temper, Jockey.Weight)
  // PRD Section 3.4
  let consistency = calculateConsistency(
    effectiveTemper,
    modifiedJockeyStats.weight,
  )

  // Apply Chaos Factor ability (Wild Card): variance increased 50%
  if (horse.ability?.name === 'Chaos Factor') {
    consistency = {
      ...consistency,
      variance: consistency.variance * 1.5,
    }
  }

  return {
    baseSpeed,
    staminaPool,
    burnRate,
    terrainMod,
    efficiency,
    consistency,
  }
}

/**
 * Calculate consistency based on Temper/Weight interaction
 * PRD Section 3.4
 */
function calculateConsistency(
  temper: number,
  weight: number,
): { variance: number; isStable: boolean } {
  const temperThreshold = weight + 2

  if (temper <= temperThreshold) {
    // High consistency
    return {
      variance: 0.05, // ±5%
      isStable: true,
    }
  } else {
    // Low consistency - variance increases with gap
    const variance = (temper - temperThreshold) * 0.08
    return {
      variance,
      isStable: false,
    }
  }
}

/**
 * Check if equipment ignores terrain penalties
 */
function checkEquipmentIgnoresTerrain(
  equipment: {
    saddle?: Equipment
    horseshoes?: Equipment
    blinders?: Equipment
  },
  terrain?: SurfaceCondition,
): boolean {
  if (!terrain) return false

  const allEquipment = [equipment.saddle, equipment.horseshoes, equipment.blinders].filter(
    (item): item is Equipment => Boolean(item && item.effects),
  )

  for (const item of allEquipment) {
    if (item.effects.ignoreTerrainPenalty === terrain) {
      return true
    }
  }

  return false
}

/**
 * Calculate terrain modifier based on Grit and surface condition
 */
function calculateTerrainModifier(
  grit: number,
  terrain?: SurfaceCondition,
  gainSpeedInMud?: boolean,
): number {
  if (!terrain || terrain === 'dry_dirt') {
    return 1.0 // No modifier on dry dirt
  }

  // Higher grit reduces terrain penalties
  // Each point of grit reduces penalty by 1% (10 grit = 10% reduction)
  const gritReduction = grit * 0.01

  switch (terrain) {
    case 'wet_muddy':
      // Mudblood 3+ bonus: gain speed in mud instead of penalty
      if (gainSpeedInMud) {
        return 1.1 // +10% speed bonus in mud
      }
      // -15% speed penalty, reduced by grit (each grit point reduces penalty by 1%)
      // Clamped so it can't go above 1.0 (no bonus) but can be a penalty
      return Math.min(0.85 + gritReduction, 1.0)

    case 'turf_grass':
      // +5% speed bonus (not affected by grit)
      return 1.05

    case 'rocky':
      // Stumble chance, grit helps (handled in race simulation)
      return 1.0

    case 'sand':
      // No direct speed penalty, but stamina drain (handled separately)
      return 1.0

    case 'frozen':
      // -10% speed penalty, reduced by grit (each grit point reduces penalty by 1%)
      // Clamped so it can't go above 1.0 (no bonus) but can be a penalty
      return Math.min(0.9 + gritReduction, 1.0)

    default:
      return 1.0
  }
}

/**
 * Apply equipment modifiers to stats
 */
function applyEquipmentModifiers(
  entity: { stats: any },
  equipment: {
    saddle?: Equipment
    horseshoes?: Equipment
    blinders?: Equipment
  },
): any {
  const modified = { ...entity.stats }

  const allEquipment = [equipment.saddle, equipment.horseshoes, equipment.blinders].filter(
    (item): item is Equipment => Boolean(item && item.effects),
  )

  for (const item of allEquipment) {
    if (item.effects.speedMod) modified.speed = (modified.speed || 0) + item.effects.speedMod
    if (item.effects.staminaMod)
      modified.stamina = (modified.stamina || 0) + item.effects.staminaMod
    if (item.effects.gritMod) modified.grit = (modified.grit || 0) + item.effects.gritMod
    if (item.effects.temperMod)
      modified.temper = (modified.temper || 0) + item.effects.temperMod
    if (item.effects.skillMod) modified.skill = (modified.skill || 0) + item.effects.skillMod
    if (item.effects.timingMod)
      modified.timing = (modified.timing || 0) + item.effects.timingMod
    if (item.effects.weightMod)
      modified.weight = (modified.weight || 0) + item.effects.weightMod
  }

  return modified
}

/**
 * Calculate obstacle time cost based on jockey skill
 * PRD Section 3.5.1
 */
export function calculateObstacleTimeCost(
  baseTimeCost: number,
  jockeySkill: number,
): number {
  return baseTimeCost * (1 - jockeySkill * 0.05)
}

/**
 * Calculate stumble recovery time based on jockey skill
 * PRD Section 3.5.2
 */
export function calculateStumbleRecovery(
  baseRecoveryTime: number,
  jockeySkill: number,
): number {
  return baseRecoveryTime * (1 - jockeySkill * 0.08)
}

/**
 * Calculate power rating for betting odds
 * PRD Section 4.3
 */
export function calculatePowerRating(
  horse: Horse,
  jockey: Jockey,
  equipment: any,
  terrainFactor: number = 1.0,
): number {
  const derivedStats = calculateDerivedStats(horse, jockey, equipment)

  // Power Rating = (Speed × 1.2) + Stamina + (Grit × Terrain Factor) - (Temper Variance)
  const powerRating =
    horse.stats.speed * 1.2 +
    horse.stats.stamina +
    horse.stats.grit * terrainFactor -
    (horse.stats.temper * derivedStats.consistency.variance)

  return powerRating
}

/**
 * Calculate win probability for a participant
 * Used for betting odds calculation
 */
export function calculateWinProbability(
  participantPowerRating: number,
  allPowerRatings: number[],
): number {
  const totalPower = allPowerRatings.reduce((sum, rating) => sum + rating, 0)
  return participantPowerRating / totalPower
}

/**
 * Calculate betting payout multiplier
 * PRD Section 4.3
 */
export function calculatePayoutMultiplier(winProbability: number): number {
  const payout = 1 / winProbability
  return Math.min(payout, 8.0) // Capped at 8x
}

/**
 * Apply strategy modifiers to speed and stamina burn
 * PRD Section 9
 */
export function applyStrategyModifiers(
  phase: 'start' | 'mid' | 'finish',
  strategy: string,
  baseSpeed: number,
  baseBurn: number,
  currentStamina: number,
  maxStamina: number,
  rng: () => number = Math.random,
): { speed: number; burn: number } {
  let speedMod = 1.0
  let burnMod = 1.0

  if (phase === 'start') {
    switch (strategy) {
      case 'burst':
        speedMod = 1.3
        burnMod = 1.5
        break
      case 'hang_back':
        speedMod = 0.8
        burnMod = 0.7
        break
      case 'steady':
      default:
        // No modifiers
        break
    }
  } else if (phase === 'mid') {
    switch (strategy) {
      case 'push':
        speedMod = 1.15
        burnMod = 1.25
        break
      case 'conserve':
        speedMod = 0.9
        burnMod = 0.6
        break
      case 'react':
        // Would match leader's pace - simplified for now
        speedMod = 1.0
        burnMod = 1.0
        break
    }
  } else if (phase === 'finish') {
    switch (strategy) {
      case 'sprint':
        // Burn all remaining stamina for max speed
        const staminaBoost = Math.min(currentStamina / maxStamina, 1.0)
        speedMod = 1.0 + staminaBoost * 0.5
        burnMod = 3.0 // Burn stamina fast
        break
      case 'gamble':
        // High variance - uses temper for outcome
        speedMod = 1.0 + rng() * 0.6 // 0% to 60% boost
        burnMod = 1.5
        break
      case 'maintain':
      default:
        // Steady pace
        speedMod = 1.0
        burnMod = 1.0
        break
    }
  }

  return {
    speed: baseSpeed * speedMod,
    burn: baseBurn * burnMod,
  }
}

/**
 * Calculate bloodline bonuses based on stable composition
 * PRD Section 6.1-6.2
 *
 * Returns bonuses that should be applied to the racing horse based on how many
 * horses of each bloodline the player owns in their stable
 */
export function calculateBloodlineBonuses(
  racingHorse: Horse,
  playerStable: Horse[],
  terrain?: SurfaceCondition,
): {
  speed: number
  stamina: number
  grit: number
  temper: number
  ignoreTerrain: boolean
  temperReroll: boolean
  gainSpeedInMud: boolean
  favorableVariance: boolean
} {
  // Count horses by bloodline in player's stable
  const bloodlineCounts: Record<Bloodline, number> = {
    'Northern Storm': 0,
    'Desert Wind': 0,
    'Iron Heart': 0,
    'Wild Card': 0,
    'Mudblood': 0,
    'Royal Line': 0,
  }

  for (const horse of playerStable) {
    bloodlineCounts[horse.bloodline]++
  }

  const bonuses = {
    speed: 0,
    stamina: 0,
    grit: 0,
    temper: 0,
    ignoreTerrain: false,
    temperReroll: false,
    gainSpeedInMud: false,
    favorableVariance: false,
  }

  // Northern Storm: +1 Grit to all Northern Storm horses (2+), +1 Stamina to racing horse (3+)
  if (racingHorse.bloodline === 'Northern Storm') {
    if (bloodlineCounts['Northern Storm'] >= 2) {
      bonuses.grit += 1
    }
    if (bloodlineCounts['Northern Storm'] >= 3) {
      bonuses.stamina += 1
    }
  }

  // Desert Wind: +1 Speed on dry tracks (2+), Ignore heat/sand penalties (3+)
  if (racingHorse.bloodline === 'Desert Wind') {
    if (bloodlineCounts['Desert Wind'] >= 2 && (terrain === 'dry_dirt' || terrain === 'sand')) {
      bonuses.speed += 1
    }
    if (bloodlineCounts['Desert Wind'] >= 3 && (terrain === 'dry_dirt' || terrain === 'sand')) {
      bonuses.ignoreTerrain = true
    }
  }

  // Iron Heart: +1 Stamina (2+), +2 Stamina to racing horse (3+, total +3)
  if (racingHorse.bloodline === 'Iron Heart') {
    if (bloodlineCounts['Iron Heart'] >= 2) {
      bonuses.stamina += 1
    }
    if (bloodlineCounts['Iron Heart'] >= 3) {
      bonuses.stamina += 2 // Total will be +3 stamina
    }
  }

  // Wild Card: Temper variance becomes favorable only (2+), Can reroll Temper once (3+)
  if (racingHorse.bloodline === 'Wild Card') {
    // 2+ bonus: variance becomes favorable only (applied in RaceSimulator)
    if (bloodlineCounts['Wild Card'] >= 2) {
      bonuses.favorableVariance = true
    }
    // 3+ bonus: allow one temper reroll
    if (bloodlineCounts['Wild Card'] >= 3) {
      bonuses.temperReroll = true
    }
  }

  // Mudblood: +2 Grit on wet tracks (2+), Gain speed in mud instead of penalty (3+)
  if (racingHorse.bloodline === 'Mudblood') {
    if (bloodlineCounts['Mudblood'] >= 2 && terrain === 'wet_muddy') {
      bonuses.grit += 2
    }
    if (bloodlineCounts['Mudblood'] >= 3 && terrain === 'wet_muddy') {
      bonuses.gainSpeedInMud = true
    }
  }

  // Royal Line: +1 to all stats of highest-tier horse (2+)
  if (racingHorse.bloodline === 'Royal Line' && bloodlineCounts['Royal Line'] >= 2) {
    // Find highest tier horse in stable
    const highestTier = Math.max(...playerStable.map(h => h.tier))
    if (racingHorse.tier === highestTier) {
      bonuses.speed += 1
      bonuses.stamina += 1
      bonuses.grit += 1
      bonuses.temper += 1
    }
  }

  return bonuses
}
