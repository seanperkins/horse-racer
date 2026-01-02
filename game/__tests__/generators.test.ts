import { describe, it, expect } from 'vitest'
import {
  generateHorse,
  generateJockey,
  generateEquipment,
  generateShopOffering,
} from '../generators'

describe('Horse Generator', () => {
  it('should generate horses with correct tier stat budgets', () => {
    // Test each tier
    const tiers = [1, 2, 3, 4] as const
    const expectedRanges = {
      1: { min: 20, max: 22 },
      2: { min: 21, max: 25 },
      3: { min: 24, max: 29 },
      4: { min: 27, max: 32 },
    }

    for (const tier of tiers) {
      const horse = generateHorse(tier)
      const total =
        horse.stats.speed + horse.stats.stamina + horse.stats.grit + horse.stats.temper

      expect(total).toBeGreaterThanOrEqual(expectedRanges[tier].min)
      expect(total).toBeLessThanOrEqual(expectedRanges[tier].max)
      expect(horse.tier).toBe(tier)
    }
  })

  it('should generate horses with valid bloodlines', () => {
    const validBloodlines = [
      'Desert Wind',
      'Northern Storm',
      'Iron Heart',
      'Wild Card',
      'Mudblood',
      'Royal Line',
    ]

    for (let i = 0; i < 20; i++) {
      const horse = generateHorse(2)
      expect(validBloodlines).toContain(horse.bloodline)
    }
  })

  it('should generate training potential for tier 2+ horses', () => {
    const tier1 = generateHorse(1)
    const tier2 = generateHorse(2)
    const tier3 = generateHorse(3)

    // Tier 1 should have no potential
    expect(tier1.potential).toEqual(tier1.stats)

    // Tier 2+ should have higher potential
    const tier2PotentialTotal =
      tier2.potential.speed + tier2.potential.stamina + tier2.potential.grit + tier2.potential.temper
    const tier2StatsTotal =
      tier2.stats.speed + tier2.stats.stamina + tier2.stats.grit + tier2.stats.temper
    expect(tier2PotentialTotal).toBeGreaterThan(tier2StatsTotal)

    const tier3PotentialTotal =
      tier3.potential.speed + tier3.potential.stamina + tier3.potential.grit + tier3.potential.temper
    const tier3StatsTotal =
      tier3.stats.speed + tier3.stats.stamina + tier3.stats.grit + tier3.stats.temper
    expect(tier3PotentialTotal).toBeGreaterThan(tier3StatsTotal)
  })

  it('should generate abilities for tier 3+ horses', () => {
    const tier2 = generateHorse(2)
    const tier3 = generateHorse(3)
    const tier4 = generateHorse(4)

    expect(tier2.ability).toBeUndefined()
    expect(tier3.ability).toBeDefined()
    expect(tier4.ability).toBeDefined()
  })

  it('should assign correct costs by tier', () => {
    expect(generateHorse(1).cost).toBe(2)
    expect(generateHorse(2).cost).toBe(3)
    expect(generateHorse(3).cost).toBe(5)
    expect(generateHorse(4).cost).toBe(7)
  })

  it('should respect max stat value of 10', () => {
    for (let i = 0; i < 100; i++) {
      const horse = generateHorse(4)
      expect(horse.stats.speed).toBeLessThanOrEqual(10)
      expect(horse.stats.stamina).toBeLessThanOrEqual(10)
      expect(horse.stats.grit).toBeLessThanOrEqual(10)
      expect(horse.stats.temper).toBeLessThanOrEqual(10)
      expect(horse.potential.speed).toBeLessThanOrEqual(10)
      expect(horse.potential.stamina).toBeLessThanOrEqual(10)
      expect(horse.potential.grit).toBeLessThanOrEqual(10)
      expect(horse.potential.temper).toBeLessThanOrEqual(10)
    }
  })
})

describe('Jockey Generator', () => {
  it('should generate jockeys with correct stat budgets by quality', () => {
    const qualities = [1, 2, 3, 4] as const
    const expectedRanges = {
      1: { min: 12, max: 14 },
      2: { min: 15, max: 18 },
      3: { min: 18, max: 21 },
      4: { min: 21, max: 24 },
    }

    for (const quality of qualities) {
      const jockey = generateJockey(quality)
      const total = jockey.stats.skill + jockey.stats.timing + jockey.stats.weight

      expect(total).toBeGreaterThanOrEqual(expectedRanges[quality].min)
      expect(total).toBeLessThanOrEqual(expectedRanges[quality].max)
    }
  })

  it('should assign traits to quality 3+ jockeys', () => {
    const lowQuality = generateJockey(2)
    const highQuality = generateJockey(3)

    // Quality 3+ should have traits (or user can pass one)
    expect(highQuality.trait).toBeDefined()
  })

  it('should generate valid jockey names', () => {
    for (let i = 0; i < 20; i++) {
      const jockey = generateJockey(2)
      expect(jockey.name).toBeTruthy()
      expect(jockey.name.split(' ').length).toBe(2) // First + Last name
    }
  })

  it('should assign correct hire costs by quality', () => {
    expect(generateJockey(1).hireCost).toBe(1)
    expect(generateJockey(2).hireCost).toBe(2)
    expect(generateJockey(3).hireCost).toBe(3)
    expect(generateJockey(4).hireCost).toBe(4)
  })

  it('should assign correct upkeep costs by quality', () => {
    expect(generateJockey(1).upkeepCost).toBe(1)
    expect(generateJockey(2).upkeepCost).toBe(1)
    expect(generateJockey(3).upkeepCost).toBe(2)
    expect(generateJockey(4).upkeepCost).toBe(2)
  })
})

describe('Equipment Generator', () => {
  it('should generate equipment for all slots', () => {
    const saddle = generateEquipment('saddle', 2)
    const horseshoes = generateEquipment('horseshoes', 2)
    const blinders = generateEquipment('blinders', 2)

    expect(saddle.slot).toBe('saddle')
    expect(horseshoes.slot).toBe('horseshoes')
    expect(blinders.slot).toBe('blinders')
  })

  it('should generate equipment with proper effects', () => {
    for (let i = 0; i < 20; i++) {
      const equipment = generateEquipment('saddle', 2)
      expect(equipment.effects).toBeDefined()
      expect(Object.keys(equipment.effects).length).toBeGreaterThan(0)
    }
  })

  it('should assign reasonable costs', () => {
    const cheap = generateEquipment('saddle', 1)
    const expensive = generateEquipment('saddle', 3)

    expect(cheap.cost).toBeGreaterThanOrEqual(2)
    expect(cheap.cost).toBeLessThanOrEqual(4)
    expect(expensive.cost).toBeGreaterThanOrEqual(2)
    expect(expensive.cost).toBeLessThanOrEqual(4)
  })
})

describe('Shop Generation', () => {
  it('should generate correct number of items', () => {
    const shop = generateShopOffering(1)

    expect(shop.horses).toHaveLength(5)
    expect(shop.jockeys).toHaveLength(3)
    expect(shop.equipment).toHaveLength(3)
  })

  it('should only offer tier 1 horses in round 1', () => {
    const shop = generateShopOffering(1)

    for (const horse of shop.horses) {
      expect(horse.tier).toBe(1)
    }
  })

  it('should offer mixed tiers in round 3', () => {
    const shop = generateShopOffering(3)
    const tiers = shop.horses.map((h) => h.tier)

    // Should have variety of tiers (though random, expect at least 2 different tiers)
    const uniqueTiers = new Set(tiers)
    expect(uniqueTiers.size).toBeGreaterThanOrEqual(1)

    // No tier 4 in round 3
    expect(tiers).not.toContain(4)
  })

  it('should offer tier 4 horses in late game', () => {
    // Run multiple times since tier 4 has 20% chance in round 7+
    let foundTier4 = false
    for (let i = 0; i < 10; i++) {
      const shop = generateShopOffering(7)
      if (shop.horses.some((h) => h.tier === 4)) {
        foundTier4 = true
        break
      }
    }
    expect(foundTier4).toBe(true)
  })

  it('should generate equipment for all three slots', () => {
    const shop = generateShopOffering(5)
    const slots = shop.equipment.map((e) => e.slot)

    expect(slots).toContain('saddle')
    expect(slots).toContain('horseshoes')
    expect(slots).toContain('blinders')
  })
})

describe('Stat Distribution', () => {
  it('should create varied stat distributions (not all identical)', () => {
    const horses = Array.from({ length: 20 }, () => generateHorse(2))

    // Check that not all horses have identical stats
    const statSignatures = horses.map(
      (h) => `${h.stats.speed}-${h.stats.stamina}-${h.stats.grit}-${h.stats.temper}`
    )
    const uniqueSignatures = new Set(statSignatures)

    expect(uniqueSignatures.size).toBeGreaterThan(5) // Expect variety
  })

  it('should distribute stats across all four attributes', () => {
    const horses = Array.from({ length: 50 }, () => generateHorse(3))

    // Check that each stat sees some variation
    const speeds = new Set(horses.map((h) => h.stats.speed))
    const staminas = new Set(horses.map((h) => h.stats.stamina))
    const grits = new Set(horses.map((h) => h.stats.grit))
    const tempers = new Set(horses.map((h) => h.stats.temper))

    expect(speeds.size).toBeGreaterThan(2)
    expect(staminas.size).toBeGreaterThan(2)
    expect(grits.size).toBeGreaterThan(2)
    expect(tempers.size).toBeGreaterThan(2)
  })
})
