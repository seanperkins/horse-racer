'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import type { ClientMessage } from '@/types/messages'
import type { Horse, Jockey, Equipment, RaceStrategy } from '@/types/game'

interface PreparationPhaseProps {
  sendMessage: (message: ClientMessage) => void
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
  const { horses, hiredJockey, equipment, currentRound, currentTrack } = useGameStore()

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
      setSelectedHorse(horses[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (hiredJockey && !selectedJockey) {
      setSelectedJockey(hiredJockey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = () => {
    console.log('Submit clicked - horse:', selectedHorse?.name, 'jockey:', selectedJockey?.name)

    if (!selectedHorse) {
      alert('Please select a horse!')
      return
    }
    if (!selectedJockey) {
      alert('Please select a jockey!')
      return
    }

    console.log('Sending setup_race_entry message')
    sendMessage({
      type: 'setup_race_entry',
      horseId: selectedHorse.id,
      jockeyId: selectedJockey.id,
      equipment: {
        saddle: selectedEquipment.saddle?.id,
        horseshoes: selectedEquipment.horseshoes?.id,
        blinders: selectedEquipment.blinders?.id,
      },
      strategy,
    })
  }

  const applyPreset = (preset: typeof STRATEGY_PRESETS[0]) => {
    setStrategy(preset.strategy)
    setCustomStrategy(false)
  }

  const saddles = equipment.filter((e) => e.slot === 'saddle')
  const horseshoes = equipment.filter((e) => e.slot === 'horseshoes')
  const blinders = equipment.filter((e) => e.slot === 'blinders')

  return (
    <div className="min-h-screen p-4 md:p-8 th-bg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-end mb-6">
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-[var(--accent-green)] text-white rounded-lg font-bold hover:bg-[var(--accent-green)]/80 transition"
          >
            Confirm Entry
          </button>
        </div>

        {/* Track Info */}
        {currentTrack && (
          <div className="th-panel rounded-lg p-4 mb-6">
            <h2 className="text-xl font-bold mb-2">{currentTrack.name}</h2>
            <div className="flex flex-wrap gap-4 text-sm th-label">
              <span>Category: {currentTrack.category}</span>
              <span>Surface: {currentTrack.surface.replace('_', ' ')}</span>
              <span>Distance: {currentTrack.distance} furlongs</span>
            </div>
            {currentTrack.description && (
              <p className="mt-2 text-sm opacity-80">{currentTrack.description}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Horse Selection */}
          <div className="th-panel rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Select Horse</h2>
            {horses.length === 0 ? (
              <p className="th-label text-center py-8">No horses available</p>
            ) : (
              <div className="space-y-3">
                {horses.map((horse) => (
                  <div
                    key={horse.id}
                    onClick={() => setSelectedHorse(horse)}
                    className={`p-4 rounded border-2 cursor-pointer transition ${
                      selectedHorse?.id === horse.id
                        ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent-green)]/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold">{horse.name}</h3>
                      <span className="text-sm opacity-60">T{horse.tier}</span>
                    </div>
                    <div className="text-xs th-label mb-2">{horse.bloodline}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>SPD: {horse.stats.speed}/{horse.potential.speed}</div>
                      <div>STA: {horse.stats.stamina}/{horse.potential.stamina}</div>
                      <div>GRT: {horse.stats.grit}/{horse.potential.grit}</div>
                      <div>TMP: {horse.stats.temper}/{horse.potential.temper}</div>
                    </div>
                    {horse.ability && (
                      <div className="mt-2 text-xs bg-[var(--accent-purple)]/20 rounded p-2">
                        <strong>{horse.ability.name}:</strong> {horse.ability.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Jockey Selection */}
            <h2 className="text-xl font-bold mt-6 mb-4">Jockey</h2>
            {!hiredJockey ? (
              <p className="th-label text-center py-4">No jockey hired</p>
            ) : (
              <div className="p-4 rounded border-2 border-[var(--accent-green)] bg-[var(--accent-green)]/10">
                <h3 className="font-bold mb-2">{hiredJockey.name}</h3>
                <div className="grid grid-cols-3 gap-2 text-sm mb-2">
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

          {/* Middle Column - Equipment */}
          <div className="th-panel rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Equipment</h2>

            {/* Saddle */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2 text-sm th-label">Saddle</h3>
              <div className="space-y-2">
                <div
                  onClick={() => setSelectedEquipment({ ...selectedEquipment, saddle: undefined })}
                  className={`p-3 rounded border cursor-pointer text-sm ${
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
                    className={`p-3 rounded border cursor-pointer ${
                      selectedEquipment.saddle?.id === item.id
                        ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent-green)]/50'
                    }`}
                  >
                    <div className="font-semibold text-sm">{item.name}</div>
                    <div className="text-xs opacity-70 mt-1">
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
            <div className="mb-6">
              <h3 className="font-semibold mb-2 text-sm th-label">Horseshoes</h3>
              <div className="space-y-2">
                <div
                  onClick={() => setSelectedEquipment({ ...selectedEquipment, horseshoes: undefined })}
                  className={`p-3 rounded border cursor-pointer text-sm ${
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
                    className={`p-3 rounded border cursor-pointer ${
                      selectedEquipment.horseshoes?.id === item.id
                        ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent-green)]/50'
                    }`}
                  >
                    <div className="font-semibold text-sm">{item.name}</div>
                    <div className="text-xs opacity-70 mt-1">
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
              <h3 className="font-semibold mb-2 text-sm th-label">Blinders</h3>
              <div className="space-y-2">
                <div
                  onClick={() => setSelectedEquipment({ ...selectedEquipment, blinders: undefined })}
                  className={`p-3 rounded border cursor-pointer text-sm ${
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
                    className={`p-3 rounded border cursor-pointer ${
                      selectedEquipment.blinders?.id === item.id
                        ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent-green)]/50'
                    }`}
                  >
                    <div className="font-semibold text-sm">{item.name}</div>
                    <div className="text-xs opacity-70 mt-1">
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

          {/* Right Column - Strategy */}
          <div className="th-panel rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Race Strategy</h2>

            {/* Presets */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-sm th-label">Presets</h3>
              <div className="grid grid-cols-2 gap-2">
                {STRATEGY_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className={`p-3 rounded border text-sm transition ${
                      !customStrategy &&
                      JSON.stringify(strategy) === JSON.stringify(preset.strategy)
                        ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent-green)]/50'
                    }`}
                  >
                    <div className="font-bold">{preset.name}</div>
                    <div className="text-xs opacity-70 mt-1">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Strategy */}
            <div>
              <h3 className="font-semibold mb-3 text-sm th-label">
                Custom Strategy {customStrategy && '(Active)'}
              </h3>

              {/* Start Phase */}
              <div className="mb-4">
                <label className="block text-xs opacity-70 mb-2">Start (First 20%)</label>
                <select
                  value={strategy.start}
                  onChange={(e) => {
                    setStrategy({ ...strategy, start: e.target.value as any })
                    setCustomStrategy(true)
                  }}
                  className="w-full p-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)] text-sm"
                >
                  <option value="burst">Burst (+30% SPD, +50% drain)</option>
                  <option value="steady">Steady (normal pace)</option>
                  <option value="hang_back">Hang Back (-20% SPD, -30% drain)</option>
                </select>
              </div>

              {/* Mid Phase */}
              <div className="mb-4">
                <label className="block text-xs opacity-70 mb-2">Mid (Middle 60%)</label>
                <select
                  value={strategy.mid}
                  onChange={(e) => {
                    setStrategy({ ...strategy, mid: e.target.value as any })
                    setCustomStrategy(true)
                  }}
                  className="w-full p-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)] text-sm"
                >
                  <option value="push">Push (+15% SPD, +25% drain)</option>
                  <option value="conserve">Conserve (-10% SPD, -40% drain)</option>
                  <option value="react">React (match leader)</option>
                </select>
              </div>

              {/* Finish Phase */}
              <div className="mb-4">
                <label className="block text-xs opacity-70 mb-2">Finish (Final 20%)</label>
                <select
                  value={strategy.finish}
                  onChange={(e) => {
                    setStrategy({ ...strategy, finish: e.target.value as any })
                    setCustomStrategy(true)
                  }}
                  className="w-full p-2 rounded border border-[var(--border)] bg-[var(--bg-secondary)] text-sm"
                >
                  <option value="sprint">Sprint (burn all stamina)</option>
                  <option value="maintain">Maintain (steady finish)</option>
                  <option value="gamble">Gamble (high variance)</option>
                </select>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-[var(--bg-secondary)] rounded">
              <h4 className="font-semibold mb-2 text-sm">Current Strategy</h4>
              <div className="text-xs space-y-1 opacity-80">
                <div>Start: {strategy.start}</div>
                <div>Mid: {strategy.mid}</div>
                <div>Finish: {strategy.finish}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button (bottom) */}
        <div className="mt-6 text-center">
          <button
            onClick={handleSubmit}
            disabled={!selectedHorse || !selectedJockey}
            className="px-8 py-4 bg-[var(--accent-green)] text-white rounded-lg font-bold text-lg hover:bg-[var(--accent-green)]/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Race Entry
          </button>
          {(!selectedHorse || !selectedJockey) && (
            <p className="mt-2 text-sm text-[var(--accent-orange)]">
              Select a horse and jockey to continue
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
