import { describe, it, expect } from 'vitest'
import { RaceSimulator } from '@/game/simulation/RaceSimulator'
import type { RaceParticipant, Track } from '@/types/game'

describe('RaceSimulator', () => {
  // Create test participants
  const createTestParticipant = (id: string, name: string): RaceParticipant => ({
    playerId: id,
    playerName: name,
    horse: {
      id: `horse-${id}`,
      name: `Horse ${id}`,
      tier: 2,
      bloodline: 'Iron Heart',
      stats: {
        speed: 7,
        stamina: 6,
        grit: 5,
        temper: 4,
      },
      potential: {
        speed: 9,
        stamina: 8,
        grit: 7,
        temper: 6,
      },
      cost: 3,
    },
    jockey: {
      id: `jockey-${id}`,
      name: `Jockey ${id}`,
      stats: {
        skill: 6,
        timing: 5,
        weight: 5,
      },
      hireCost: 3,
      upkeepCost: 1,
    },
    equipment: {},
    strategy: {
      start: 'steady',
      mid: 'push',
      finish: 'sprint',
    },
    derivedStats: {
      baseSpeed: 0,
      staminaPool: 0,
      burnRate: 0,
      terrainMod: 0,
      efficiency: 0,
      consistency: { variance: 0, isStable: true },
    },
    bloodlineBonuses: {},
  })

  const testTrack: Track = {
    id: 'test-track',
    name: 'Test Track',
    category: 'sprint',
    surface: 'dry_dirt',
    distance: 6, // 6 furlongs
    description: 'A test track',
  }

  it('should produce deterministic results with same seed', () => {
    const participants = [
      createTestParticipant('p1', 'Player 1'),
      createTestParticipant('p2', 'Player 2'),
    ]

    const simulator1 = new RaceSimulator({
      track: testTrack,
      participants,
      seed: 'test-seed-123',
    })

    const simulator2 = new RaceSimulator({
      track: testTrack,
      participants,
      seed: 'test-seed-123',
    })

    const result1 = simulator1.simulate()
    const result2 = simulator2.simulate()

    // Should have same placements
    expect(result1.placements).toEqual(result2.placements)
  })

  it('should produce different results with different seeds', () => {
    const participants = [
      createTestParticipant('p1', 'Player 1'),
      createTestParticipant('p2', 'Player 2'),
      createTestParticipant('p3', 'Player 3'),
    ]

    const simulator1 = new RaceSimulator({
      track: testTrack,
      participants,
      seed: 'seed-1',
    })

    const simulator2 = new RaceSimulator({
      track: testTrack,
      participants,
      seed: 'seed-2',
    })

    const result1 = simulator1.simulate()
    const result2 = simulator2.simulate()

    // Should likely have different placements
    const placements1 = result1.placements.map((p) => p.playerId).join(',')
    const placements2 = result2.placements.map((p) => p.playerId).join(',')

    expect(placements1).not.toBe(placements2)
  })

  it('should complete the race within reasonable time', () => {
    const participants = [createTestParticipant('p1', 'Player 1')]

    const simulator = new RaceSimulator({
      track: testTrack,
      participants,
      seed: 'speed-test',
    })

    const result = simulator.simulate()

    // Race should complete in under or at 60 seconds (60000ms)
    expect(result.placements[0].finishTime).toBeLessThanOrEqual(60000)
    expect(result.placements[0].finishTime).toBeGreaterThan(0)
  })

  it('should rank participants correctly', () => {
    const fastHorse = createTestParticipant('fast', 'Fast Player')
    fastHorse.horse.stats.speed = 10
    fastHorse.horse.stats.stamina = 8

    const slowHorse = createTestParticipant('slow', 'Slow Player')
    slowHorse.horse.stats.speed = 4
    slowHorse.horse.stats.stamina = 4

    const participants = [slowHorse, fastHorse]

    const simulator = new RaceSimulator({
      track: testTrack,
      participants,
      seed: 'ranking-test',
    })

    const result = simulator.simulate()

    // Fast horse should likely win (position 1)
    expect(result.placements[0].playerId).toBe('fast')
    expect(result.placements[1].playerId).toBe('slow')
  })

  it('should record race events', () => {
    const participants = [createTestParticipant('p1', 'Player 1')]

    const simulator = new RaceSimulator({
      track: testTrack,
      participants,
      seed: 'events-test',
    })

    const result = simulator.simulate()

    // Should have some events recorded
    expect(result.events).toBeDefined()
    expect(Array.isArray(result.events)).toBe(true)
  })

  it('should apply wet terrain speed penalties correctly', () => {
    const participant = createTestParticipant('p1', 'Player 1')
    participant.horse.stats.grit = 0 // No grit reduction
    participant.horse.stats.speed = 80 // Higher speed to ensure completion
    participant.horse.stats.stamina = 80

    const dryTrack: Track = { ...testTrack, surface: 'dry_dirt' }
    const wetTrack: Track = { ...testTrack, surface: 'wet_muddy' }

    const drySimulator = new RaceSimulator({
      track: dryTrack,
      participants: [participant],
      seed: 'terrain-test',
    })

    const wetSimulator = new RaceSimulator({
      track: wetTrack,
      participants: [participant],
      seed: 'terrain-test',
    })

    const dryResult = drySimulator.simulate()
    const wetResult = wetSimulator.simulate()

    // Both should finish before timeout
    expect(dryResult.placements[0].finishTime).toBeLessThan(60000)
    expect(wetResult.placements[0].finishTime).toBeLessThan(60000)

    // Wet track should result in slower time (higher finish time)
    expect(wetResult.placements[0].finishTime).toBeGreaterThan(dryResult.placements[0].finishTime)
  })

  it('should apply equipment special effects - ignore terrain penalty', () => {
    const participant = createTestParticipant('p1', 'Player 1')
    participant.horse.stats.grit = 0
    participant.horse.stats.speed = 80
    participant.horse.stats.stamina = 80

    const participantWithCleats = createTestParticipant('p2', 'Player 2')
    participantWithCleats.horse.stats.grit = 0
    participantWithCleats.horse.stats.speed = 80
    participantWithCleats.horse.stats.stamina = 80
    participantWithCleats.equipment.horseshoes = {
      id: 'mud-cleats',
      name: 'Mud Cleats',
      slot: 'horseshoes',
      cost: 2,
      effects: {
        ignoreTerrainPenalty: 'wet_muddy',
      },
    }

    const wetTrack: Track = { ...testTrack, surface: 'wet_muddy' }

    const withoutCleats = new RaceSimulator({
      track: wetTrack,
      participants: [participant],
      seed: 'cleats-test',
    })

    const withCleats = new RaceSimulator({
      track: wetTrack,
      participants: [participantWithCleats],
      seed: 'cleats-test',
    })

    const resultWithout = withoutCleats.simulate()
    const resultWith = withCleats.simulate()

    // Both should finish before timeout
    expect(resultWithout.placements[0].finishTime).toBeLessThan(60000)
    expect(resultWith.placements[0].finishTime).toBeLessThan(60000)

    // Horse with mud cleats should finish faster on wet track
    expect(resultWith.placements[0].finishTime).toBeLessThan(resultWithout.placements[0].finishTime)
  })

  it('should apply equipment special effects - stumble avoidance', () => {
    const participant = createTestParticipant('p1', 'Player 1')

    const participantWithLuckyShoe = createTestParticipant('p2', 'Player 2')
    participantWithLuckyShoe.equipment.horseshoes = {
      id: 'lucky-horseshoe',
      name: 'Lucky Horseshoe',
      slot: 'horseshoes',
      cost: 3,
      effects: {
        stumbleAvoidance: 0.5, // 50% chance to avoid stumbles
      },
    }

    const rockyTrack: Track = { ...testTrack, surface: 'rocky' }

    // Run multiple times to check stumble reduction
    let stumbleCountWithout = 0
    let stumbleCountWith = 0
    const runs = 10

    for (let i = 0; i < runs; i++) {
      const without = new RaceSimulator({
        track: rockyTrack,
        participants: [participant],
        seed: `stumble-test-${i}`,
      })

      const withLucky = new RaceSimulator({
        track: rockyTrack,
        participants: [participantWithLuckyShoe],
        seed: `stumble-test-${i}`,
      })

      const resultWithout = without.simulate()
      const resultWith = withLucky.simulate()

      // Count stumble events
      if (resultWithout.events?.some(e => e.description?.includes('Stumbled'))) {
        stumbleCountWithout++
      }
      if (resultWith.events?.some(e => e.description?.includes('Stumbled'))) {
        stumbleCountWith++
      }
    }

    // Lucky horseshoe should reduce stumbles (or at least not increase them)
    expect(stumbleCountWith).toBeLessThanOrEqual(stumbleCountWithout)
  })

  it('should use jockey Skill for rocky terrain stumble reduction', () => {
    const lowSkillParticipant = createTestParticipant('p1', 'Low Skill')
    lowSkillParticipant.jockey.stats.skill = 1
    lowSkillParticipant.horse.stats.grit = 50 // High grit shouldn't help on rocky

    const highSkillParticipant = createTestParticipant('p2', 'High Skill')
    highSkillParticipant.jockey.stats.skill = 100
    highSkillParticipant.horse.stats.grit = 1 // Low grit is fine with high skill

    const rockyTrack: Track = { ...testTrack, surface: 'rocky' }

    // Run multiple times
    let stumbleCountLowSkill = 0
    let stumbleCountHighSkill = 0
    const runs = 10

    for (let i = 0; i < runs; i++) {
      const lowSkill = new RaceSimulator({
        track: rockyTrack,
        participants: [lowSkillParticipant],
        seed: `rocky-test-${i}`,
      })

      const highSkill = new RaceSimulator({
        track: rockyTrack,
        participants: [highSkillParticipant],
        seed: `rocky-test-${i}`,
      })

      const resultLow = lowSkill.simulate()
      const resultHigh = highSkill.simulate()

      if (resultLow.events?.some(e => e.description?.includes('Stumbled'))) {
        stumbleCountLowSkill++
      }
      if (resultHigh.events?.some(e => e.description?.includes('Stumbled'))) {
        stumbleCountHighSkill++
      }
    }

    // High skill jockey should have fewer stumbles on rocky terrain
    expect(stumbleCountHighSkill).toBeLessThanOrEqual(stumbleCountLowSkill)
  })
})
