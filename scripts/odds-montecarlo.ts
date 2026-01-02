import { RaceSimulator } from '@/game/simulation/RaceSimulator'
import { calculatePowerRating } from '@/game/stats'
import { generateHorse, generateJockey } from '@/game/generators'
import { generateTrackForRound } from '@/game/tracks'
import type { RaceParticipant } from '@/types/game'

const RACES = 2000
const PLAYERS = 8
const BINS = 10

const HOUSE_EDGE = Number(process.env.HOUSE_EDGE ?? '0.95')
const WIN_CAP = Number(process.env.WIN_CAP ?? '8')
const PLACE_CAP = Number(process.env.PLACE_CAP ?? '3')
const EXACTA_CAP = Number(process.env.EXACTA_CAP ?? '60')

const createParticipant = (id: string): RaceParticipant => ({
  playerId: id,
  playerName: `Player ${id}`,
  horse: generateHorse(2),
  jockey: generateJockey(2),
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

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

const calculatePlaceProbability = (strengths: number[], idx: number): number => {
  const total = sum(strengths)
  const s = strengths[idx]
  if (total === 0) return 0

  let probability = s / total

  for (let j = 0; j < strengths.length; j++) {
    if (j === idx) continue
    const sJ = strengths[j]
    const totalAfterJ = total - sJ
    if (totalAfterJ <= 0) continue
    probability += (sJ / total) * (s / totalAfterJ)
  }

  for (let j = 0; j < strengths.length; j++) {
    if (j === idx) continue
    const sJ = strengths[j]
    const totalAfterJ = total - sJ
    if (totalAfterJ <= 0) continue

    for (let k = 0; k < strengths.length; k++) {
      if (k === idx || k === j) continue
      const sK = strengths[k]
      const totalAfterJK = totalAfterJ - sK
      if (totalAfterJK <= 0) continue
      probability += (sJ / total) * (sK / totalAfterJ) * (s / totalAfterJK)
    }
  }

  return probability
}

const calculateExactaProbability = (strengths: number[], first: number, second: number): number => {
  const total = sum(strengths)
  const sFirst = strengths[first]
  const sSecond = strengths[second]
  if (total === 0) return 0
  const remaining = total - sFirst
  if (remaining <= 0) return 0
  return (sFirst / total) * (sSecond / remaining)
}

const initBins = () => ({
  counts: Array(BINS).fill(0) as number[],
  predicted: Array(BINS).fill(0) as number[],
  actual: Array(BINS).fill(0) as number[],
})

const winBins = initBins()
const placeBins = initBins()

let currentWinReturn = 0
let currentPlaceReturn = 0
let currentExactaReturn = 0
let currentWinBets = 0
let currentPlaceBets = 0
let currentExactaBets = 0

let proposedWinReturn = 0
let proposedPlaceReturn = 0
let proposedExactaReturn = 0
let proposedWinBets = 0
let proposedPlaceBets = 0
let proposedExactaBets = 0

for (let raceIndex = 0; raceIndex < RACES; raceIndex++) {
  const participants: RaceParticipant[] = Array.from({ length: PLAYERS }, (_, idx) =>
    createParticipant(`p${raceIndex}-${idx + 1}`)
  )

  const track = generateTrackForRound((raceIndex % 8) + 1)

  const simulator = new RaceSimulator({
    track,
    participants,
    seed: `race-${raceIndex}-${Math.random().toString(36).slice(2)}`,
  })

  const outcome = simulator.simulate()
  const placements = outcome.placements.map((p) => p.playerId)
  const winnerId = placements[0]
  const top3 = new Set(placements.slice(0, 3))

  const strengths = participants.map((participant) =>
    calculatePowerRating(participant.horse, participant.jockey, participant.equipment || {}, 1.0)
  )
  const totalStrength = sum(strengths)

  const winProbs = strengths.map((s) => (totalStrength > 0 ? s / totalStrength : 0))
  const placeProbs = strengths.map((_, idx) => calculatePlaceProbability(strengths, idx))

  participants.forEach((participant, idx) => {
    const winProb = winProbs[idx]
    const placeProb = placeProbs[idx]
    const winBin = Math.min(BINS - 1, Math.floor(winProb * BINS))
    const placeBin = Math.min(BINS - 1, Math.floor(placeProb * BINS))

    winBins.counts[winBin] += 1
    winBins.predicted[winBin] += winProb
    winBins.actual[winBin] += participant.playerId === winnerId ? 1 : 0

    placeBins.counts[placeBin] += 1
    placeBins.predicted[placeBin] += placeProb
    placeBins.actual[placeBin] += top3.has(participant.playerId) ? 1 : 0

    const currentWinPayout = Math.min(WIN_CAP, 1 / Math.max(winProb, 1e-6))
    const currentPlacePayout = Math.min(PLACE_CAP, Math.max(1.5, currentWinPayout * 0.6))

    currentWinBets += 1
    currentPlaceBets += 1
    if (participant.playerId === winnerId) {
      currentWinReturn += currentWinPayout
    }
    if (top3.has(participant.playerId)) {
      currentPlaceReturn += currentPlacePayout
    }

    const proposedWinPayout = Math.min(WIN_CAP, (HOUSE_EDGE / Math.max(winProb, 1e-6)))
    const proposedPlacePayout = Math.min(PLACE_CAP, (HOUSE_EDGE / Math.max(placeProb, 1e-6)))

    proposedWinBets += 1
    proposedPlaceBets += 1
    if (participant.playerId === winnerId) {
      proposedWinReturn += proposedWinPayout
    }
    if (top3.has(participant.playerId)) {
      proposedPlaceReturn += proposedPlacePayout
    }
  })

  for (let i = 0; i < participants.length; i++) {
    for (let j = 0; j < participants.length; j++) {
      if (i === j) continue
      const exactaProb = calculateExactaProbability(strengths, i, j)
      const exactaWin = placements[0] === participants[i].playerId && placements[1] === participants[j].playerId

      currentExactaBets += 1
      if (exactaWin) {
        currentExactaReturn += 10
      }

      const proposedExactaPayout = Math.min(EXACTA_CAP, HOUSE_EDGE / Math.max(exactaProb, 1e-6))
      proposedExactaBets += 1
      if (exactaWin) {
        proposedExactaReturn += proposedExactaPayout
      }
    }
  }
}

const reportBins = (label: string, bins: { counts: number[]; predicted: number[]; actual: number[] }) => {
  console.log(`\n${label} calibration (predicted vs actual)`)
  bins.counts.forEach((count, idx) => {
    if (count === 0) return
    const predicted = bins.predicted[idx] / count
    const actual = bins.actual[idx] / count
    const rangeStart = (idx / BINS).toFixed(2)
    const rangeEnd = ((idx + 1) / BINS).toFixed(2)
    console.log(`${rangeStart}-${rangeEnd}: predicted=${predicted.toFixed(3)} actual=${actual.toFixed(3)} n=${count}`)
  })
}

const summarizeReturn = (label: string, totalReturn: number, totalBets: number) => {
  const average = totalBets ? totalReturn / totalBets : 0
  console.log(`${label}: avg return per 1g bet = ${average.toFixed(3)} (${(average * 100).toFixed(1)}% EV)`) // EV here is return ratio
}

reportBins('Win', winBins)
reportBins('Place', placeBins)

console.log('\nCurrent payouts')
summarizeReturn('Win', currentWinReturn, currentWinBets)
summarizeReturn('Place', currentPlaceReturn, currentPlaceBets)
summarizeReturn('Exacta', currentExactaReturn, currentExactaBets)

console.log(`\nProposed payouts (edge=${HOUSE_EDGE})`)
summarizeReturn('Win', proposedWinReturn, proposedWinBets)
summarizeReturn('Place', proposedPlaceReturn, proposedPlaceBets)
summarizeReturn('Exacta', proposedExactaReturn, proposedExactaBets)
