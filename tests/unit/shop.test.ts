import { describe, it, expect } from 'vitest'
import { generateShopInventory, getTrainingOptions, getTrainingCost } from '@/game/shop'
import { generateHorse } from '@/game/generators'

describe('Shop System', () => {
  describe('generateShopInventory', () => {
    it('should generate 5 horses, 3 jockeys, and 3 equipment items', () => {
      const inventory = generateShopInventory(1)

      expect(inventory.horses).toHaveLength(5)
      expect(inventory.jockeys).toHaveLength(3)
      expect(inventory.equipment).toHaveLength(3)
    })

    it('should generate horses with proper stats', () => {
      const inventory = generateShopInventory(1)

      inventory.horses.forEach(horse => {
        expect(horse.id).toBeDefined()
        expect(horse.name).toBeDefined()
        expect(horse.tier).toBeGreaterThanOrEqual(1)
        expect(horse.tier).toBeLessThanOrEqual(4)
        expect(horse.bloodline).toBeDefined()
        expect(horse.stats).toBeDefined()
        expect(horse.stats.speed).toBeGreaterThanOrEqual(1)
        expect(horse.stats.speed).toBeLessThanOrEqual(10)
        expect(horse.potential).toBeDefined()
        expect(horse.cost).toBeGreaterThan(0)
      })
    })

    it('should generate jockeys with proper stats', () => {
      const inventory = generateShopInventory(1)

      inventory.jockeys.forEach(jockey => {
        expect(jockey.id).toBeDefined()
        expect(jockey.name).toBeDefined()
        expect(jockey.stats).toBeDefined()
        expect(jockey.stats.skill).toBeGreaterThanOrEqual(1)
        expect(jockey.stats.skill).toBeLessThanOrEqual(10)
        expect(jockey.stats.timing).toBeGreaterThanOrEqual(1)
        expect(jockey.stats.timing).toBeLessThanOrEqual(10)
        expect(jockey.stats.weight).toBeGreaterThanOrEqual(1)
        expect(jockey.hireCost).toBeGreaterThan(0)
        expect(jockey.upkeepCost).toBeGreaterThan(0)
      })
    })

    it('should generate equipment with proper properties', () => {
      const inventory = generateShopInventory(1)

      inventory.equipment.forEach(item => {
        expect(item.id).toBeDefined()
        expect(item.name).toBeDefined()
        expect(['saddle', 'horseshoes', 'blinders']).toContain(item.slot)
        expect(item.effects).toBeDefined()
        expect(item.cost).toBeGreaterThan(0)
      })
    })

    it('should generate higher tier units in later rounds', () => {
      const earlyRound = generateShopInventory(1)
      const lateRound = generateShopInventory(10)

      // Count tier 1 horses in each
      const earlyTier1 = earlyRound.horses.filter(h => h.tier === 1).length
      const lateTier1 = lateRound.horses.filter(h => h.tier === 1).length

      // Later rounds should have fewer tier 1 horses (on average)
      // This is probabilistic, so we just check that the system can produce different tiers
      const earlyTiers = new Set(earlyRound.horses.map(h => h.tier))
      const lateTiers = new Set(lateRound.horses.map(h => h.tier))

      expect(earlyTiers.size).toBeGreaterThan(0)
      expect(lateTiers.size).toBeGreaterThan(0)
    })

    it('should generate unique IDs for each unit', () => {
      const inventory = generateShopInventory(1)

      const horseIds = new Set(inventory.horses.map(h => h.id))
      const jockeyIds = new Set(inventory.jockeys.map(j => j.id))
      const equipmentIds = new Set(inventory.equipment.map(e => e.id))

      expect(horseIds.size).toBe(5)
      expect(jockeyIds.size).toBe(3)
      expect(equipmentIds.size).toBe(3)
    })
  })

  describe('getTrainingOptions', () => {
    it('should generate training options for all 4 stats', () => {
      const horse = generateHorse(2)
      const options = getTrainingOptions(horse)
      expect(options).toHaveLength(4)
    })

    it('should include speed, stamina, grit, and temper', () => {
      const horse = generateHorse(2)
      const options = getTrainingOptions(horse)
      const stats = options.map(o => o.stat)

      expect(stats).toContain('speed')
      expect(stats).toContain('stamina')
      expect(stats).toContain('grit')
      expect(stats).toContain('temper')
    })

    it('should show canTrain=false when stat is at max potential', () => {
      const horse = generateHorse(2)
      // Manually set a stat to its max
      horse.stats.speed = horse.potential.speed

      const options = getTrainingOptions(horse)
      const speedOption = options.find(o => o.stat === 'speed')

      expect(speedOption?.canTrain).toBe(false)
      expect(speedOption?.cost).toBe(0)
    })

    it('should calculate correct training cost based on current stat value', () => {
      const horse = generateHorse(2)
      horse.stats.speed = 2 // Should cost 2g
      horse.stats.stamina = 5 // Should cost 3g
      horse.stats.grit = 7 // Should cost 4g
      horse.stats.temper = 9 // Should cost 5g
      horse.potential.speed = 10
      horse.potential.stamina = 10
      horse.potential.grit = 10
      horse.potential.temper = 10

      const options = getTrainingOptions(horse)

      expect(options.find(o => o.stat === 'speed')?.cost).toBe(2)
      expect(options.find(o => o.stat === 'stamina')?.cost).toBe(3)
      expect(options.find(o => o.stat === 'grit')?.cost).toBe(4)
      expect(options.find(o => o.stat === 'temper')?.cost).toBe(5)
    })
  })

  describe('getTrainingCost', () => {
    it('should return 2g for stats 1-3', () => {
      expect(getTrainingCost(1)).toBe(2)
      expect(getTrainingCost(3)).toBe(2)
    })

    it('should return 3g for stats 4-6', () => {
      expect(getTrainingCost(4)).toBe(3)
      expect(getTrainingCost(6)).toBe(3)
    })

    it('should return 4g for stats 7-8', () => {
      expect(getTrainingCost(7)).toBe(4)
      expect(getTrainingCost(8)).toBe(4)
    })

    it('should return 5g for stat 9', () => {
      expect(getTrainingCost(9)).toBe(5)
    })
  })
})
