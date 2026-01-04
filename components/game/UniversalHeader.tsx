'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import { AudioSettings } from '@/app/components/AudioSettings'

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
    sendMessage,
    bettingStatus,
    setBettingStatus
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

  // Format phase name - shorter on mobile
  const phaseNames: Record<string, string> = {
    shop: 'Shop',
    preparation: 'Prep',
    betting: 'Betting',
    race: 'Race',
    results: 'Results'
  }

  const phaseName = phaseNames[currentPhase] || currentPhase

  // Player count
  const activePlayers = players.filter(p => {
    return true
  }).length

  // Ready status - for betting phase, use bettingStatus from store
  const isReady = playerId ? playerReadyStatus[playerId] : false
  const isBettingDone = currentPhase === 'betting' && bettingStatus !== 'open'
  const canReady = currentPhase === 'shop' || currentPhase === 'results' || currentPhase === 'betting'

  const handleToggleReady = () => {
    if (!playerId || !canReady) {
      console.warn('Cannot ready up: playerId=', playerId, 'canReady=', canReady)
      return
    }

    console.log('Sending ready_up:', { playerId, isReady, currentPhase, bettingStatus })

    // For betting phase, we need to handle skip differently
    if (currentPhase === 'betting') {
      // Don't allow skip if already bet/skipped
      if (bettingStatus !== 'open') {
        console.warn('Betting already done:', bettingStatus)
        return
      }
      // Skip betting - update store state and mark as ready
      setBettingStatus('skipped')
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
      if (bettingStatus === 'submitted') return '✓ Bet'
      if (bettingStatus === 'skipped') return '✓ Skip'
      return 'Skip'
    }
    return isReady ? '✓ Ready' : 'Ready'
  }

  // Determine if button should be disabled
  const isButtonDisabled = () => {
    if (eliminated) return true
    if (currentPhase === 'betting') return bettingStatus !== 'open'
    return isReady
  }

  // Don't show header in lobby
  if (currentPhase === 'lobby') {
    return null
  }

  return (
    <div className="sticky top-0 z-50 th-card border-b th-border shadow-lg backdrop-blur-sm bg-[var(--bg-primary)]">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
        {/* Mobile: Two rows, Desktop: Single row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">

          {/* Top row on mobile / Left section on desktop: Round, Phase, Timer, Resources */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
            {/* Round & Phase */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-semibold th-label">R{currentRound}</span>
              <span className="text-xs th-muted hidden sm:inline">•</span>
              <span className="text-xs sm:text-sm th-label">{phaseName}</span>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="text-xs sm:text-sm font-mono th-label">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="w-12 sm:w-16 md:w-20 h-1.5 sm:h-2 rounded-full overflow-hidden th-timer-bar">
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

            {/* Resources - visible on mobile */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1">
                <span className="text-sm sm:text-base">💰</span>
                <span className="text-xs sm:text-sm font-semibold th-label">{gold}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm sm:text-base">❤️</span>
                <span className="text-xs sm:text-sm font-semibold th-label">{hearts}</span>
              </div>
            </div>
          </div>

          {/* Bottom row on mobile / Right section on desktop */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
            {/* Track info - hidden on mobile, shown on tablet+ */}
            {currentTrack && (currentPhase === 'shop' || currentPhase === 'preparation') && (
              <div className="hidden md:flex items-center gap-1.5">
                <span className="text-xs th-muted">🏁</span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold th-label">{currentTrack.name}</span>
                  <span className="text-xs th-muted">
                    {currentTrack.category} • {currentTrack.distance}m • {currentTrack.surface}
                  </span>
                </div>
              </div>
            )}

            {/* Mobile track info - condensed */}
            {currentTrack && (currentPhase === 'shop' || currentPhase === 'preparation') && (
              <div className="flex md:hidden items-center gap-1 text-xs th-muted">
                <span>🏁</span>
                <span className="truncate max-w-[100px]">{currentTrack.name}</span>
              </div>
            )}

            {/* Player count - hidden on small mobile */}
            <div className="hidden sm:block text-xs sm:text-sm th-muted">
              {activePlayers}p
            </div>

            {/* Audio settings */}
            <AudioSettings />

            {/* Ready button - larger touch target */}
            {canReady && (
              <button
                onClick={handleToggleReady}
                disabled={isButtonDisabled()}
                className={`min-h-[44px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                  isReady || isBettingDone
                    ? 'th-button-green'
                    : 'th-button'
                } ${isButtonDisabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
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
