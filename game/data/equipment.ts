import type { Equipment } from '@/types/game'

/**
 * Equipment data from PRD Section 8
 * Saddles, Horseshoes, and Blinders with their effects and costs
 */

// Saddle equipment - affects Stamina and jockey effectiveness
export const saddles: Equipment[] = [
  {
    id: 'racing-saddle',
    name: 'Racing Saddle',
    slot: 'saddle',
    cost: 2,
    effects: {
      speedMod: 1,
      staminaMod: -1,
    },
  },
  {
    id: 'endurance-saddle',
    name: 'Endurance Saddle',
    slot: 'saddle',
    cost: 3,
    effects: {
      staminaMod: 2,
    },
  },
  {
    id: 'balanced-saddle',
    name: 'Balanced Saddle',
    slot: 'saddle',
    cost: 3,
    effects: {
      staminaMod: 1,
      timingMod: 1,
    },
  },
  {
    id: 'featherweight-saddle',
    name: 'Featherweight Saddle',
    slot: 'saddle',
    cost: 4,
    effects: {
      weightMod: -2,
    },
  },
]

// Horseshoe equipment - affects Speed and terrain handling
export const horseshoes: Equipment[] = [
  {
    id: 'speed-shoes',
    name: 'Speed Shoes',
    slot: 'horseshoes',
    cost: 2,
    effects: {
      speedMod: 1,
    },
  },
  {
    id: 'mud-cleats',
    name: 'Mud Cleats',
    slot: 'horseshoes',
    cost: 3,
    effects: {
      ignoreTerrainPenalty: 'wet_muddy',
    },
  },
  {
    id: 'grip-shoes',
    name: 'Grip Shoes',
    slot: 'horseshoes',
    cost: 3,
    effects: {
      gritMod: 2,
    },
  },
  {
    id: 'lucky-horseshoe',
    name: 'Lucky Horseshoe',
    slot: 'horseshoes',
    cost: 4,
    effects: {
      stumbleAvoidance: 0.2,
    },
  },
]

// Blinder equipment - affects Temper and focus
export const blinders: Equipment[] = [
  {
    id: 'calming-blinders',
    name: 'Calming Blinders',
    slot: 'blinders',
    cost: 2,
    effects: {
      temperMod: -2,
    },
  },
  {
    id: 'focus-blinders',
    name: 'Focus Blinders',
    slot: 'blinders',
    cost: 3,
    effects: {
      skillMod: 1,
    },
  },
  {
    id: 'tunnel-vision',
    name: 'Tunnel Vision',
    slot: 'blinders',
    cost: 3,
    effects: {
      temperMod: -3,
      gritMod: -1,
    },
  },
  {
    id: 'champions-blinders',
    name: "Champion's Blinders",
    slot: 'blinders',
    cost: 4,
    effects: {
      conditional: {
        condition: 'top_3',
        effect: { speedMod: 1 },
      },
    },
  },
]

// All equipment combined
export const allEquipment: Equipment[] = [
  ...saddles,
  ...horseshoes,
  ...blinders,
]

// Helper function to get equipment by slot
export function getEquipmentBySlot(slot: 'saddle' | 'horseshoes' | 'blinders'): Equipment[] {
  switch (slot) {
    case 'saddle':
      return saddles
    case 'horseshoes':
      return horseshoes
    case 'blinders':
      return blinders
  }
}

// Helper function to get equipment by ID
export function getEquipmentById(id: string): Equipment | undefined {
  return allEquipment.find((item) => item.id === id)
}

// Helper function to get equipment by cost range
export function getEquipmentByCostRange(minCost: number, maxCost: number): Equipment[] {
  return allEquipment.filter((item) => item.cost >= minCost && item.cost <= maxCost)
}

// Helper function to get affordable equipment based on player gold
export function getAffordableEquipment(gold: number): Equipment[] {
  return allEquipment.filter((item) => item.cost <= gold)
}
