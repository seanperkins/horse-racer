/**
 * Script to compare simulations using REAL game data from your last race
 * This will help us identify if there's a data transformation issue
 */

import { RaceSimulator } from '../game/simulation/RaceSimulator'

// Actual data from your last race (copied from the browser console)
const realGameData = {
  "type": "race_inputs",
  "entries": [
    {
      "playerId": "6e19b9c4-5d23-4d6b-8130-588a2721549d",
      "playerName": "sniperssuk",
      "horse": {
        "id": "horse-327",
        "name": "Sahara",
        "tier": 1,
        "bloodline": "Desert Wind",
        "stats": {
          "speed": 6,
          "stamina": 5,
          "grit": 6,
          "temper": 5
        },
      },
      "jockey": {
        "id": "jockey-213",
        "name": "Finley Rodriguez",
        "stats": {
          "skill": 6,
          "timing": 6,
          "weight": 7
        },
        "trait": "Closer",
      },
      "equipment": {
        "blinders": "equipment-171"
      },
      "strategy": {
        "start": "hang_back",
        "mid": "conserve",
        "finish": "sprint"
      },
      "bloodlineBonuses": {
        "speed": 0,
        "stamina": 0,
        "grit": 0,
        "temper": 0,
        "ignoreTerrain": false,
        "temperReroll": false,
        "gainSpeedInMud": false,
        "favorableVariance": false
      }
    },
    {
      "playerId": "ai-player-1",
      "playerName": "AI Racer 1",
      "horse": {
        "id": "horse-316",
        "name": "Muddy",
        "tier": 2,
        "bloodline": "Mudblood",
        "stats": {
          "speed": 5,
          "stamina": 5,
          "grit": 7,
          "temper": 7
        },
      },
      "jockey": {
        "id": "jockey-204",
        "name": "Zion Martin",
        "stats": {
          "skill": 5,
          "timing": 6,
          "weight": 5
        },
      },
      "equipment": {},
      "strategy": {
        "start": "steady",
        "mid": "react",
        "finish": "maintain"
      },
      "bloodlineBonuses": {
        "speed": 0,
        "stamina": 0,
        "grit": 0,
        "temper": 0,
        "ignoreTerrain": false,
        "temperReroll": false,
        "gainSpeedInMud": false,
        "favorableVariance": false
      }
    },
    {
      "playerId": "ai-player-2",
      "playerName": "AI Racer 2",
      "horse": {
        "id": "horse-317",
        "name": "Clay Hooves",
        "tier": 2,
        "bloodline": "Mudblood",
        "stats": {
          "speed": 7,
          "stamina": 4,
          "grit": 6,
          "temper": 7
        },
      },
      "jockey": {
        "id": "jockey-205",
        "name": "Jamie Singh",
        "stats": {
          "skill": 5,
          "timing": 6,
          "weight": 5
        },
      },
      "equipment": {},
      "strategy": {
        "start": "steady",
        "mid": "react",
        "finish": "maintain"
      },
      "bloodlineBonuses": {
        "speed": 0,
        "stamina": 0,
        "grit": 0,
        "temper": 0,
        "ignoreTerrain": false,
        "temperReroll": false,
        "gainSpeedInMud": false,
        "favorableVariance": false
      }
    },
  ],
  "track": {
    "id": "track-1",
    "name": "Velocity Oval",
    "category": "sprint",
    "surface": "sand",
    "distance": 7,
    "description": "A sprint track with sand conditions"
  },
  "seed": "race-room-1767404921203-1",
}

console.log('Testing with REAL game data')
console.log('Seed:', realGameData.seed)
console.log('Track:', realGameData.track.name, `(${realGameData.track.surface})`)
console.log('\n')

// CLIENT-SIDE simulation (exactly as PixiRaceRenderer.tsx does it)
console.log('🖥️  CLIENT SIMULATION (PixiRaceRenderer.tsx logic)')
console.log('='.repeat(80))

const clientSimulator = new RaceSimulator({
  track: realGameData.track as any,
  participants: realGameData.entries.map((entry) => ({
    playerId: entry.playerId,
    playerName: entry.playerName,
    horse: entry.horse as any,
    jockey: entry.jockey as any,
    equipment: entry.equipment || {},
    strategy: entry.strategy || {
      start: "steady",
      mid: "react",
      finish: "maintain",
    },
    bloodlineBonuses: (entry as any).bloodlineBonuses || undefined,
  })) as any,
  seed: realGameData.seed || "default-seed",
})

const clientResult = clientSimulator.simulate()

console.log('Client Results:')
clientResult.placements.forEach(p => {
  console.log(`  ${p.position}. ${p.playerName.padEnd(20)} - ${(p.finishTime / 1000).toFixed(2)}s`)
})

// SERVER-SIDE simulation (exactly as GameRoom.ts does it)
console.log('\n🖧  SERVER SIMULATION (GameRoom.ts processRaceResults logic)')
console.log('='.repeat(80))

const serverSimulator = new RaceSimulator({
  track: realGameData.track as any,
  participants: realGameData.entries.map(entry => {
    return {
      playerId: entry.playerId,
      playerName: entry.playerName,
      horse: entry.horse as any,
      jockey: entry.jockey as any,
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
    }
  }),
  seed: realGameData.seed,
})

const serverResult = serverSimulator.simulate()

console.log('Server Results:')
serverResult.placements.forEach(p => {
  console.log(`  ${p.position}. ${p.playerName.padEnd(20)} - ${(p.finishTime / 1000).toFixed(2)}s`)
})

// COMPARISON
console.log('\n📊 COMPARISON')
console.log('='.repeat(80))

let mismatch = false
for (let i = 0; i < clientResult.placements.length; i++) {
  const c = clientResult.placements[i]
  const s = serverResult.placements[i]

  const match = c.playerId === s.playerId && c.finishTime === s.finishTime
  const icon = match ? '✅' : '❌'

  if (!match) {
    mismatch = true
    console.log(`${icon} Position ${i + 1}:`)
    console.log(`   Client: ${c.playerName} (${(c.finishTime / 1000).toFixed(2)}s)`)
    console.log(`   Server: ${s.playerName} (${(s.finishTime / 1000).toFixed(2)}s)`)
  } else {
    console.log(`${icon} Position ${i + 1}: ${c.playerName} - MATCH`)
  }
}

if (mismatch) {
  console.log('\n⚠️  MISMATCH DETECTED!')
  console.log('\nThis means client and server are producing different results with the same data.')
  console.log('The bug is likely in how the data is being transformed before being passed to RaceSimulator.')
  process.exit(1)
} else {
  console.log('\n✅ Results match perfectly!')
  console.log('If you\'re still seeing different results in-game, the issue is with data transmission.')
  process.exit(0)
}
