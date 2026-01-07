'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/store/gameStore'

export function PhaseTimer() {
  const { phaseEndTime, players, currentPhase } = useGameStore()
  const [timeLeft, setTimeLeft] = useState(0)

  // Check if this is a single-player game
  const isSinglePlayer = players.length === 1

  // In single-player mode, hide timer for all phases except race
  const shouldHideTimer = isSinglePlayer && currentPhase !== 'race'

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

  // Don't render timer in single-player mode (except race phase)
  if (shouldHideTimer) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-lg font-semibold th-label">
          Ready when you are!
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-lg font-mono th-label">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div className="w-32 h-3 rounded-full overflow-hidden th-timer-bar">
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
  )
}
