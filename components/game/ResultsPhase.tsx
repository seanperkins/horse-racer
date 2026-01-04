'use client'

import { useState, useEffect } from 'react'
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
}

export function ResultsPhase() {
  const { currentRound, gold, hearts, raceResults, playerId, playerReadyStatus } = useGameStore()
  const playSfx = useAudioStore((state) => state.playSfx)

  if (!raceResults || !raceResults.placements) {
    return (
      <div className="min-h-screen p-8 th-bg">
        <div className="max-w-4xl mx-auto">
          <div className="th-panel rounded-lg p-8 text-center">
            <p className="th-label">Loading results...</p>
          </div>
        </div>
      </div>
    )
  }

  const placements = raceResults.placements as PlacementResult[]
  const betResults = (raceResults.betResults as BetResult[]) || []
  const eliminatedPlayers = raceResults.eliminatedPlayers || []

  const myPlacement = placements.find((p) => p.playerId === playerId)
  const myBetResult = betResults.find((b) => b.playerId === playerId)
  const wasEliminated = eliminatedPlayers.includes(playerId || '')

  // Play victory/defeat sound when results load
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
    <div className="min-h-screen p-4 md:p-8 th-bg">
      <div className="max-w-5xl mx-auto">
        {/* Your Performance Summary */}
        {myPlacement && (
          <div className="th-panel rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-center">Your Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-sm th-label mb-1">Finish Position</div>
                <div className="text-3xl font-bold">
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
                <div className="text-sm th-label mb-1">Gold Earned</div>
                <div className="text-3xl font-bold text-[var(--accent-gold)]">
                  +{myPlacement.goldReward}g
                </div>
              </div>
              <div>
                <div className="text-sm th-label mb-1">Hearts Lost</div>
                <div
                  className={`text-3xl font-bold ${myPlacement.heartsDamage > 0 ? 'text-[var(--accent-red)]' : 'text-[var(--accent-green)]'}`}
                >
                  {myPlacement.heartsDamage > 0 ? `-${myPlacement.heartsDamage}` : '0'}
                </div>
              </div>
              <div>
                <div className="text-sm th-label mb-1">Finish Time</div>
                <div className="text-2xl font-bold">{(myPlacement.time / 1000).toFixed(2)}s</div>
              </div>
            </div>

            {/* Bet Result */}
            {myBetResult && (
              <div className="mt-4 p-4 bg-[var(--bg-secondary)] rounded">
                {myBetResult.won ? (
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[var(--accent-green)]">✓ Bet Won!</div>
                    <div className="text-lg font-bold text-[var(--accent-gold)]">
                      +{myBetResult.payout}g
                    </div>
                  </div>
                ) : myBetResult.payout < 0 ? (
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[var(--accent-red)]">✗ Bet Lost</div>
                    <div className="text-lg font-bold text-[var(--accent-red)]">
                      {myBetResult.payout}g
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Elimination Warning */}
            {wasEliminated && (
              <div className="mt-4 p-4 bg-[var(--accent-red)]/20 border-2 border-[var(--accent-red)] rounded text-center">
                <div className="text-2xl font-bold text-[var(--accent-red)] mb-2">
                  💀 ELIMINATED
                </div>
                <div className="text-sm">You have been eliminated from the match!</div>
              </div>
            )}
          </div>
        )}

        {/* Full Race Results */}
        <div className="th-panel rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-6 text-center">Final Standings</h2>

          <div className="space-y-3">
            {placements
              .sort((a, b) => a.position - b.position)
              .map((placement) => {
                const isYou = placement.playerId === playerId
                const wasEliminatedPlayer = eliminatedPlayers.includes(placement.playerId)

                return (
                  <div
                    key={placement.playerId}
                    className={`flex items-center justify-between px-4 md:px-6 py-4 rounded-lg border-2 ${
                      getPositionColor(placement.position)
                    } ${isYou ? 'ring-2 ring-[var(--accent-green)]' : ''}`}
                  >
                    <div className="flex items-center gap-3 md:gap-4 flex-1">
                      <div className="text-xl md:text-2xl font-bold min-w-[2rem]">
                        {getPositionMedal(placement.position)} {placement.position}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold">
                          {placement.playerName}
                          {isYou && ' (You)'}
                          {placement.playerId.startsWith('ai-player-') && ' 🤖'}
                          {wasEliminatedPlayer && (
                            <span className="ml-2 text-[var(--accent-red)] text-sm">
                              💀 Eliminated
                            </span>
                          )}
                        </div>
                        <div className="text-xs md:text-sm th-label">
                          Time: {(placement.time / 1000).toFixed(2)}s
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-[var(--accent-gold)]">
                        +{placement.goldReward}g
                      </div>
                      {placement.heartsDamage > 0 && (
                        <div className="text-sm text-[var(--accent-red)]">
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
          <div className="th-panel rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold mb-3 text-center text-[var(--accent-red)]">
              Eliminated This Round
            </h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {eliminatedPlayers.map((playerIdElim) => {
                const player = placements.find((p) => p.playerId === playerIdElim)
                return (
                  <div
                    key={playerIdElim}
                    className="px-4 py-2 bg-[var(--accent-red)]/20 border border-[var(--accent-red)] rounded"
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
          <div className="th-panel rounded-lg p-6 mt-6">
            <div className="th-label text-sm mb-3 text-center">
              Waiting for players...
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {Object.entries(playerReadyStatus).map(([pid, ready]) => {
                const player = placements.find((p) => p.playerId === pid)
                if (!player) return null

                return (
                  <div
                    key={pid}
                    className={`px-3 py-1 rounded text-sm font-semibold ${
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

        <div className="text-center th-label mt-6">
          {wasEliminated
            ? 'You can spectate the remaining rounds...'
            : 'Next round starts when all players are ready or after 60 seconds'}
        </div>
      </div>
    </div>
  )
}
