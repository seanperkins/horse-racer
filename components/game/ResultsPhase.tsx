'use client'

import { useEffect } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import { useAudioStore } from '@/lib/store/audioStore'

interface PlacementResult {
  playerId: string
  playerName: string
  position: number
  time: number
  goldReward: number
  heartsDamage: number
}

interface BetResult {
  playerId: string
  won: boolean
  payout: number
  reputationEarned?: number
  isHeartBet?: boolean
}

export function ResultsPhase() {
  const { currentRound, gold, hearts, raceResults, playerId, playerReadyStatus } = useGameStore()
  const playSfx = useAudioStore((state) => state.playSfx)

  // Derive values for the effect (must be before any conditional returns)
  // Note: After the guard check below, we know placements is defined
  const placements = raceResults?.placements as PlacementResult[] | undefined
  // Re-derive after guard for type narrowing (used after early return)
  const safePlacements = raceResults?.placements as PlacementResult[]
  const betResults = (raceResults?.betResults as BetResult[]) || []
  const eliminatedPlayers = raceResults?.eliminatedPlayers || []
  const myPlacement = placements?.find((p) => p.playerId === playerId)
  const wasEliminated = eliminatedPlayers.includes(playerId || '')

  // Play victory/defeat sound when results load
  // This hook must be called unconditionally (before any early returns)
  useEffect(() => {
    if (myPlacement) {
      if (myPlacement.position === 1) {
        playSfx('victory')
      } else if (myPlacement.position > 3 || wasEliminated) {
        playSfx('defeat')
      } else {
        playSfx('race_finish')
      }
    }
  }, [myPlacement, wasEliminated, playSfx])

  if (!raceResults || !raceResults.placements) {
    return (
      <div className="min-h-screen p-4 sm:p-8 th-bg">
        <div className="max-w-4xl mx-auto">
          <div className="th-panel rounded-lg p-4 sm:p-8 text-center">
            <p className="th-label text-sm sm:text-base">Loading results...</p>
          </div>
        </div>
      </div>
    )
  }

  const myBetResult = betResults.find((b) => b.playerId === playerId)

  const getPositionMedal = (position: number) => {
    if (position === 1) return '🥇'
    if (position === 2) return '🥈'
    if (position === 3) return '🥉'
    return ''
  }

  const getPositionColor = (position: number) => {
    if (position === 1) return 'bg-[#3a2d1a] border-[#c6942f]'
    if (position === 2) return 'bg-[#2b2a33] border-[#7a7a8a]'
    if (position === 3) return 'bg-[#402515] border-[#b86a2b]'
    return 'bg-[#231c37] border-[var(--outline)]'
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8 th-bg">
      <div className="max-w-5xl mx-auto">
        {/* Your Performance Summary */}
        {myPlacement && (
          <div className="th-panel rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-center">Your Performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-center">
              <div>
                <div className="text-xs sm:text-sm th-label mb-1">Position</div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold">
                  {getPositionMedal(myPlacement.position)} {myPlacement.position}
                  {myPlacement.position === 1
                    ? 'st'
                    : myPlacement.position === 2
                      ? 'nd'
                      : myPlacement.position === 3
                        ? 'rd'
                        : 'th'}
                </div>
              </div>
              <div>
                <div className="text-xs sm:text-sm th-label mb-1">Gold</div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--accent-gold)]">
                  +{myPlacement.goldReward}g
                </div>
              </div>
              <div>
                <div className="text-xs sm:text-sm th-label mb-1">Hearts</div>
                <div
                  className={`text-xl sm:text-2xl md:text-3xl font-bold ${myPlacement.heartsDamage > 0 ? 'text-[var(--accent-red)]' : 'text-[var(--accent-green)]'}`}
                >
                  {myPlacement.heartsDamage > 0 ? `-${myPlacement.heartsDamage}` : '0'}
                </div>
              </div>
              <div>
                <div className="text-xs sm:text-sm th-label mb-1">Time</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold">{(myPlacement.time / 1000).toFixed(2)}s</div>
              </div>
            </div>

            {/* Bet Result */}
            {myBetResult && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-[var(--bg-secondary)] rounded">
                {myBetResult.won ? (
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm sm:text-base text-[var(--accent-green)]">✓ Bet Won!</div>
                    <div className="text-base sm:text-lg font-bold text-[var(--accent-purple)]">
                      {myBetResult.isHeartBet ? '+1 ❤️' : `+${myBetResult.reputationEarned || 0} ⭐`}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm sm:text-base text-[var(--accent-red)]">✗ Bet Lost</div>
                    <div className="text-base sm:text-lg font-bold th-label">
                      No penalty
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Elimination Warning */}
            {wasEliminated && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-[var(--accent-red)]/20 border-2 border-[var(--accent-red)] rounded text-center">
                <div className="text-xl sm:text-2xl font-bold text-[var(--accent-red)] mb-1 sm:mb-2">
                  💀 ELIMINATED
                </div>
                <div className="text-xs sm:text-sm">You have been eliminated from the match!</div>
              </div>
            )}
          </div>
        )}

        {/* Full Race Results */}
        <div className="th-panel rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">Final Standings</h2>

          <div className="space-y-2 sm:space-y-3">
            {safePlacements
              .sort((a, b) => a.position - b.position)
              .map((placement) => {
                const isYou = placement.playerId === playerId
                const wasEliminatedPlayer = eliminatedPlayers.includes(placement.playerId)

                return (
                  <div
                    key={placement.playerId}
                    className={`flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 rounded-lg border-2 ${
                      getPositionColor(placement.position)
                    } ${isYou ? 'ring-2 ring-[var(--accent-green)]' : ''}`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold flex-shrink-0">
                        {getPositionMedal(placement.position)} {placement.position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm sm:text-base truncate">
                          {placement.playerName}
                          {isYou && ' (You)'}
                          {placement.playerId.startsWith('ai-player-') && ' 🤖'}
                          {wasEliminatedPlayer && (
                            <span className="ml-1 sm:ml-2 text-[var(--accent-red)] text-xs sm:text-sm">
                              💀
                            </span>
                          )}
                        </div>
                        <div className="text-xs th-label hidden sm:block">
                          Time: {(placement.time / 1000).toFixed(2)}s
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="font-bold text-sm sm:text-lg text-[var(--accent-gold)]">
                        +{placement.goldReward}g
                      </div>
                      {placement.heartsDamage > 0 && (
                        <div className="text-xs sm:text-sm text-[var(--accent-red)]">
                          -{placement.heartsDamage} ❤️
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Other Eliminated Players */}
        {eliminatedPlayers.length > 0 && (
          <div className="th-panel rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-center text-[var(--accent-red)]">
              Eliminated This Round
            </h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {eliminatedPlayers.map((playerIdElim) => {
                const player = safePlacements.find((p) => p.playerId === playerIdElim)
                return (
                  <div
                    key={playerIdElim}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[var(--accent-red)]/20 border border-[var(--accent-red)] rounded text-sm"
                  >
                    {player?.playerName || 'Unknown'}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Player Ready Status */}
        {!wasEliminated && playerReadyStatus && Object.keys(playerReadyStatus).length > 0 && (
          <div className="th-panel rounded-lg p-3 sm:p-4 md:p-6 mt-4 sm:mt-6">
            <div className="th-label text-xs sm:text-sm mb-2 sm:mb-3 text-center">
              Waiting for players...
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
              {Object.entries(playerReadyStatus).map(([pid, ready]) => {
                const player = safePlacements.find((p) => p.playerId === pid)
                if (!player) return null

                return (
                  <div
                    key={pid}
                    className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-semibold ${
                      ready
                        ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)] border border-[var(--accent-green)]'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--outline)]'
                    }`}
                  >
                    {ready ? '✓' : '○'} {player.playerName}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="text-center th-label text-xs sm:text-sm mt-4 sm:mt-6 px-2">
          {wasEliminated
            ? 'You can spectate the remaining rounds...'
            : 'Next round starts when all players are ready or after 60 seconds'}
        </div>
      </div>
    </div>
  )
}
