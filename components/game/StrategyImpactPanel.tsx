'use client'

import { useState } from 'react'
import { useStrategyImpact, type StatBreakdown } from '@/lib/hooks/useStrategyImpact'
import type { Horse, Jockey, Equipment, RaceStrategy } from '@/types/game'

interface StrategyImpactPanelProps {
  horse: Horse | null
  jockey: Jockey | null
  equipment: {
    saddle?: Equipment
    horseshoes?: Equipment
    blinders?: Equipment
  }
  strategy: RaceStrategy | null
  collapsed?: boolean
}

function StatRow({ breakdown }: { breakdown: StatBreakdown }) {
  const hasModifiers = breakdown.modifiers.length > 0
  const totalModifier = breakdown.modifiers.reduce((sum, m) => sum + m.value, 0)

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{breakdown.label}</span>
        {hasModifiers && (
          <span className="text-xs th-label">
            ({breakdown.base}
            {breakdown.modifiers.map((m, i) => (
              <span
                key={i}
                className={m.value > 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}
              >
                {m.value > 0 ? '+' : ''}{m.value}
              </span>
            ))}
            )
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`font-bold ${
            totalModifier > 0
              ? 'text-[var(--accent-green)]'
              : totalModifier < 0
                ? 'text-[var(--accent-red)]'
                : ''
          }`}
        >
          {breakdown.final}
        </span>
        {/* Visual bar */}
        <div className="w-16 h-2 bg-[var(--bg-secondary)] rounded overflow-hidden">
          <div
            className="h-full bg-[var(--accent-primary)]"
            style={{ width: `${Math.min(breakdown.final * 10, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function StrategyImpactPanel({
  horse,
  jockey,
  equipment,
  strategy,
  collapsed: initialCollapsed = false,
}: StrategyImpactPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const impact = useStrategyImpact(horse, jockey, equipment, strategy)

  // Get strategy preset name
  const getStrategyName = () => {
    const presets = [
      { name: 'Front-Runner', strategy: { start: 'burst', mid: 'push', finish: 'maintain' } },
      { name: 'Closer', strategy: { start: 'hang_back', mid: 'conserve', finish: 'sprint' } },
      { name: 'Steady', strategy: { start: 'steady', mid: 'react', finish: 'maintain' } },
      { name: 'Chaos', strategy: { start: 'burst', mid: 'push', finish: 'gamble' } },
    ]
    const match = presets.find(p => JSON.stringify(p.strategy) === JSON.stringify(strategy))
    return match?.name || 'Custom'
  }

  if (!horse || !jockey) {
    return (
      <div className="th-panel rounded-lg p-4">
        <h3 className="font-bold text-sm mb-2">Strategy Impact</h3>
        <div className="text-xs th-label">
          Select a horse and jockey to see stat breakdown
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
        <h3 className="font-bold text-sm">Strategy Impact</h3>
        <span className="text-xs th-label">{isCollapsed ? '▼' : '▲'}</span>
      </button>

      {/* Collapsed preview */}
      {isCollapsed && impact.derivedStats && (
        <div className="mt-2 flex gap-4 text-xs">
          <span>Speed: {impact.derivedStats.baseSpeed.toFixed(1)}</span>
          <span>Stamina: {impact.derivedStats.staminaPool.toFixed(1)}</span>
          <span
            className={
              impact.terrainAlignment.modifier < 1.0
                ? 'text-[var(--accent-red)]'
                : impact.terrainAlignment.modifier > 1.0
                  ? 'text-[var(--accent-green)]'
                  : ''
            }
          >
            Terrain: {(impact.terrainAlignment.modifier * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {/* Expanded view */}
      {!isCollapsed && (
        <div className="mt-3 space-y-4">
          {/* Compact Loadout Summary */}
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-14 text-xs th-muted">Horse:</span>
              <span className="th-label">{horse.name} (T{horse.tier})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 text-xs th-muted">Jockey:</span>
              <span className="th-label">{jockey.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 text-xs th-muted">Saddle:</span>
              <span className={equipment.saddle ? 'th-label' : 'th-muted'}>
                {equipment.saddle?.name || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 text-xs th-muted">Shoes:</span>
              <span className={equipment.horseshoes ? 'th-label' : 'th-muted'}>
                {equipment.horseshoes?.name || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 text-xs th-muted">Blinders:</span>
              <span className={equipment.blinders ? 'th-label' : 'th-muted'}>
                {equipment.blinders?.name || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 text-xs th-muted">Strategy:</span>
              <span className="th-label">{getStrategyName()}</span>
            </div>
          </div>
          {/* Base Stats */}
          <div>
            <h4 className="text-xs th-label mb-2 uppercase tracking-wide">Base Stats</h4>
            <div className="space-y-1">
              {impact.speedBreakdown && <StatRow breakdown={impact.speedBreakdown} />}
              {impact.staminaBreakdown && <StatRow breakdown={impact.staminaBreakdown} />}
              {impact.gritBreakdown && <StatRow breakdown={impact.gritBreakdown} />}
              {impact.temperBreakdown && <StatRow breakdown={impact.temperBreakdown} />}
            </div>
          </div>

          {/* Derived Stats */}
          {impact.derivedStats && (
            <div>
              <h4 className="text-xs th-label mb-2 uppercase tracking-wide">Derived Stats</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="th-label">Effective Speed</span>
                  <span className="font-medium">{impact.derivedStats.baseSpeed.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="th-label">Stamina Pool</span>
                  <span className="font-medium">{impact.derivedStats.staminaPool.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="th-label">Burn Rate</span>
                  <span className="font-medium">{impact.derivedStats.burnRate.toFixed(2)}/tick</span>
                </div>
                <div className="flex justify-between">
                  <span className="th-label">Efficiency</span>
                  <span className="font-medium">{(impact.derivedStats.efficiency * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="th-label">Consistency</span>
                  <span
                    className={`font-medium ${
                      impact.derivedStats.consistency.isStable
                        ? 'text-[var(--accent-green)]'
                        : 'text-[var(--accent-orange)]'
                    }`}
                  >
                    {impact.derivedStats.consistency.isStable ? 'Stable' : 'Volatile'} (±{(impact.derivedStats.consistency.variance * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Terrain Alignment */}
          <div>
            <h4 className="text-xs th-label mb-2 uppercase tracking-wide">Terrain</h4>
            <div
              className={`text-sm p-2 rounded border ${
                impact.terrainAlignment.modifier < 1.0
                  ? 'border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10'
                  : impact.terrainAlignment.modifier > 1.0
                    ? 'border-[var(--accent-green)]/30 bg-[var(--accent-green)]/10'
                    : 'border-[var(--outline)] bg-[var(--bg-secondary)]'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="capitalize">
                  {impact.terrainAlignment.surface?.replace('_', ' ') || 'Unknown'}
                </span>
                <span
                  className={`font-bold ${
                    impact.terrainAlignment.modifier < 1.0
                      ? 'text-[var(--accent-red)]'
                      : impact.terrainAlignment.modifier > 1.0
                        ? 'text-[var(--accent-green)]'
                        : ''
                  }`}
                >
                  {impact.terrainAlignment.modifier >= 1.0 ? '+' : ''}
                  {((impact.terrainAlignment.modifier - 1) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="text-xs th-label mt-1">{impact.terrainAlignment.description}</div>
            </div>
          </div>

          {/* Strategy Phases */}
          {strategy && impact.strategyImpact.length > 0 && (
            <div>
              <h4 className="text-xs th-label mb-2 uppercase tracking-wide">Strategy Phases</h4>
              <div className="space-y-2">
                {impact.strategyImpact.map((phase) => (
                  <div
                    key={phase.phase}
                    className="text-xs p-2 border border-[var(--outline)] rounded"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium capitalize">{phase.phase}</span>
                      <span className="capitalize text-[var(--accent-primary)]">
                        {phase.strategy.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex gap-4 th-label">
                      <span>Speed: {phase.speedMod}</span>
                      <span>Stamina: {phase.staminaMod}</span>
                    </div>
                    <div className="th-label mt-1">{phase.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bloodline Bonuses */}
          {(impact.bloodlineBonuses.speed > 0 ||
            impact.bloodlineBonuses.stamina > 0 ||
            impact.bloodlineBonuses.grit > 0 ||
            impact.bloodlineBonuses.temper > 0 ||
            impact.bloodlineBonuses.special.length > 0) && (
            <div>
              <h4 className="text-xs th-label mb-2 uppercase tracking-wide">Bloodline Bonuses</h4>
              <div className="p-2 border border-[var(--accent-purple)]/30 bg-[var(--accent-purple)]/10 rounded">
                <div className="flex flex-wrap gap-3 text-xs">
                  {impact.bloodlineBonuses.speed > 0 && (
                    <span className="text-[var(--accent-green)]">
                      +{impact.bloodlineBonuses.speed} Speed
                    </span>
                  )}
                  {impact.bloodlineBonuses.stamina > 0 && (
                    <span className="text-[var(--accent-green)]">
                      +{impact.bloodlineBonuses.stamina} Stamina
                    </span>
                  )}
                  {impact.bloodlineBonuses.grit > 0 && (
                    <span className="text-[var(--accent-green)]">
                      +{impact.bloodlineBonuses.grit} Grit
                    </span>
                  )}
                  {impact.bloodlineBonuses.temper > 0 && (
                    <span className="text-[var(--accent-green)]">
                      +{impact.bloodlineBonuses.temper} Temper
                    </span>
                  )}
                </div>
                {impact.bloodlineBonuses.special.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {impact.bloodlineBonuses.special.map((bonus, i) => (
                      <div key={i} className="text-xs text-[var(--accent-purple)]">
                        ★ {bonus}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
