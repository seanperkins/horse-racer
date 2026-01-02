'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/store/gameStore'

export function PhaseTimer() {
  const { phaseDuration, phaseStartTime } = useGameStore()
  const [timeLeft, setTimeLeft] = useState(phaseDuration)

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
