/**
 * Script to compare client and server race simulations
 * This will run the same race twice and verify they produce identical results
 */

import { RaceSimulator } from '../game/simulation/RaceSimulator'
import type { Track, RaceParticipant } from '../types/game'

// Sample race data (using the same format as what gets sent to clients)
const testTrack: Track = {
  id: 'track-1',
  name: 'Test Track',
  category: 'sprint',
  surface: 'dry_dirt',
  distance: 5,
  description: 'Test track',
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
        speed: 6,
        stamina: 5,
        grit: 6,
        temper: 5,
      },
    },
    jockey: {
      id: 'jockey-1',
      name: 'Test Jockey 1',
      stats: {
        skill: 6,
        timing: 6,
        weight: 7,
      },
      trait: 'Closer',
    },
    equipment: {},
    strategy: {
      start: 'hang_back',
      mid: 'conserve',
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
    bloodlineBonuses: {
      speed: 0,
      stamina: 0,
      grit: 0,
      temper: 0,
      ignoreTerrain: false,
      temperReroll: false,
      gainSpeedInMud: false,
      favorableVariance: false,
    },
  },
  {
    playerId: 'ai-player-1',
    playerName: 'AI Racer 1',
    horse: {
      id: 'horse-2',
      name: 'AI Horse 1',
      bloodline: 'Mudblood',
      stats: {
        speed: 5,
        stamina: 5,
        grit: 7,
        temper: 7,
      },
    },
    jockey: {
      id: 'jockey-2',
      name: 'AI Jockey 1',
      stats: {
        skill: 5,
        timing: 6,
        weight: 5,
      },
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
    bloodlineBonuses: {
      speed: 0,
      stamina: 0,
      grit: 0,
      temper: 0,
      ignoreTerrain: false,
      temperReroll: false,
      gainSpeedInMud: false,
      favorableVariance: false,
    },
  },
  {
    playerId: 'ai-player-2',
    playerName: 'AI Racer 2',
    horse: {
      id: 'horse-3',
      name: 'AI Horse 2',
      bloodline: 'Northern Storm',
      stats: {
        speed: 6,
        stamina: 7,
        grit: 6,
        temper: 5,
      },
    },
    jockey: {
      id: 'jockey-3',
      name: 'AI Jockey 2',
      stats: {
        skill: 5,
        timing: 6,
        weight: 5,
      },
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
    bloodlineBonuses: {
      speed: 0,
      stamina: 0,
      grit: 0,
      temper: 0,
      ignoreTerrain: false,
      temperReroll: false,
      gainSpeedInMud: false,
      favorableVariance: false,
    },
  },
]

function compareResults(result1: any, result2: any, label1: string, label2: string) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`COMPARING: ${label1} vs ${label2}`)
  console.log('='.repeat(80))

  let hasDiscrepancy = false

  console.log('\nPlacements:')
  console.log(`${'Position'.padEnd(10)} | ${label1.padEnd(30)} | ${label2.padEnd(30)}`)
  console.log('-'.repeat(80))

  for (let i = 0; i < Math.max(result1.placements.length, result2.placements.length); i++) {
    const p1 = result1.placements[i]
    const p2 = result2.placements[i]

    const match = p1?.playerId === p2?.playerId && p1?.finishTime === p2?.finishTime
    const marker = match ? '✓' : '✗'

    if (!match) {
      hasDiscrepancy = true
    }

    const r1Text = p1 ? `${p1.playerName} (${(p1.finishTime / 1000).toFixed(2)}s)` : 'N/A'
    const r2Text = p2 ? `${p2.playerName} (${(p2.finishTime / 1000).toFixed(2)}s)` : 'N/A'

    console.log(`${marker} ${String(i + 1).padEnd(8)} | ${r1Text.padEnd(30)} | ${r2Text.padEnd(30)}`)
  }

  if (hasDiscrepancy) {
    console.log('\n⚠️  DISCREPANCY DETECTED!')
    console.log('\nDetailed comparison:')

    result1.placements.forEach((p1: any, i: number) => {
      const p2 = result2.placements.find((p: any) => p.playerId === p1.playerId)

      if (p2) {
        const timeDiff = Math.abs(p1.finishTime - p2.finishTime)
        const posDiff = Math.abs(p1.position - p2.position)

        if (timeDiff > 0 || posDiff > 0) {
          console.log(`\n${p1.playerName} (${p1.playerId}):`)
          console.log(`  ${label1}: Position ${p1.position}, Time ${(p1.finishTime / 1000).toFixed(2)}s`)
          console.log(`  ${label2}: Position ${p2.position}, Time ${(p2.finishTime / 1000).toFixed(2)}s`)
          console.log(`  Difference: ${posDiff} positions, ${(timeDiff / 1000).toFixed(2)}s`)
        }
      } else {
        console.log(`\n${p1.playerName} only exists in ${label1}!`)
      }
    })
  } else {
    console.log('\n✅ Results are IDENTICAL')
  }

  return !hasDiscrepancy
}

console.log('Race Simulation Comparison Tool')
console.log('================================\n')

const seed = 'test-comparison-seed-' + Date.now()

console.log('Using seed:', seed)
console.log('Track:', testTrack.name, `(${testTrack.surface}, ${testTrack.distance} furlongs)`)
console.log('Participants:', testParticipants.length)

console.log('\nParticipant details:')
testParticipants.forEach((p, i) => {
  console.log(`  [${i}] ${p.playerName}:`)
  console.log(`      Horse: ${p.horse.name} (${p.horse.bloodline})`)
  console.log(`      Stats: Speed ${p.horse.stats.speed}, Stamina ${p.horse.stats.stamina}, Grit ${p.horse.stats.grit}, Temper ${p.horse.stats.temper}`)
  console.log(`      Jockey: ${p.jockey.name} (Skill ${p.jockey.stats.skill}, Timing ${p.jockey.stats.timing}, Weight ${p.jockey.stats.weight})`)
  console.log(`      Strategy: ${p.strategy.start} → ${p.strategy.mid} → ${p.strategy.finish}`)
  console.log(`      Bloodline Bonuses:`, JSON.stringify(p.bloodlineBonuses))
})

// Simulation 1: "Client-side" (exactly as client would run it)
console.log('\n\nRunning CLIENT simulation...')
const clientSimulator = new RaceSimulator({
  track: testTrack,
  participants: testParticipants,
  seed,
})
const clientResult = clientSimulator.simulate()

// Simulation 2: "Server-side" (exactly as server would run it)
console.log('Running SERVER simulation...')
const serverSimulator = new RaceSimulator({
  track: testTrack,
  participants: testParticipants.map(entry => ({
    playerId: entry.playerId,
    playerName: entry.playerName,
    horse: entry.horse,
    jockey: entry.jockey,
    equipment: entry.equipment as any || {},
    strategy: entry.strategy as any || { start: 'steady', mid: 'react', finish: 'maintain' },
    derivedStats: {
      baseSpeed: 0,
      staminaPool: 0,
      burnRate: 0,
      terrainMod: 0,
      efficiency: 0,
      consistency: { variance: 0, isStable: true },
    },
    bloodlineBonuses: entry.bloodlineBonuses,
  })),
  seed,
})
const serverResult = serverSimulator.simulate()

// Simulation 3: Run client simulation again to verify determinism
console.log('Running CLIENT simulation again (determinism check)...')
const clientSimulator2 = new RaceSimulator({
  track: testTrack,
  participants: testParticipants,
  seed,
})
const clientResult2 = clientSimulator2.simulate()

// Compare results
const match1 = compareResults(clientResult, serverResult, 'Client Run 1', 'Server Run')
const match2 = compareResults(clientResult, clientResult2, 'Client Run 1', 'Client Run 2')

console.log('\n' + '='.repeat(80))
console.log('SUMMARY')
console.log('='.repeat(80))
console.log(`Client vs Server match: ${match1 ? '✅ YES' : '❌ NO'}`)
console.log(`Client determinism: ${match2 ? '✅ YES' : '❌ NO'}`)

if (!match1) {
  console.log('\n⚠️  CLIENT AND SERVER PRODUCE DIFFERENT RESULTS!')
  console.log('This indicates a bug in how data is being passed or processed.')
} else if (!match2) {
  console.log('\n⚠️  CLIENT SIMULATIONS ARE NOT DETERMINISTIC!')
  console.log('This indicates a problem with the RNG or simulation logic.')
} else {
  console.log('\n✅ All simulations match! The system is working correctly.')
}

process.exit(match1 && match2 ? 0 : 1)
