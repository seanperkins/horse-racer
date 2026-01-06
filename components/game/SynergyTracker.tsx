'use client'

import { useState } from 'react'
import { useSynergyTracker } from '@/lib/hooks/useSynergyTracker'
import type { Bloodline } from '@/types/game'

const BLOODLINE_COLORS: Record<Bloodline, string> = {
  'Northern Storm': 'text-blue-400',
  'Desert Wind': 'text-yellow-400',
  'Iron Heart': 'text-gray-300',
  'Wild Card': 'text-purple-400',
  'Mudblood': 'text-amber-700',
  'Royal Line': 'text-amber-400',
}

const BLOODLINE_ICONS: Record<Bloodline, string> = {
  'Northern Storm': '❄️',
  'Desert Wind': '🌵',
  'Iron Heart': '⚙️',
  'Wild Card': '🃏',
  'Mudblood': '💧',
  'Royal Line': '👑',
}

interface SynergyTrackerProps {
  collapsed?: boolean
  showStableInfo?: boolean
}

export function SynergyTracker({
  collapsed: initialCollapsed = true,
  showStableInfo = true,
}: SynergyTrackerProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const synergy = useSynergyTracker()

  if (synergy.bloodlines.length === 0) {
    return (
      <div className="th-panel rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">Bloodline Synergies</h3>
          {showStableInfo && (
            <div className="text-xs th-label">
              Stable: {synergy.stableSize}/{synergy.stableSlots}
            </div>
          )}
        </div>
        <div className="text-xs th-label mt-2">
          No horses in stable. Buy horses to unlock synergy bonuses!
        </div>
      </div>
    )
  }

  return (
    <div className="th-panel rounded-lg p-4">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm">Bloodline Synergies</h3>
          {synergy.hasAnySynergy && (
            <span className="text-xs text-[var(--accent-green)]">● Active</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showStableInfo && (
            <div className="text-xs th-label">
              Stable: {synergy.stableSize}/{synergy.stableSlots}
            </div>
          )}
          <span className="text-xs th-label">{isCollapsed ? '▼' : '▲'}</span>
        </div>
      </button>

      {/* Collapsed preview - show active synergies only */}
      {isCollapsed && synergy.hasAnySynergy && (
        <div className="mt-2 flex flex-wrap gap-2">
          {synergy.bloodlines
            .filter((b) => b.bonuses.some((bonus) => bonus.active))
            .map((bloodline) => (
              <div
                key={bloodline.name}
                className={`text-xs px-2 py-1 rounded bg-[var(--bg-secondary)] ${BLOODLINE_COLORS[bloodline.name]}`}
              >
                {BLOODLINE_ICONS[bloodline.name]} {bloodline.name} ({bloodline.count})
              </div>
            ))}
        </div>
      )}

      {/* Expanded view */}
      {!isCollapsed && (
        <div className="mt-3 space-y-3">
          {synergy.bloodlines.map((bloodline) => (
            <div
              key={bloodline.name}
              className="border border-[var(--outline)] rounded p-2"
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-medium text-sm ${BLOODLINE_COLORS[bloodline.name]}`}>
                  {BLOODLINE_ICONS[bloodline.name]} {bloodline.name}
                </span>
                <span className="text-xs th-label">
                  {bloodline.count} horse{bloodline.count !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Progress indicators */}
              <div className="flex gap-1 mb-2">
                {[1, 2, 3].map((slot) => (
                  <div
                    key={slot}
                    className={`w-4 h-4 rounded-full border ${
                      slot <= bloodline.count
                        ? `bg-[var(--accent-green)] border-[var(--accent-green)]`
                        : 'border-[var(--outline)] bg-transparent'
                    }`}
                  >
                    {slot <= bloodline.count && (
                      <span className="flex items-center justify-center text-[10px]">●</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Bonuses */}
              <div className="space-y-1">
                {bloodline.bonuses.map((bonus, idx) => (
                  <div
                    key={idx}
                    className={`text-xs flex items-start gap-1 ${
                      bonus.active
                        ? 'text-[var(--accent-green)]'
                        : 'th-label opacity-60'
                    }`}
                  >
                    <span>{bonus.active ? '✓' : '○'}</span>
                    <span>
                      ({bonus.threshold}+) {bonus.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Next breakpoint hint */}
          {synergy.nextBreakpoint && (
            <div className="text-xs p-2 bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/30 rounded">
              <div className="font-medium text-[var(--accent-purple)] mb-1">
                Next Synergy:
              </div>
              <div className="th-label">
                Get {synergy.nextBreakpoint.needed - synergy.nextBreakpoint.current} more{' '}
                <span className={BLOODLINE_COLORS[synergy.nextBreakpoint.bloodline]}>
                  {synergy.nextBreakpoint.bloodline}
                </span>{' '}
                horse{synergy.nextBreakpoint.needed - synergy.nextBreakpoint.current !== 1 ? 's' : ''}{' '}
                for: {synergy.nextBreakpoint.description}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
