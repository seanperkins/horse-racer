/**
 * Legacy AI horse/jockey generator
 * Now uses the main generators for consistency
 * Kept for backwards compatibility
 */

import { generateHorse, generateJockey } from './generators'

export { generateHorse as generateAIHorse, generateJockey as generateAIJockey }

export function generateAIRaceEntry(playerNumber: number): {
  playerId: string
  playerName: string
  horse: ReturnType<typeof generateHorse>
  jockey: ReturnType<typeof generateJockey>
  equipment: Record<string, unknown>
  strategy: Record<string, unknown>
} {
  return {
    playerId: `ai-player-${playerNumber}`,
    playerName: `AI Racer ${playerNumber}`,
    horse: generateHorse(2),
    jockey: generateJockey(2),
    equipment: {},
    strategy: { baseStaminaBurn: 1.0, surgePhases: [] },
  }
}
