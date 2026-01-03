import { RaceSimulator } from '@/game/simulation/RaceSimulator'
import type { Horse, Jockey, RaceParticipant, Track } from '@/types/game'

const RACES = Number(process.env.RACES ?? '500')
const DISTANCES = (process.env.DISTANCES ?? '4,10')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => !Number.isNaN(value))

const SURFACES = (process.env.SURFACES ?? 'dry_dirt,wet_muddy,sand,rocky')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const clampStat = (value: number) => Math.max(1, Math.min(10, value))

const baseHorse: Horse = {
  id: 'base-horse',
  name: 'Baseline',
  tier: 1,
  bloodline: 'Desert Wind',
  stats: {
    speed: 6,
    stamina: 6,
    grit: 6,
    temper: 6,
  },
  potential: {
    speed: 10,
    stamina: 10,
    grit: 10,
    temper: 10,
  },
  cost: 0,
}

const baseJockey: Jockey = {
  id: 'base-jockey',
  name: 'Baseline',
  stats: {
    skill: 6,
    timing: 6,
    weight: 6,
  },
  hireCost: 0,
  upkeepCost: 0,
}

const baseStrategy = {
  start: 'steady',
  mid: 'push',
  finish: 'sprint',
} as const

const statConfigs = [
  { id: 'speed', label: 'Horse Speed', target: 'horse', key: 'speed', delta: 1 },
  { id: 'stamina', label: 'Horse Stamina', target: 'horse', key: 'stamina', delta: 1 },
  { id: 'grit', label: 'Horse Grit', target: 'horse', key: 'grit', delta: 1 },
  { id: 'temper', label: 'Horse Temper', target: 'horse', key: 'temper', delta: -1 },
  { id: 'skill', label: 'Jockey Skill', target: 'jockey', key: 'skill', delta: 1 },
  { id: 'timing', label: 'Jockey Timing', target: 'jockey', key: 'timing', delta: 1 },
  { id: 'weight', label: 'Jockey Weight', target: 'jockey', key: 'weight', delta: -1 },
] as const

type StatConfig = (typeof statConfigs)[number]

const makeTrack = (surface: string, distance: number): Track => {
  const category = distance <= 4 ? 'sprint' : distance <= 8 ? 'mixed' : 'distance'
  return {
    name: `${surface}-${distance}`,
    surface: surface as Track['surface'],
    category,
    distance,
    description: `${distance}f ${surface}`,
  }
}

const createParticipant = (
  id: string,
  horse: Horse,
  jockey: Jockey,
): RaceParticipant => ({
  playerId: id,
  playerName: id,
  horse,
  jockey,
  equipment: {},
  strategy: baseStrategy,
  derivedStats: {
    baseSpeed: 0,
    staminaPool: 0,
    burnRate: 0,
    terrainMod: 0,
    efficiency: 0,
    consistency: { variance: 0, isStable: true },
  },
  bloodlineBonuses: undefined,
})

const applyStatDelta = (config: StatConfig) => {
  const horse = { ...baseHorse, stats: { ...baseHorse.stats } }
  const jockey = { ...baseJockey, stats: { ...baseJockey.stats } }

  if (config.target === 'horse') {
    const current = horse.stats[config.key as keyof Horse['stats']]
    horse.stats[config.key as keyof Horse['stats']] = clampStat(current + config.delta)
  } else {
    const current = jockey.stats[config.key as keyof Jockey['stats']]
    jockey.stats[config.key as keyof Jockey['stats']] = clampStat(current + config.delta)
  }

  return { horse, jockey }
}

const pad = (value: string, length: number) => value.padEnd(length)

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

const runScenario = (surface: string, distance: number) => {
  const track = makeTrack(surface, distance)
  const scenarioResults = [] as Array<{
    stat: StatConfig
    wins: number
    total: number
    avgTimeDiff: number
  }>

  const originalLog = console.log
  console.log = () => {}

  for (const stat of statConfigs) {
    let wins = 0
    let totalTimeDiff = 0

    for (let raceIndex = 0; raceIndex < RACES; raceIndex++) {
      const { horse: boostedHorse, jockey: boostedJockey } = applyStatDelta(stat)

      const baseParticipant = createParticipant('base', baseHorse, baseJockey)
      const boostedParticipant = createParticipant('boosted', boostedHorse, boostedJockey)

      const simulator = new RaceSimulator({
        track,
        participants: [baseParticipant, boostedParticipant],
        seed: `impact-${surface}-${distance}-${stat.id}-${raceIndex}`,
      })

      const outcome = simulator.simulate()
      const placements = outcome.placements
      const boostedPlacement = placements.find((p) => p.playerId === 'boosted')
      const basePlacement = placements.find((p) => p.playerId === 'base')

      if (boostedPlacement && basePlacement) {
        if (boostedPlacement.position < basePlacement.position) {
          wins += 1
        }
        totalTimeDiff += basePlacement.finishTime - boostedPlacement.finishTime
      }
    }

    scenarioResults.push({
      stat,
      wins,
      total: RACES,
      avgTimeDiff: totalTimeDiff / RACES,
    })
  }

  console.log = originalLog
  return scenarioResults
}

const aggregateResults = new Map<string, { stat: StatConfig; wins: number; total: number; time: number }>()

const printScenario = (label: string, results: ReturnType<typeof runScenario>) => {
  console.log(`\n${label}`)
  console.log(
    `${pad('Stat', 20)}${pad('Delta', 8)}${pad('Win%', 8)}${pad('AvgTime(ms)', 14)}Trend`,
  )
  console.log('-'.repeat(60))

  results.forEach((result) => {
    const winRate = result.wins / result.total
    const trend = result.avgTimeDiff > 0 ? 'faster' : 'slower'
    console.log(
      `${pad(result.stat.label, 20)}${pad(String(result.stat.delta), 8)}${pad(
        formatPercent(winRate),
        8,
      )}${pad(result.avgTimeDiff.toFixed(1), 14)}${trend}`,
    )

    const aggregate = aggregateResults.get(result.stat.id) ?? {
      stat: result.stat,
      wins: 0,
      total: 0,
      time: 0,
    }
    aggregate.wins += result.wins
    aggregate.total += result.total
    aggregate.time += result.avgTimeDiff * result.total
    aggregateResults.set(result.stat.id, aggregate)
  })
}

console.log(`Running stat impact simulations: races=${RACES}`)

for (const surface of SURFACES) {
  for (const distance of DISTANCES) {
    const results = runScenario(surface, distance)
    printScenario(`Surface=${surface} Distance=${distance}f`, results)
  }
}

if (aggregateResults.size > 0) {
  console.log('\nOverall (all scenarios)')
  console.log(
    `${pad('Stat', 20)}${pad('Delta', 8)}${pad('Win%', 8)}${pad('AvgTime(ms)', 14)}Trend`,
  )
  console.log('-'.repeat(60))

  aggregateResults.forEach((aggregate) => {
    const winRate = aggregate.wins / aggregate.total
    const avgTimeDiff = aggregate.time / aggregate.total
    const trend = avgTimeDiff > 0 ? 'faster' : 'slower'
    console.log(
      `${pad(aggregate.stat.label, 20)}${pad(String(aggregate.stat.delta), 8)}${pad(
        formatPercent(winRate),
        8,
      )}${pad(avgTimeDiff.toFixed(1), 14)}${trend}`,
    )
  })
}
