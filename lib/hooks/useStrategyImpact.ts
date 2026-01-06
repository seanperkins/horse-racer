import { useMemo } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import { calculateDerivedStats, calculateBloodlineBonuses } from '@/game/stats'
import type { Horse, Jockey, Equipment, RaceStrategy, DerivedStats, SurfaceCondition } from '@/types/game'

export interface StrategyPhaseImpact {
  phase: 'start' | 'mid' | 'finish'
  strategy: string
  speedMod: string
  staminaMod: string
  description: string
}

export interface StatBreakdown {
  label: string
  base: number
  modifiers: { source: string; value: number }[]
  final: number
}

export interface StrategyImpactResult {
  // Selected race entry info
  horse: Horse | null
  jockey: Jockey | null
  equipment: {
    saddle?: Equipment
    horseshoes?: Equipment
    blinders?: Equipment
  }
  strategy: RaceStrategy | null

  // Derived stats (calculated)
  derivedStats: DerivedStats | null

  // Stat breakdowns
  speedBreakdown: StatBreakdown | null
  staminaBreakdown: StatBreakdown | null
  gritBreakdown: StatBreakdown | null
  temperBreakdown: StatBreakdown | null

  // Strategy impact by phase
  strategyImpact: StrategyPhaseImpact[]

  // Terrain alignment
  terrainAlignment: {
    surface: SurfaceCondition | null
    modifier: number
    description: string
  }

  // Bloodline bonuses active
  bloodlineBonuses: {
    speed: number
    stamina: number
    grit: number
    temper: number
    special: string[]
  }
}

const STRATEGY_DESCRIPTIONS: Record<string, Record<string, { speedMod: string; staminaMod: string; description: string }>> = {
  start: {
    burst: { speedMod: '+20%', staminaMod: '+65%', description: 'Fast start, burns stamina quickly' },
    steady: { speedMod: '0%', staminaMod: '0%', description: 'Balanced start' },
    hang_back: { speedMod: '-20%', staminaMod: '-30%', description: 'Conserve energy early' },
  },
  mid: {
    push: { speedMod: '+10%', staminaMod: '+35%', description: 'Maintain pressure' },
    conserve: { speedMod: '-10%', staminaMod: '-40%', description: 'Save stamina for finish' },
    react: { speedMod: '0%', staminaMod: '0%', description: 'Match leader pace' },
  },
  finish: {
    sprint: { speedMod: '+30%', staminaMod: '+220%', description: 'All-out sprint' },
    maintain: { speedMod: '0%', staminaMod: '0%', description: 'Steady to the line' },
    gamble: { speedMod: '0-60%', staminaMod: '+50%', description: 'High variance finish' },
  },
}

export function useStrategyImpact(
  selectedHorse: Horse | null,
  selectedJockey: Jockey | null,
  selectedEquipment: { saddle?: Equipment; horseshoes?: Equipment; blinders?: Equipment },
  selectedStrategy: RaceStrategy | null
): StrategyImpactResult {
  const horses = useGameStore((state) => state.horses)
  const currentTrack = useGameStore((state) => state.currentTrack)

  return useMemo(() => {
    const result: StrategyImpactResult = {
      horse: selectedHorse,
      jockey: selectedJockey,
      equipment: selectedEquipment,
      strategy: selectedStrategy,
      derivedStats: null,
      speedBreakdown: null,
      staminaBreakdown: null,
      gritBreakdown: null,
      temperBreakdown: null,
      strategyImpact: [],
      terrainAlignment: {
        surface: currentTrack?.surface || null,
        modifier: 1.0,
        description: 'No track selected',
      },
      bloodlineBonuses: {
        speed: 0,
        stamina: 0,
        grit: 0,
        temper: 0,
        special: [],
      },
    }

    if (!selectedHorse || !selectedJockey) {
      return result
    }

    // Calculate bloodline bonuses
    const bloodlineBonuses = calculateBloodlineBonuses(
      selectedHorse,
      horses,
      currentTrack?.surface
    )

    result.bloodlineBonuses = {
      speed: bloodlineBonuses.speed,
      stamina: bloodlineBonuses.stamina,
      grit: bloodlineBonuses.grit,
      temper: bloodlineBonuses.temper,
      special: [
        bloodlineBonuses.ignoreTerrain ? 'Ignore terrain penalties' : '',
        bloodlineBonuses.temperReroll ? 'Temper reroll available' : '',
        bloodlineBonuses.gainSpeedInMud ? '+10% speed in mud' : '',
        bloodlineBonuses.favorableVariance ? 'Favorable variance only' : '',
      ].filter(Boolean),
    }

    // Calculate derived stats
    const derivedStats = calculateDerivedStats(
      selectedHorse,
      selectedJockey,
      selectedEquipment,
      currentTrack?.surface,
      bloodlineBonuses
    )
    result.derivedStats = derivedStats

    // Build stat breakdowns
    const buildBreakdown = (
      stat: 'speed' | 'stamina' | 'grit' | 'temper'
    ): StatBreakdown => {
      const base = selectedHorse.stats[stat]
      const modifiers: { source: string; value: number }[] = []

      // Equipment modifiers
      const equipmentMods: Record<string, number> = {}
      if (selectedEquipment.saddle?.effects) {
        const mod = selectedEquipment.saddle.effects[`${stat}Mod` as keyof typeof selectedEquipment.saddle.effects]
        if (typeof mod === 'number' && mod !== 0) {
          equipmentMods['Saddle'] = mod
        }
      }
      if (selectedEquipment.horseshoes?.effects) {
        const mod = selectedEquipment.horseshoes.effects[`${stat}Mod` as keyof typeof selectedEquipment.horseshoes.effects]
        if (typeof mod === 'number' && mod !== 0) {
          equipmentMods['Horseshoes'] = mod
        }
      }
      if (selectedEquipment.blinders?.effects) {
        const mod = selectedEquipment.blinders.effects[`${stat}Mod` as keyof typeof selectedEquipment.blinders.effects]
        if (typeof mod === 'number' && mod !== 0) {
          equipmentMods['Blinders'] = mod
        }
      }

      for (const [source, value] of Object.entries(equipmentMods)) {
        modifiers.push({ source, value })
      }

      // Bloodline bonuses
      const bloodlineBonus = bloodlineBonuses[stat]
      if (bloodlineBonus !== 0) {
        modifiers.push({ source: 'Bloodline Synergy', value: bloodlineBonus })
      }

      const final = base + modifiers.reduce((sum, m) => sum + m.value, 0)

      return {
        label: stat.charAt(0).toUpperCase() + stat.slice(1),
        base,
        modifiers,
        final,
      }
    }

    result.speedBreakdown = buildBreakdown('speed')
    result.staminaBreakdown = buildBreakdown('stamina')
    result.gritBreakdown = buildBreakdown('grit')
    result.temperBreakdown = buildBreakdown('temper')

    // Strategy impact
    if (selectedStrategy) {
      result.strategyImpact = [
        {
          phase: 'start',
          strategy: selectedStrategy.start,
          ...STRATEGY_DESCRIPTIONS.start[selectedStrategy.start],
        },
        {
          phase: 'mid',
          strategy: selectedStrategy.mid,
          ...STRATEGY_DESCRIPTIONS.mid[selectedStrategy.mid],
        },
        {
          phase: 'finish',
          strategy: selectedStrategy.finish,
          ...STRATEGY_DESCRIPTIONS.finish[selectedStrategy.finish],
        },
      ]
    }

    // Terrain alignment
    if (currentTrack) {
      const terrainMod = derivedStats.terrainMod
      let description = ''

      switch (currentTrack.surface) {
        case 'dry_dirt':
          description = 'Standard conditions'
          break
        case 'wet_muddy':
          if (bloodlineBonuses.gainSpeedInMud) {
            description = 'Mudblood bonus active (+10% speed)'
          } else if (terrainMod < 1.0) {
            description = `Mud penalty (${((1 - terrainMod) * 100).toFixed(0)}% slower)`
          } else {
            description = 'No mud penalty (high Grit)'
          }
          break
        case 'turf_grass':
          description = 'Turf bonus (+5% speed)'
          break
        case 'frozen':
          if (terrainMod < 1.0) {
            description = `Ice penalty (${((1 - terrainMod) * 100).toFixed(0)}% slower)`
          } else {
            description = 'No ice penalty (high Grit)'
          }
          break
        case 'sand':
          description = 'Sand track (stamina drain)'
          break
        case 'rocky':
          description = 'Rocky terrain (stumble risk)'
          break
      }

      result.terrainAlignment = {
        surface: currentTrack.surface,
        modifier: terrainMod,
        description,
      }
    }

    return result
  }, [selectedHorse, selectedJockey, selectedEquipment, selectedStrategy, horses, currentTrack])
}
