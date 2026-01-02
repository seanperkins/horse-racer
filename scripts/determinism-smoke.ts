// @ts-nocheck
import { RaceSimulator } from '../game/simulation/RaceSimulator'
import { calculateDerivedStats } from '../game/stats'
import type { RaceParticipant, Track } from '../types/game'

const track: Track = {
  id: 'test-track',
  name: 'Test Track',
  category: 'sprint',
  surface: 'dry_dirt',
  distance: 6,
  description: 'Determinism test track',
}

const baseHorse = {
  tier: 1 as const,
  bloodline: 'Desert Wind' as const,
  potential: { speed: 7, stamina: 6, grit: 6, temper: 6 },
  cost: 2,
}

const baseJockey = {
  cost: 2,
}

const makeParticipant = (
  playerId: string,
  playerName: string,
  stats: { speed: number; stamina: number; grit: number; temper: number },
  jockeyStats: { skill: number; timing: number; weight: number },
  finishStrategy: 'sprint' | 'maintain' | 'gamble',
): RaceParticipant => {
  const horse = {
    id: `horse-${playerId}`,
    name: `Horse ${playerName}`,
    ...baseHorse,
    stats,
    potential: {
      speed: Math.max(stats.speed, baseHorse.potential.speed),
      stamina: Math.max(stats.stamina, baseHorse.potential.stamina),
      grit: Math.max(stats.grit, baseHorse.potential.grit),
      temper: Math.max(stats.temper, baseHorse.potential.temper),
    },
  }

  const jockey = {
    id: `jockey-${playerId}`,
    name: `Jockey ${playerName}`,
    ...baseJockey,
    stats: jockeyStats,
  }

  const equipment = {}
  const derivedStats = calculateDerivedStats(horse, jockey, equipment, track.surface)

  return {
    playerId,
    playerName,
    horse,
    jockey,
    equipment,
    strategy: {
      start: 'steady',
      mid: 'react',
      finish: finishStrategy,
    },
    derivedStats,
    bloodlineBonuses: {},
  }
}

const participants: RaceParticipant[] = [
  makeParticipant(
    'p1',
    'Alpha',
    { speed: 6, stamina: 5, grit: 5, temper: 4 },
    { skill: 5, timing: 5, weight: 5 },
    'maintain',
  ),
  makeParticipant(
    'p2',
    'Bravo',
    { speed: 7, stamina: 4, grit: 4, temper: 6 },
    { skill: 4, timing: 6, weight: 4 },
    'gamble',
  ),
  makeParticipant(
    'p3',
    'Charlie',
    { speed: 5, stamina: 6, grit: 6, temper: 5 },
    { skill: 6, timing: 4, weight: 6 },
    'sprint',
  ),
]

const run = (seed: string) =>
  new RaceSimulator({ track, participants, seed }).simulate()

const a = run('seed-123')
const b = run('seed-123')
const c = run('seed-456')

if (JSON.stringify(a) !== JSON.stringify(b)) {
  throw new Error('Determinism failed: same seed differs')
}

if (JSON.stringify(a) === JSON.stringify(c)) {
  throw new Error('Determinism failed: different seeds identical')
}

console.log('Determinism OK')
