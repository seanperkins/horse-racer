'use client'

import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '@/lib/store/gameStore'
import { useAudioStore } from '@/lib/store/audioStore'
import { SettingsMenu } from '@/components/game/SettingsMenu'

export function UniversalHeader() {
  const {
    currentPhase,
    currentRound,
    gold,
    hearts,
    reputation,
    currentTrack,
    players,
    eliminated,
    phaseEndTime,
    playerId,
    playerReadyStatus,
    sendMessage,
    bettingStatus,
    setBettingStatus,
    entryStatus,
    setEntryStatus,
    prepSelection
  } = useGameStore(
    useShallow((state) => ({
      currentPhase: state.currentPhase,
      currentRound: state.currentRound,
      gold: state.gold,
      hearts: state.hearts,
      reputation: state.reputation,
      currentTrack: state.currentTrack,
      players: state.players,
      eliminated: state.eliminated,
      phaseEndTime: state.phaseEndTime,
      playerId: state.playerId,
      playerReadyStatus: state.playerReadyStatus,
      sendMessage: state.sendMessage,
      bettingStatus: state.bettingStatus,
      setBettingStatus: state.setBettingStatus,
      entryStatus: state.entryStatus,
      setEntryStatus: state.setEntryStatus,
      prepSelection: state.prepSelection,
    }))
  )

  const playSfx = useAudioStore((state) => state.playSfx)
  const [timeLeft, setTimeLeft] = useState(0)

  // Timer logic - calculate from phaseEndTime
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((phaseEndTime - Date.now()) / 1000))
      setTimeLeft(remaining)
    }, 100)

    return () => clearInterval(interval)
  }, [phaseEndTime])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  // Calculate percentage based on typical phase duration (use 60s as baseline)
  const typicalDuration = 60
  const percentage = Math.min(100, (timeLeft / typicalDuration) * 100)

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
  const isEntryDone = currentPhase === 'preparation' && (entryStatus === 'submitted' || entryStatus === 'skipped')
  const canReady = currentPhase === 'shop' || currentPhase === 'results' || currentPhase === 'betting' || currentPhase === 'preparation'

  const handleToggleReady = () => {
    if (!playerId || !canReady) {
      console.warn('Cannot ready up: playerId=', playerId, 'canReady=', canReady)
      return
    }

    console.log('Sending ready_up:', { playerId, isReady, currentPhase, bettingStatus, entryStatus })

    // For preparation phase, handle confirm entry or skip
    if (currentPhase === 'preparation') {
      // Don't allow if already submitted or skipped
      if (entryStatus === 'submitted' || entryStatus === 'skipped') {
        console.warn('Entry already submitted or skipped')
        return
      }

      // Check if player can submit a valid entry
      const canSubmitEntry = prepSelection && prepSelection.horse && prepSelection.jockey

      if (canSubmitEntry) {
        // Send setup_race_entry message (this also marks player as ready on server)
        playSfx('ready_up')
        setEntryStatus('submitted', prepSelection)
        sendMessage({
          type: 'setup_race_entry',
          horseId: prepSelection.horse.id,
          jockeyId: prepSelection.jockey.id,
          equipment: {
            saddle: prepSelection.equipment.saddle?.id,
            horseshoes: prepSelection.equipment.horseshoes?.id,
            blinders: prepSelection.equipment.blinders?.id,
          },
          strategy: prepSelection.strategy
        })
      } else {
        // Player doesn't have a horse or jockey - skip the race
        playSfx('ready_up')
        setEntryStatus('skipped')
        sendMessage({
          type: 'ready_up',
          ready: true,
        })
      }
      return
    }

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
      })
      return
    }

    sendMessage({
      type: 'ready_up',
      ready: !isReady,
    })
  }

  // Check if player can submit a valid entry (has both horse and jockey)
  const canSubmitEntry = prepSelection && prepSelection.horse && prepSelection.jockey

  // Get button text based on phase
  const getReadyButtonText = () => {
    if (currentPhase === 'preparation') {
      if (entryStatus === 'submitted') return '✓ Entry'
      if (entryStatus === 'skipped') return '✓ Skip'
      // Show "Skip" if player can't submit (no horse or jockey)
      return canSubmitEntry ? 'Confirm Entry' : 'Skip'
    }
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
    if (currentPhase === 'preparation') {
      // Disable only if already submitted or skipped
      // Allow clicking to skip even if no horse/jockey
      return entryStatus === 'submitted' || entryStatus === 'skipped'
    }
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
              <div className="flex items-center gap-1.5">
                <span className="text-base">⭐</span>
                <span className="text-sm font-semibold th-label">{reputation}</span>
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

            {/* Settings menu (audio + leave game) */}
            <SettingsMenu />

            {/* Ready button - larger touch target */}
            {canReady && (
              <button
                onClick={handleToggleReady}
                disabled={isButtonDisabled()}
                className={`min-h-[44px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                  isReady || isBettingDone || isEntryDone
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
