import type { Horse, Jockey, Equipment } from '@/types/game'
import { generateShopOffering } from './generators'

/**
 * Shop system for Thunder Hooves
 * Uses procedural generators to create balanced shop offerings
 */

export interface ShopInventory {
  horses: Horse[]
  jockeys: Jockey[]
  equipment: Equipment[]
}

/**
 * Generate a shop inventory for a given round
 * Shop composition evolves based on round progression (PRD Section 11.1)
 */
export function generateShopInventory(round: number): ShopInventory {
  return generateShopOffering(round)
}

/**
 * Calculate the cost to train a single stat point
 * Training costs increase as stats get higher (PRD Section 5.2)
 */
export function getTrainingCost(currentStatValue: number): number {
  if (currentStatValue <= 3) return 2
  if (currentStatValue <= 6) return 3
  if (currentStatValue <= 8) return 4
  return 5 // stat value 9
}

/**
 * Generate available training options for a horse
 * Shows which stats can be trained and their costs
 */
export function getTrainingOptions(horse: Horse): Array<{
  stat: 'speed' | 'stamina' | 'grit' | 'temper'
  currentValue: number
  potentialValue: number
  cost: number
  canTrain: boolean
}> {
  const stats: Array<'speed' | 'stamina' | 'grit' | 'temper'> = [
    'speed',
    'stamina',
    'grit',
    'temper',
  ]

  return stats.map((stat) => {
    const currentValue = horse.stats[stat]
    const potentialValue = horse.potential[stat]
    const canTrain = currentValue < potentialValue
    const cost = canTrain ? getTrainingCost(currentValue) : 0

    return {
      stat,
      currentValue,
      potentialValue,
      cost,
      canTrain,
    }
  })
}

/**
 * Apply training to a horse (mutates the horse object)
 */
export function trainHorseStat(
  horse: Horse,
  stat: 'speed' | 'stamina' | 'grit' | 'temper'
): boolean {
  if (horse.stats[stat] >= horse.potential[stat]) {
    return false // Already at max potential
  }

  horse.stats[stat]++
  return true
}

/**
 * Sell price is 50% of purchase cost (PRD Section 10.3)
 * For jockeys, there's no sell price - they are fired, not sold
 */
export function getSellPrice(item: Horse | Jockey | Equipment): number {
  if ('hireCost' in item) {
    // Jockeys can't be sold, only fired
    return 0
  }
  return Math.floor(item.cost / 2)
}

/**
 * Reroll cost is fixed at 2 gold (PRD Section 2.2)
 */
export const REROLL_COST = 2
