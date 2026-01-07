'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import { useAudioStore } from '@/lib/store/audioStore'
import { useStrategyImpact } from '@/lib/hooks/useStrategyImpact'
import type { Horse, Jockey, Equipment, RaceStrategy } from '@/types/game'

interface PreparationPhaseProps {
  sendMessage: (message: any) => void
}

const STRATEGY_PRESETS: Array<{
  name: string
  description: string
  strategy: RaceStrategy
}> = [
  {
    name: 'Front-Runner',
    description: 'Lead from the start',
    strategy: { start: 'burst', mid: 'push', finish: 'maintain' },
  },
  {
    name: 'Closer',
    description: 'Save energy for the finish',
    strategy: { start: 'hang_back', mid: 'conserve', finish: 'sprint' },
  },
  {
    name: 'Steady',
    description: 'Balanced approach',
    strategy: { start: 'steady', mid: 'react', finish: 'maintain' },
  },
  {
    name: 'Chaos',
    description: 'High risk, high reward',
    strategy: { start: 'burst', mid: 'push', finish: 'gamble' },
  },
]

export function PreparationPhase({ sendMessage }: PreparationPhaseProps) {
  const { horses, hiredJockey, equipment, currentRound, currentTrack, setPrepSelection, entryStatus } = useGameStore()
  const playSfx = useAudioStore((state) => state.playSfx)

  // Selection state
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null)
  const [selectedJockey, setSelectedJockey] = useState<Jockey | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<{
    saddle?: Equipment
    horseshoes?: Equipment
    blinders?: Equipment
  }>({})
  const [strategy, setStrategy] = useState<RaceStrategy>(STRATEGY_PRESETS[2].strategy)
  const [customStrategy, setCustomStrategy] = useState(false)

  // Auto-select best available on mount - only once
  useEffect(() => {
    if (horses.length > 0 && !selectedHorse) {
      // If only one horse, select it. Otherwise select the one with highest total stats.
      if (horses.length === 1) {
        setSelectedHorse(horses[0])
      } else {
        // Calculate total stats for each horse and select the best
        const horsesWithTotal = horses.map(h => ({
          horse: h,
          totalStats: h.stats.speed + h.stats.stamina + h.stats.grit + h.stats.temper
        }))
        horsesWithTotal.sort((a, b) => b.totalStats - a.totalStats)
        setSelectedHorse(horsesWithTotal[0].horse)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (hiredJockey && !selectedJockey) {
      setSelectedJockey(hiredJockey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-select equipment if there's only one of each type
  useEffect(() => {
    const newEquipment = { ...selectedEquipment }
    let changed = false

    const saddleItems = equipment.filter(e => e.slot === 'saddle')
    const horseshoeItems = equipment.filter(e => e.slot === 'horseshoes')
    const blinderItems = equipment.filter(e => e.slot === 'blinders')

    // Auto-select saddle if exactly one available and none selected
    if (saddleItems.length === 1 && !selectedEquipment.saddle) {
      newEquipment.saddle = saddleItems[0]
      changed = true
    }

    // Auto-select horseshoes if exactly one available and none selected
    if (horseshoeItems.length === 1 && !selectedEquipment.horseshoes) {
      newEquipment.horseshoes = horseshoeItems[0]
      changed = true
    }

    // Auto-select blinders if exactly one available and none selected
    if (blinderItems.length === 1 && !selectedEquipment.blinders) {
      newEquipment.blinders = blinderItems[0]
      changed = true
    }

    if (changed) {
      setSelectedEquipment(newEquipment)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update store whenever selections change
  useEffect(() => {
    setPrepSelection({
      horse: selectedHorse,
      jockey: selectedJockey,
      equipment: selectedEquipment,
      strategy
    })
  }, [selectedHorse, selectedJockey, selectedEquipment, strategy, setPrepSelection])

  const applyPreset = (preset: typeof STRATEGY_PRESETS[0]) => {
    setStrategy(preset.strategy)
    setCustomStrategy(false)
  }

  const saddles = equipment.filter((e) => e.slot === 'saddle')
  const horseshoes = equipment.filter((e) => e.slot === 'horseshoes')
  const blinders = equipment.filter((e) => e.slot === 'blinders')

  // Off-canvas preview panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Hover state for preview comparison
  const [hoveredItem, setHoveredItem] = useState<{
    type: 'horse' | 'equipment'
    data: Horse | Equipment
    slot?: 'saddle' | 'horseshoes' | 'blinders'
  } | null>(null)

  // Determine what to show in preview panel
  const displayHorse = hoveredItem?.type === 'horse'
    ? (hoveredItem.data as Horse)
    : selectedHorse

  const displayEquipment = hoveredItem?.type === 'equipment'
    ? {
        ...selectedEquipment,
        [hoveredItem.slot!]: hoveredItem.data as Equipment,
      }
    : selectedEquipment

  // Always show preview panel - it shows current loadout regardless of selection state
  const showPreview = true

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8 th-bg">
      <div className="max-w-7xl mx-auto">
        {/* Preview toggle button - visible on mobile/tablet when preview is available */}
        {showPreview && (
          <div className="lg:hidden flex justify-end mb-4">
            <button
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className="th-button min-h-11 px-4 py-2.5 rounded-lg font-bold text-sm"
            >
              {isPanelOpen ? '✕' : '📊 Preview'}
            </button>
          </div>
        )}

        {/* Two-column layout: Content on left, Preview on right (desktop only) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 lg:gap-6">
          {/* Left Column - Main Content */}
          <div className="space-y-4 sm:space-y-6">
            {/* Horse Selection */}
            <div className="th-panel rounded-lg p-3 sm:p-4 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Select Horse</h2>
            {horses.length === 0 ? (
              <p className="th-label text-center py-6 sm:py-8 text-sm">No horses available</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {horses.map((horse) => (
                  <div
                    key={horse.id}
                    onClick={() => setSelectedHorse(horse)}
                    onMouseEnter={() => setHoveredItem({ type: 'horse', data: horse })}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`p-3 sm:p-4 rounded border-2 cursor-pointer transition active:scale-[0.98] ${
                      selectedHorse?.id === horse.id
                        ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent-green)]/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 sm:mb-2">
                      <h3 className="font-bold text-sm sm:text-base">{horse.name}</h3>
                      <span className="text-xs sm:text-sm opacity-60">T{horse.tier}</span>
                    </div>
                    <div className="text-xs th-label mb-1 sm:mb-2">{horse.bloodline}</div>
                    <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                      <div>SPD: {horse.stats.speed}/{horse.potential.speed}</div>
                      <div>STA: {horse.stats.stamina}/{horse.potential.stamina}</div>
                      <div>GRT: {horse.stats.grit}/{horse.potential.grit}</div>
                      <div>TMP: {horse.stats.temper}/{horse.potential.temper}</div>
                    </div>
                    {horse.ability && (
                      <div className="mt-2 text-xs bg-[var(--accent-purple)]/20 rounded p-2 hidden sm:block">
                        <strong>{horse.ability.name}:</strong> {horse.ability.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

              {/* Jockey Display (inline within Horse section) */}
              <h3 className="text-base sm:text-lg font-bold mt-4 sm:mt-6 mb-3">Jockey</h3>
              {!hiredJockey ? (
                <p className="th-label text-center py-4 text-sm">No jockey hired</p>
              ) : (
                <div className="p-3 sm:p-4 rounded border-2 border-[var(--accent-green)] bg-[var(--accent-green)]/10">
                  <h4 className="font-bold mb-2 text-sm sm:text-base">{hiredJockey.name}</h4>
                  <div className="grid grid-cols-3 gap-1 sm:gap-2 text-xs sm:text-sm mb-2">
                    <div>SKL: {hiredJockey.stats.skill}</div>
                    <div>TMG: {hiredJockey.stats.timing}</div>
                    <div>WGT: {hiredJockey.stats.weight}</div>
                  </div>
                  {hiredJockey.trait && (
                    <div className="text-xs bg-[var(--accent-blue)]/20 rounded p-2">
                      Trait: {hiredJockey.trait}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Equipment */}
            <div className="th-panel rounded-lg p-3 sm:p-4 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Equipment</h2>

            {/* Saddle */}
            <div className="mb-4 sm:mb-6">
              <h3 className="font-semibold mb-2 text-xs sm:text-sm th-label">Saddle</h3>
              <div className="space-y-1.5 sm:space-y-2">
                <div
                  onClick={() => setSelectedEquipment({ ...selectedEquipment, saddle: undefined })}
                  className={`min-h-[44px] p-2.5 sm:p-3 rounded border cursor-pointer text-xs sm:text-sm flex items-center active:scale-[0.98] transition ${
                    !selectedEquipment.saddle
                      ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                      : 'border-[var(--border)] opacity-60 hover:opacity-100'
                  }`}
                >
                  No Saddle
                </div>
                {saddles.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEquipment({ ...selectedEquipment, saddle: item })}
                    onMouseEnter={() => setHoveredItem({ type: 'equipment', data: item, slot: 'saddle' })}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`min-h-[44px] p-2.5 sm:p-3 rounded border cursor-pointer active:scale-[0.98] transition ${
                      selectedEquipment.saddle?.id === item.id
                        ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent-green)]/50'
                    }`}
                  >
                    <div className="font-semibold text-xs sm:text-sm">{item.name}</div>
                    <div className="text-xs opacity-70 mt-0.5 sm:mt-1">
                      {Object.entries(item.effects)
                        .filter(([_, value]) => value !== undefined && value !== 0 && typeof value === 'number')
                        .map(([key, value]) => `${key}: ${(value as number) > 0 ? '+' : ''}${value}`)
                        .join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Horseshoes */}
            <div className="mb-4 sm:mb-6">
              <h3 className="font-semibold mb-2 text-xs sm:text-sm th-label">Horseshoes</h3>
              <div className="space-y-1.5 sm:space-y-2">
                <div
                  onClick={() => setSelectedEquipment({ ...selectedEquipment, horseshoes: undefined })}
                  className={`min-h-[44px] p-2.5 sm:p-3 rounded border cursor-pointer text-xs sm:text-sm flex items-center active:scale-[0.98] transition ${
                    !selectedEquipment.horseshoes
                      ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                      : 'border-[var(--border)] opacity-60 hover:opacity-100'
                  }`}
                >
                  No Horseshoes
                </div>
                {horseshoes.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEquipment({ ...selectedEquipment, horseshoes: item })}
                    onMouseEnter={() => setHoveredItem({ type: 'equipment', data: item, slot: 'horseshoes' })}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`min-h-[44px] p-2.5 sm:p-3 rounded border cursor-pointer active:scale-[0.98] transition ${
                      selectedEquipment.horseshoes?.id === item.id
                        ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent-green)]/50'
                    }`}
                  >
                    <div className="font-semibold text-xs sm:text-sm">{item.name}</div>
                    <div className="text-xs opacity-70 mt-0.5 sm:mt-1">
                      {Object.entries(item.effects)
                        .filter(([_, value]) => value !== undefined && value !== 0 && typeof value === 'number')
                        .map(([key, value]) => `${key}: ${(value as number) > 0 ? '+' : ''}${value}`)
                        .join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Blinders */}
            <div>
              <h3 className="font-semibold mb-2 text-xs sm:text-sm th-label">Blinders</h3>
              <div className="space-y-1.5 sm:space-y-2">
                <div
                  onClick={() => setSelectedEquipment({ ...selectedEquipment, blinders: undefined })}
                  className={`min-h-[44px] p-2.5 sm:p-3 rounded border cursor-pointer text-xs sm:text-sm flex items-center active:scale-[0.98] transition ${
                    !selectedEquipment.blinders
                      ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                      : 'border-[var(--border)] opacity-60 hover:opacity-100'
                  }`}
                >
                  No Blinders
                </div>
                {blinders.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEquipment({ ...selectedEquipment, blinders: item })}
                    onMouseEnter={() => setHoveredItem({ type: 'equipment', data: item, slot: 'blinders' })}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`min-h-[44px] p-2.5 sm:p-3 rounded border cursor-pointer active:scale-[0.98] transition ${
                      selectedEquipment.blinders?.id === item.id
                        ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent-green)]/50'
                    }`}
                  >
                    <div className="font-semibold text-xs sm:text-sm">{item.name}</div>
                    <div className="text-xs opacity-70 mt-0.5 sm:mt-1">
                      {Object.entries(item.effects)
                        .filter(([_, value]) => value !== undefined && value !== 0 && typeof value === 'number')
                        .map(([key, value]) => `${key}: ${(value as number) > 0 ? '+' : ''}${value}`)
                        .join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>

            {/* Strategy Selection */}
            <div className="th-panel rounded-lg p-3 sm:p-4 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Race Strategy</h2>

            {/* Presets */}
            <div className="mb-4 sm:mb-6">
              <h3 className="font-semibold mb-2 sm:mb-3 text-xs sm:text-sm th-label">Presets</h3>
              <div className="grid grid-cols-2 gap-2">
                {STRATEGY_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className={`min-h-[60px] p-2.5 sm:p-3 rounded border text-left transition active:scale-[0.98] ${
                      !customStrategy &&
                      JSON.stringify(strategy) === JSON.stringify(preset.strategy)
                        ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent-green)]/50'
                    }`}
                  >
                    <div className="font-bold text-xs sm:text-sm">{preset.name}</div>
                    <div className="text-xs opacity-70 mt-0.5 sm:mt-1">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Strategy */}
            <div>
              <h3 className="font-semibold mb-2 sm:mb-3 text-xs sm:text-sm th-label">
                Custom {customStrategy && '(Active)'}
              </h3>

              {/* Start Phase */}
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs opacity-70 mb-1 sm:mb-2">Start (First 20%)</label>
                <select
                  value={strategy.start}
                  onChange={(e) => {
                    setStrategy({ ...strategy, start: e.target.value as any })
                    setCustomStrategy(true)
                  }}
                  className="w-full min-h-[44px] p-2 sm:p-2.5 rounded border border-[var(--border)] bg-[var(--bg-secondary)] text-xs sm:text-sm"
                >
                  <option value="burst">Burst (+30% SPD, +50% drain)</option>
                  <option value="steady">Steady (normal pace)</option>
                  <option value="hang_back">Hang Back (-20% SPD, -30% drain)</option>
                </select>
              </div>

              {/* Mid Phase */}
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs opacity-70 mb-1 sm:mb-2">Mid (Middle 60%)</label>
                <select
                  value={strategy.mid}
                  onChange={(e) => {
                    setStrategy({ ...strategy, mid: e.target.value as any })
                    setCustomStrategy(true)
                  }}
                  className="w-full min-h-[44px] p-2 sm:p-2.5 rounded border border-[var(--border)] bg-[var(--bg-secondary)] text-xs sm:text-sm"
                >
                  <option value="push">Push (+15% SPD, +25% drain)</option>
                  <option value="conserve">Conserve (-10% SPD, -40% drain)</option>
                  <option value="react">React (match leader)</option>
                </select>
              </div>

              {/* Finish Phase */}
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs opacity-70 mb-1 sm:mb-2">Finish (Final 20%)</label>
                <select
                  value={strategy.finish}
                  onChange={(e) => {
                    setStrategy({ ...strategy, finish: e.target.value as any })
                    setCustomStrategy(true)
                  }}
                  className="w-full min-h-[44px] p-2 sm:p-2.5 rounded border border-[var(--border)] bg-[var(--bg-secondary)] text-xs sm:text-sm"
                >
                  <option value="sprint">Sprint (burn all stamina)</option>
                  <option value="maintain">Maintain (steady finish)</option>
                  <option value="gamble">Gamble (high variance)</option>
                </select>
              </div>
            </div>
            </div>
          </div>

          {/* Right Column - Preview Panel (desktop: always visible if there's content, mobile: off-canvas) */}
          {showPreview && (
            <>
              {/* Backdrop - mobile only */}
              {isPanelOpen && (
                <div
                  className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
                  onClick={() => setIsPanelOpen(false)}
                />
              )}

              {/* Off-canvas panel */}
              <div className={`
                fixed lg:sticky
                top-0 lg:top-4
                right-0 lg:right-auto
                lg:self-start
                h-full lg:h-auto
                w-[85vw] max-w-md lg:w-auto
                z-50 lg:z-auto
                transition-transform duration-300 ease-in-out lg:transition-none
                ${isPanelOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
              `}>
                <div className="h-full lg:h-auto overflow-y-auto bg-[var(--bg-primary)] lg:bg-transparent p-4 lg:p-0">
                  {/* Close button - mobile only */}
                  <button
                    onClick={() => setIsPanelOpen(false)}
                    className="lg:hidden absolute top-4 right-4 z-10 p-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    aria-label="Close preview"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <PreparationComparisonPanel
                    selectedHorse={selectedHorse}
                    selectedJockey={selectedJockey}
                    selectedEquipment={selectedEquipment}
                    hoveredItem={hoveredItem}
                    displayHorse={displayHorse}
                    displayEquipment={displayEquipment}
                    strategy={strategy}
                    currentTrack={currentTrack}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Preparation Comparison Panel Component
function PreparationComparisonPanel({
  selectedHorse,
  selectedJockey,
  selectedEquipment,
  hoveredItem,
  displayHorse,
  displayEquipment,
  strategy,
  currentTrack,
}: {
  selectedHorse: Horse | null
  selectedJockey: Jockey | null
  selectedEquipment: { saddle?: Equipment; horseshoes?: Equipment; blinders?: Equipment }
  hoveredItem: { type: string; data: any; slot?: string } | null
  displayHorse: Horse | null
  displayEquipment: { saddle?: Equipment; horseshoes?: Equipment; blinders?: Equipment }
  strategy: RaceStrategy
  currentTrack: any
}) {
  // Calculate current selected stats
  const currentStats = useStrategyImpact(selectedHorse, selectedJockey, selectedEquipment, strategy)

  // Calculate hovered/display stats
  const hoveredStats = useStrategyImpact(displayHorse, selectedJockey, displayEquipment, strategy)

  // Helper to format delta
  const formatDelta = (current: number | undefined, hovered: number | undefined) => {
    if (current === undefined || hovered === undefined || !hoveredItem) return null
    const delta = hovered - current
    if (Math.abs(delta) < 0.01) return null
    return delta
  }

  // Stat descriptions for tooltips
  const statDescriptions: Record<string, string> = {
    'Speed': 'Base movement speed - higher is better',
    'Stamina': 'Energy pool for maintaining pace - higher is better',
    'Grit': 'Ability to push through fatigue - higher is better',
    'Temper': 'Consistency and control - higher is more stable',
    'Effective Speed': 'Final speed after all modifiers',
    'Stamina Pool': 'Total available energy for the race',
    'Burn Rate': 'Energy consumed per tick - lower is better',
    'Efficiency': 'How effectively stamina is converted to speed - higher is better',
  }

  const DeltaDisplay = ({ delta, inverse = false }: { delta: number | null; inverse?: boolean }) => {
    if (delta === null) return <span className="w-16 text-right text-xs th-label">-</span>
    const isPositive = inverse ? delta < 0 : delta > 0
    return (
      <span className={`w-16 text-right text-xs font-semibold ${isPositive ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
        {delta > 0 ? '+' : ''}{delta.toFixed(2)}
      </span>
    )
  }

  const StatRow = ({
    label,
    value,
    delta,
    inverse = false,
  }: {
    label: string
    value: string | number
    delta: number | null
    inverse?: boolean
  }) => {
    return (
      <div className="flex justify-between items-center text-sm">
        <span className="th-label">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-bold tabular-nums">{value}</span>
          <DeltaDisplay delta={delta} inverse={inverse} />
        </div>
      </div>
    )
  }

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

  return (
    <div className="th-panel rounded-lg p-4 shadow-2xl max-w-md">
      <h3 className="font-bold mb-3 text-sm">
        {hoveredItem ? '👀 Preview' : '📊 Current Loadout'}
      </h3>

      {/* Compact loadout summary */}
      <div className="mb-4 space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-14 text-xs th-muted">Horse:</span>
          <span className={displayHorse ? 'th-label' : 'th-muted italic'}>
            {displayHorse ? `${displayHorse.name} (T${displayHorse.tier})` : '—'}
          </span>
          {hoveredItem?.type === 'horse' && selectedHorse && (
            <span className="text-xs text-yellow-400">← preview</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 text-xs th-muted">Jockey:</span>
          <span className={selectedJockey ? 'th-label' : 'th-muted italic'}>
            {selectedJockey?.name || '—'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 text-xs th-muted">Saddle:</span>
          <span className={displayEquipment.saddle ? 'th-label' : 'th-muted'}>
            {displayEquipment.saddle?.name || '—'}
          </span>
          {hoveredItem?.type === 'equipment' && hoveredItem.slot === 'saddle' && selectedEquipment.saddle && (
            <span className="text-xs text-yellow-400">← preview</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 text-xs th-muted">Shoes:</span>
          <span className={displayEquipment.horseshoes ? 'th-label' : 'th-muted'}>
            {displayEquipment.horseshoes?.name || '—'}
          </span>
          {hoveredItem?.type === 'equipment' && hoveredItem.slot === 'horseshoes' && selectedEquipment.horseshoes && (
            <span className="text-xs text-yellow-400">← preview</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 text-xs th-muted">Blinders:</span>
          <span className={displayEquipment.blinders ? 'th-label' : 'th-muted'}>
            {displayEquipment.blinders?.name || '—'}
          </span>
          {hoveredItem?.type === 'equipment' && hoveredItem.slot === 'blinders' && selectedEquipment.blinders && (
            <span className="text-xs text-yellow-400">← preview</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 text-xs th-muted">Strategy:</span>
          <span className="th-label">{getStrategyName()}</span>
        </div>
        {/* Terrain */}
        {currentTrack && (
          <div className="flex items-center gap-2">
            <span className="w-14 text-xs th-muted">Terrain:</span>
            <span className="th-label capitalize">{currentTrack.surface?.replace('_', ' ')}</span>
            {hoveredStats.terrainAlignment && (
              <span className={`text-xs font-semibold ${
                hoveredStats.terrainAlignment.modifier < 1.0 ? 'text-[var(--accent-red)]' :
                hoveredStats.terrainAlignment.modifier > 1.0 ? 'text-[var(--accent-green)]' : 'th-muted'
              }`}>
                ({hoveredStats.terrainAlignment.modifier >= 1.0 ? '+' : ''}
                {((hoveredStats.terrainAlignment.modifier - 1) * 100).toFixed(0)}%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Base Stats */}
      {(currentStats.speedBreakdown || hoveredStats.speedBreakdown) && (
        <div className="mb-4">
          <h4 className="text-xs th-label mb-2 uppercase tracking-wide">Base Stats</h4>
          <div className="space-y-1">
            <StatRow
              label="Speed"
              value={hoveredItem ? hoveredStats.speedBreakdown?.final || 0 : currentStats.speedBreakdown?.final || 0}
              delta={formatDelta(currentStats.speedBreakdown?.final, hoveredStats.speedBreakdown?.final)}
            />
            <StatRow
              label="Stamina"
              value={hoveredItem ? hoveredStats.staminaBreakdown?.final || 0 : currentStats.staminaBreakdown?.final || 0}
              delta={formatDelta(currentStats.staminaBreakdown?.final, hoveredStats.staminaBreakdown?.final)}
            />
            <StatRow
              label="Grit"
              value={hoveredItem ? hoveredStats.gritBreakdown?.final || 0 : currentStats.gritBreakdown?.final || 0}
              delta={formatDelta(currentStats.gritBreakdown?.final, hoveredStats.gritBreakdown?.final)}
            />
            <StatRow
              label="Temper"
              value={hoveredItem ? hoveredStats.temperBreakdown?.final || 0 : currentStats.temperBreakdown?.final || 0}
              delta={formatDelta(currentStats.temperBreakdown?.final, hoveredStats.temperBreakdown?.final)}
            />
          </div>
        </div>
      )}

      {/* Derived Stats */}
      {(currentStats.derivedStats || hoveredStats.derivedStats) && (
        <div className="mb-4">
          <h4 className="text-xs th-label mb-2 uppercase tracking-wide">Derived Stats</h4>
          <div className="space-y-1">
            <StatRow
              label="Effective Speed"
              value={hoveredItem && hoveredStats.derivedStats ? hoveredStats.derivedStats.baseSpeed.toFixed(1) : currentStats.derivedStats?.baseSpeed.toFixed(1) || '0'}
              delta={formatDelta(currentStats.derivedStats?.baseSpeed, hoveredStats.derivedStats?.baseSpeed)}
            />
            <StatRow
              label="Stamina Pool"
              value={hoveredItem && hoveredStats.derivedStats ? hoveredStats.derivedStats.staminaPool.toFixed(1) : currentStats.derivedStats?.staminaPool.toFixed(1) || '0'}
              delta={formatDelta(currentStats.derivedStats?.staminaPool, hoveredStats.derivedStats?.staminaPool)}
            />
            <StatRow
              label="Burn Rate"
              value={hoveredItem && hoveredStats.derivedStats ? `${hoveredStats.derivedStats.burnRate.toFixed(2)}/tk` : `${currentStats.derivedStats?.burnRate.toFixed(2) || '0'}/tk`}
              delta={formatDelta(currentStats.derivedStats?.burnRate, hoveredStats.derivedStats?.burnRate)}
              inverse={true}
            />
            <StatRow
              label="Efficiency"
              value={hoveredItem && hoveredStats.derivedStats ? `${(hoveredStats.derivedStats.efficiency * 100).toFixed(0)}%` : `${((currentStats.derivedStats?.efficiency || 0) * 100).toFixed(0)}%`}
              delta={formatDelta(currentStats.derivedStats ? currentStats.derivedStats.efficiency * 100 : undefined, hoveredStats.derivedStats ? hoveredStats.derivedStats.efficiency * 100 : undefined)}
            />
            <div className="flex justify-between items-center text-sm">
              <span className="th-label">Consistency</span>
              <span
                className={`font-medium ${
                  (hoveredItem ? hoveredStats : currentStats).derivedStats?.consistency.isStable
                    ? 'text-[var(--accent-green)]'
                    : 'text-[var(--accent-orange)]'
                }`}
              >
                {(hoveredItem ? hoveredStats : currentStats).derivedStats?.consistency.isStable ? 'Stable' : 'Volatile'} (±{((hoveredItem ? hoveredStats : currentStats).derivedStats?.consistency.variance || 0) * 100 | 0}%)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
