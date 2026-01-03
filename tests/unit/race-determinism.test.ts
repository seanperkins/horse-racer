/**
 * Test to verify RaceSimulator produces identical results with same inputs
 */

import { describe, it, expect } from 'vitest'
import { RaceSimulator } from '@/game/simulation/RaceSimulator'
import type { Track, RaceParticipant } from '@/types/game'

describe('RaceSimulator Determinism', () => {
  const testTrack: Track = {
    id: 'test-track',
    name: 'Test Track',
    category: 'sprint',
    surface: 'dry_dirt',
    distance: 5,
    description: 'Test track for determinism',
  }

  const testParticipants: RaceParticipant[] = [
    {
      playerId: 'player-1',
      playerName: 'Player 1',
      horse: {
        id: 'horse-1',
        name: 'Test Horse 1',
        bloodline: 'Desert Wind',
        stats: {
          speed: 80,
          stamina: 75,
          grit: 70,
          temper: 65,
          timing: 72,
          weight: 60,
        },
        ability: {
          name: 'Heat Resistance',
          description: '+1 Speed on dry/sand tracks',
        },
      },
      jockey: {
        id: 'jockey-1',
        name: 'Test Jockey 1',
        stats: {
          skill: 75,
          experience: 80,
          weight: 55,
        },
        trait: 'Veteran',
      },
      equipment: {},
      strategy: {
        start: 'steady',
        mid: 'react',
        finish: 'maintain',
      },
      derivedStats: {
        baseSpeed: 0,
        staminaPool: 0,
        burnRate: 0,
        terrainMod: 0,
        efficiency: 0,
        consistency: { variance: 0, isStable: true },
      },
    },
    {
      playerId: 'player-2',
      playerName: 'Player 2',
      horse: {
        id: 'horse-2',
        name: 'Test Horse 2',
        bloodline: 'Northern Storm',
        stats: {
          speed: 75,
          stamina: 80,
          grit: 75,
          temper: 70,
          timing: 68,
          weight: 62,
        },
        ability: {
          name: 'Weatherproof',
          description: '+1 Speed in wet/frozen conditions',
        },
      },
      jockey: {
        id: 'jockey-2',
        name: 'Test Jockey 2',
        stats: {
          skill: 70,
          experience: 75,
          weight: 54,
        },
        trait: 'Mudder',
      },
      equipment: {},
      strategy: {
        start: 'steady',
        mid: 'react',
        finish: 'maintain',
      },
      derivedStats: {
        baseSpeed: 0,
        staminaPool: 0,
        burnRate: 0,
        terrainMod: 0,
        efficiency: 0,
        consistency: { variance: 0, isStable: true },
      },
    },
    {
      playerId: 'player-3',
      playerName: 'Player 3',
      horse: {
        id: 'horse-3',
        name: 'Test Horse 3',
        bloodline: 'Wild Card',
        stats: {
          speed: 78,
          stamina: 72,
          grit: 68,
          temper: 80,
          timing: 75,
          weight: 58,
        },
        ability: {
          name: 'Chaos Factor',
          description: 'Increased variance',
        },
      },
      jockey: {
        id: 'jockey-3',
        name: 'Test Jockey 3',
        stats: {
          skill: 80,
          experience: 70,
          weight: 56,
        },
        trait: 'Closer',
      },
      equipment: {},
      strategy: {
        start: 'steady',
        mid: 'react',
        finish: 'maintain',
      },
      derivedStats: {
        baseSpeed: 0,
        staminaPool: 0,
        burnRate: 0,
        terrainMod: 0,
        efficiency: 0,
        consistency: { variance: 0, isStable: true },
      },
    },
  ]

  it('should produce identical results when run twice with same seed', () => {
    const seed = 'test-seed-123'

    // First simulation
    const simulator1 = new RaceSimulator({
      track: testTrack,
      participants: testParticipants,
      seed,
    })
    const result1 = simulator1.simulate()

    // Second simulation with same parameters
    const simulator2 = new RaceSimulator({
      track: testTrack,
      participants: testParticipants,
      seed,
    })
    const result2 = simulator2.simulate()

    // Results should be identical
    expect(result1.placements.length).toBe(result2.placements.length)

    result1.placements.forEach((placement1, index) => {
      const placement2 = result2.placements[index]

      expect(placement1.playerId).toBe(placement2.playerId)
      expect(placement1.position).toBe(placement2.position)
      expect(placement1.finishTime).toBe(placement2.finishTime)
      expect(placement1.distance).toBe(placement2.distance)
    })

    // Events should also be identical
    expect(result1.events.length).toBe(result2.events.length)
  })

  it('should produce identical results when run 10 times with same seed', () => {
    const seed = 'determinism-test-456'
    const runs = 10
    const results = []

    for (let i = 0; i < runs; i++) {
      const simulator = new RaceSimulator({
        track: testTrack,
        participants: testParticipants,
        seed,
      })
      results.push(simulator.simulate())
    }

    // All runs should produce identical results
    const firstResult = results[0]

    for (let i = 1; i < runs; i++) {
      const currentResult = results[i]

      // Check placements
      expect(currentResult.placements.length).toBe(firstResult.placements.length)

      currentResult.placements.forEach((placement, index) => {
        const firstPlacement = firstResult.placements[index]

        expect(placement.playerId).toBe(firstPlacement.playerId)
        expect(placement.position).toBe(firstPlacement.position)
        expect(placement.finishTime).toBe(firstPlacement.finishTime)
        expect(placement.distance).toBe(firstPlacement.distance)
      })

      // Check events count
      expect(currentResult.events.length).toBe(firstResult.events.length)
    }
  })

  it('should produce different results with different seeds', () => {
    const seed1 = 'seed-one'
    const seed2 = 'seed-two'

    const simulator1 = new RaceSimulator({
      track: testTrack,
      participants: testParticipants,
      seed: seed1,
    })
    const result1 = simulator1.simulate()

    const simulator2 = new RaceSimulator({
      track: testTrack,
      participants: testParticipants,
      seed: seed2,
    })
    const result2 = simulator2.simulate()

    // With different seeds, results should differ
    // At least one placement should be different
    let hasDifference = false

    for (let i = 0; i < result1.placements.length; i++) {
      if (
        result1.placements[i].playerId !== result2.placements[i].playerId ||
        result1.placements[i].finishTime !== result2.placements[i].finishTime
      ) {
        hasDifference = true
        break
      }
    }

    expect(hasDifference).toBe(true)
  })

  it('should produce identical results with bloodline bonuses', () => {
    const seed = 'bloodline-test-789'

    const participantsWithBonuses: RaceParticipant[] = testParticipants.map(p => ({
      ...p,
      bloodlineBonuses: {
        speed: 2,
        stamina: 1,
        grit: 0,
        temper: 0,
        timing: 1,
        weight: 0,
        favorableVariance: false,
      },
    }))

    // First simulation
    const simulator1 = new RaceSimulator({
      track: testTrack,
      participants: participantsWithBonuses,
      seed,
    })
    const result1 = simulator1.simulate()

    // Second simulation
    const simulator2 = new RaceSimulator({
      track: testTrack,
      participants: participantsWithBonuses,
      seed,
    })
    const result2 = simulator2.simulate()

    // Results should be identical
    result1.placements.forEach((placement1, index) => {
      const placement2 = result2.placements[index]

      expect(placement1.playerId).toBe(placement2.playerId)
      expect(placement1.position).toBe(placement2.position)
      expect(placement1.finishTime).toBe(placement2.finishTime)
    })
  })

  it('should log detailed comparison on failure', () => {
    const seed = 'debug-test'

    const simulator1 = new RaceSimulator({
      track: testTrack,
      participants: testParticipants,
      seed,
    })
    const result1 = simulator1.simulate()

    const simulator2 = new RaceSimulator({
      track: testTrack,
      participants: testParticipants,
      seed,
    })
    const result2 = simulator2.simulate()

    console.log('\n=== Determinism Test Results ===')
    console.log('Seed:', seed)
    console.log('\nRun 1 Placements:')
    result1.placements.forEach(p => {
      console.log(`  ${p.position}. ${p.playerName} - ${p.finishTime}ms`)
    })
    console.log('\nRun 2 Placements:')
    result2.placements.forEach(p => {
      console.log(`  ${p.position}. ${p.playerName} - ${p.finishTime}ms`)
    })

    const identical = JSON.stringify(result1.placements) === JSON.stringify(result2.placements)
    console.log('\nResults identical:', identical)

    if (!identical) {
      console.log('\n=== DIFFERENCES FOUND ===')
      result1.placements.forEach((p1, i) => {
        const p2 = result2.placements[i]
        if (p1.playerId !== p2.playerId || p1.finishTime !== p2.finishTime) {
          console.log(`Position ${i + 1} differs:`)
          console.log(`  Run 1: ${p1.playerName} - ${p1.finishTime}ms`)
          console.log(`  Run 2: ${p2.playerName} - ${p2.finishTime}ms`)
        }
      })
    }

    expect(identical).toBe(true)
  })
})
