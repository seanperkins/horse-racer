'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/store/gameStore'

export function UniversalHeader() {
  const {
    currentPhase,
    currentRound,
    gold,
    hearts,
    currentTrack,
    players,
    eliminated,
    phaseDuration,
    phaseStartTime,
    playerId,
    playerReadyStatus,
    sendMessage
  } = useGameStore()

  const [timeLeft, setTimeLeft] = useState(phaseDuration)

  // Timer logic (copied from PhaseTimer)
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - phaseStartTime) / 1000)
      const remaining = Math.max(0, phaseDuration - elapsed)
      setTimeLeft(remaining)
    }, 100)

    return () => clearInterval(interval)
  }, [phaseDuration, phaseStartTime])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const safeDuration = Math.max(phaseDuration, 1)
  const percentage = (timeLeft / safeDuration) * 100

  // Format phase name
  const phaseNames: Record<string, string> = {
    shop: 'Shop Phase',
    preparation: 'Preparation Phase',
    betting: 'Betting Phase',
    race: 'Race In Progress',
    results: 'Results'
  }

  const phaseName = phaseNames[currentPhase] || currentPhase

  // Player count
  const activePlayers = players.filter(p => {
    // In a real game, you'd check elimination status from game state
    // For now, just count all players
    return true
  }).length

  // Ready status
  const isReady = playerId ? playerReadyStatus[playerId] : false
  const canReady = currentPhase === 'shop' || currentPhase === 'results' || currentPhase === 'betting'

  const handleToggleReady = () => {
    if (!playerId || !canReady) {
      console.warn('Cannot ready up: playerId=', playerId, 'canReady=', canReady)
      return
    }

    console.log('Sending ready_up:', { playerId, isReady, currentPhase })

    // For betting phase, we need to handle skip differently
    if (currentPhase === 'betting') {
      // Skip betting - just mark as ready without placing a bet
      sendMessage({
        type: 'ready_up',
        ready: true,
        userId: playerId
      })
      return
    }

    sendMessage({
      type: 'ready_up',
      ready: !isReady,
      userId: playerId
    })
  }

  // Get button text based on phase
  const getReadyButtonText = () => {
    if (currentPhase === 'betting') {
      return isReady ? '✓ Skipped' : 'Skip Betting'
    }
    return isReady ? '✓ Ready' : 'Ready Up'
  }

  // Don't show header in lobby
  if (currentPhase === 'lobby') {
    return null
  }

  return (
    <div className="sticky top-0 z-50 th-card border-b th-border shadow-lg backdrop-blur-sm bg-[var(--bg-primary)]">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left section: Round, Phase, Timer */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold th-label">Round {currentRound}</span>
              <span className="text-xs th-muted">•</span>
              <span className="text-sm th-label">{phaseName}</span>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-2">
              <div className="text-sm font-mono th-label">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="w-20 h-2 rounded-full overflow-hidden th-timer-bar">
                <div
                  className={`h-full transition-all ${
                    percentage > 50
                      ? 'bg-emerald-400'
                      : percentage > 20
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Center section: Resources and Track */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-base">💰</span>
                <span className="text-sm font-semibold th-label">{gold}g</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base">❤️</span>
                <span className="text-sm font-semibold th-label">{hearts}</span>
              </div>
            </div>

            {currentTrack && (currentPhase === 'shop' || currentPhase === 'preparation') && (
              <>
                <span className="text-xs th-muted">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs th-muted">🏁</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold th-label">{currentTrack.name}</span>
                    <span className="text-xs th-muted">
                      {currentTrack.category} • {currentTrack.distance}m • {currentTrack.surface}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right section: Player count and Ready button */}
          <div className="flex items-center gap-3">
            <div className="text-sm th-muted">
              {activePlayers} player{activePlayers !== 1 ? 's' : ''}
            </div>

            {canReady && (
              <button
                onClick={handleToggleReady}
                disabled={eliminated || isReady}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  isReady
                    ? 'th-button-green'
                    : 'th-button'
                } ${eliminated || isReady ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {getReadyButtonText()}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
