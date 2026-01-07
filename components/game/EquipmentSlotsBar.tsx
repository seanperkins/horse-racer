'use client'

import { useGameStore } from '@/lib/store/gameStore'
import type { ClientMessage } from '@/types/messages'

interface EquipmentSlotsBarProps {
  sendMessage: (message: ClientMessage) => void
  inline?: boolean
}

type EquipmentSlot = 'saddle' | 'horseshoes' | 'blinders'

const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  saddle: '🪑 Saddle',
  horseshoes: '🧲 Horseshoes',
  blinders: '👁️ Blinders',
}

const ALL_EQUIPMENT_SLOTS: EquipmentSlot[] = ['saddle', 'horseshoes', 'blinders']

export function EquipmentSlotsBar({ sendMessage, inline = false }: EquipmentSlotsBarProps) {
  const { reputation, unlockedEquipmentSlots } = useGameStore()

  // Cost depends on how many slots already unlocked: 1st costs 1, 2nd costs 2, 3rd costs 3
  const getUnlockCost = () => unlockedEquipmentSlots.length + 1

  const handleUnlockSlot = (slot: EquipmentSlot) => {
    const cost = getUnlockCost()
    if (unlockedEquipmentSlots.includes(slot) || reputation < cost) return
    sendMessage({ type: 'unlock_equipment_slot', slot })
  }

  const lockedSlots = ALL_EQUIPMENT_SLOTS.filter(slot => !unlockedEquipmentSlots.includes(slot))
  const hasAllSlotsUnlocked = lockedSlots.length === 0
  const nextCost = getUnlockCost()

  // Inline version (for header) - show all three slot buttons
  if (inline) {
    return (
      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
        {ALL_EQUIPMENT_SLOTS.map((slot) => {
          const isUnlocked = unlockedEquipmentSlots.includes(slot)
          const canUnlock = reputation >= nextCost && !isUnlocked
          const icon = EQUIPMENT_SLOT_LABELS[slot].split(' ')[0]

          if (isUnlocked) {
            return (
              <span
                key={slot}
                className="px-2 py-1 rounded text-xs font-semibold bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] border border-[var(--accent-purple)]/30"
                title={`${EQUIPMENT_SLOT_LABELS[slot]} - Unlocked`}
              >
                {icon} ✓
              </span>
            )
          }

          return (
            <button
              key={slot}
              onClick={() => handleUnlockSlot(slot)}
              disabled={!canUnlock}
              className={`px-2 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1 ${
                canUnlock
                  ? 'bg-[var(--accent-purple)] text-white hover:bg-[var(--accent-purple)]/80'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed'
              }`}
              title={
                canUnlock
                  ? `Unlock ${EQUIPMENT_SLOT_LABELS[slot]} for ${nextCost} Reputation`
                  : `Need ${nextCost} Reputation to unlock`
              }
            >
              {icon} ⭐{nextCost}
            </button>
          )
        })}
      </div>
    )
  }

  // Full version (standalone panel)
  return (
    <div className="th-panel rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚙️</span>
          <span className="font-semibold">
            Equipment Slots: {unlockedEquipmentSlots.length}/3
          </span>
        </div>
        {hasAllSlotsUnlocked && (
          <span className="text-sm text-[var(--accent-green)] font-semibold">
            All Unlocked
          </span>
        )}
      </div>

      {/* Equipment slot indicators */}
      <div className="flex gap-2 mt-2">
        {ALL_EQUIPMENT_SLOTS.map((slot) => {
          const isUnlocked = unlockedEquipmentSlots.includes(slot)
          const canUnlock = reputation >= nextCost && !isUnlocked

          return (
            <div
              key={slot}
              className={`flex-1 p-2 rounded border text-center text-xs sm:text-sm ${
                isUnlocked
                  ? 'bg-[var(--accent-purple)]/20 border-[var(--accent-purple)] text-[var(--accent-purple)]'
                  : 'bg-[var(--bg-secondary)] border-[var(--border)] th-muted'
              }`}
            >
              <div className="font-semibold">{EQUIPMENT_SLOT_LABELS[slot]}</div>
              {isUnlocked ? (
                <div className="text-xs mt-1">✓ Unlocked</div>
              ) : (
                <button
                  onClick={() => handleUnlockSlot(slot)}
                  disabled={!canUnlock}
                  className={`mt-1 px-2 py-0.5 rounded text-xs font-bold ${
                    canUnlock
                      ? 'bg-[var(--accent-purple)] text-white hover:bg-[var(--accent-purple)]/80'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed'
                  }`}
                >
                  Unlock ⭐{nextCost}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {!hasAllSlotsUnlocked && (
        <p className="text-xs th-muted mt-2">
          Unlocking the next slot costs ⭐{nextCost} Reputation.
        </p>
      )}
    </div>
  )
}
