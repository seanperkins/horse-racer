'use client'

import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '@/lib/store/gameStore'
import type { ClientMessage } from '@/types/messages'

interface StableCapacityBarProps {
  sendMessage: (message: ClientMessage) => void
  inline?: boolean
}

export function StableCapacityBar({ sendMessage, inline = false }: StableCapacityBarProps) {
  const { horses, stableSlots, maxStableSlots, reputation } = useGameStore(
    useShallow((state) => ({
      horses: state.horses,
      stableSlots: state.stableSlots,
      maxStableSlots: state.maxStableSlots,
      reputation: state.reputation,
    }))
  )

  const currentHorses = horses.length
  const canExpand = stableSlots < maxStableSlots

  // Expansion costs: 1 Reputation for slot 2, 2 Reputation for slot 3
  const expansionCost = stableSlots === 1 ? 1 : 2
  const canAffordExpansion = reputation >= expansionCost

  const handleExpand = () => {
    if (!canExpand || !canAffordExpansion) return
    sendMessage({ type: 'expand_stable' })
  }

  // Inline version (for header)
  if (inline) {
    return (
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <span className="text-sm sm:text-base th-muted whitespace-nowrap">
          Stable: {currentHorses}/{stableSlots}
          {stableSlots < maxStableSlots && (
            <span className="hidden sm:inline text-xs"> (max {maxStableSlots})</span>
          )}
        </span>

        {canExpand && (
          <button
            onClick={handleExpand}
            disabled={!canAffordExpansion}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-bold transition-colors flex items-center gap-1 ${
              canAffordExpansion
                ? 'bg-[var(--accent-gold)] text-black hover:bg-[var(--accent-gold)]/80'
                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed'
            }`}
            title={
              canAffordExpansion
                ? `Expand stable to ${stableSlots + 1} slots`
                : `Need ${expansionCost} Reputation to expand`
            }
          >
            <span className="hidden sm:inline">Expand</span>
            <span className="flex items-center gap-0.5">
              <span>⭐</span>
              <span>{expansionCost}</span>
            </span>
          </button>
        )}

        {stableSlots === maxStableSlots && (
          <span className="text-xs sm:text-sm text-[var(--accent-green)] font-semibold">
            Max
          </span>
        )}
      </div>
    )
  }

  // Full version (standalone panel)
  const fillPercentage = (currentHorses / maxStableSlots) * 100

  return (
    <div className="th-panel rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐴</span>
          <span className="font-semibold">
            Stable: {currentHorses}/{stableSlots} horses
          </span>
          {stableSlots < maxStableSlots && (
            <span className="text-xs th-muted">(max {maxStableSlots})</span>
          )}
        </div>

        {canExpand && (
          <button
            onClick={handleExpand}
            disabled={!canAffordExpansion}
            className={`px-3 py-1.5 rounded text-sm font-bold transition-colors flex items-center gap-1.5 ${
              canAffordExpansion
                ? 'bg-[var(--accent-gold)] text-black hover:bg-[var(--accent-gold)]/80'
                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed'
            }`}
            title={
              canAffordExpansion
                ? `Expand stable to ${stableSlots + 1} slots`
                : `Need ${expansionCost} Reputation to expand`
            }
          >
            <span>Expand</span>
            <span className="flex items-center gap-0.5">
              <span>⭐</span>
              <span>{expansionCost}</span>
            </span>
          </button>
        )}

        {stableSlots === maxStableSlots && (
          <span className="text-sm text-[var(--accent-green)] font-semibold">
            Max Capacity
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden bg-[var(--bg-secondary)]">
        <div
          className="h-full transition-all bg-[var(--accent-gold)]"
          style={{ width: `${fillPercentage}%` }}
        />
      </div>

      {/* Slot indicators */}
      <div className="flex mt-2 gap-1">
        {Array.from({ length: maxStableSlots }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded ${
              i < stableSlots
                ? i < currentHorses
                  ? 'bg-[var(--accent-gold)]'
                  : 'bg-[var(--accent-gold)]/30'
                : 'bg-[var(--bg-tertiary)]'
            }`}
            title={
              i < stableSlots
                ? i < currentHorses
                  ? `Slot ${i + 1}: Occupied`
                  : `Slot ${i + 1}: Empty`
                : `Slot ${i + 1}: Locked`
            }
          />
        ))}
      </div>

      {/* Info text */}
      {currentHorses >= stableSlots && stableSlots < maxStableSlots && (
        <p className="text-xs th-muted mt-2">
          Stable full! Expand with Reputation to hold more horses.
        </p>
      )}
    </div>
  )
}
