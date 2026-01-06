import { useMemo } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import type { Bloodline, Horse } from '@/types/game'

export interface BloodlineInfo {
  name: Bloodline
  count: number
  bonuses: {
    threshold: number
    description: string
    active: boolean
  }[]
}

export interface SynergyTrackerResult {
  bloodlines: BloodlineInfo[]
  stableSize: number
  stableSlots: number
  maxStableSlots: number
  hasAnySynergy: boolean
  nextBreakpoint: {
    bloodline: Bloodline
    current: number
    needed: number
    description: string
  } | null
}

const BLOODLINE_BONUSES: Record<Bloodline, { threshold: number; description: string }[]> = {
  'Northern Storm': [
    { threshold: 2, description: '+1 Grit to all Northern Storm horses' },
    { threshold: 3, description: '+1 Stamina to racing horse' },
  ],
  'Desert Wind': [
    { threshold: 2, description: '+1 Speed on dry/sand tracks' },
    { threshold: 3, description: 'Ignore heat/sand penalties' },
  ],
  'Iron Heart': [
    { threshold: 2, description: '+1 Stamina' },
    { threshold: 3, description: '+3 Stamina total' },
  ],
  'Wild Card': [
    { threshold: 2, description: 'Temper variance becomes favorable only' },
    { threshold: 3, description: 'Can reroll Temper once per race' },
  ],
  'Mudblood': [
    { threshold: 2, description: '+2 Grit on wet/muddy tracks' },
    { threshold: 3, description: 'Gain speed in mud instead of penalty' },
  ],
  'Royal Line': [
    { threshold: 2, description: '+1 to all stats of highest-tier horse' },
    { threshold: 3, description: 'No additional bonus at 3+' },
  ],
}

export function useSynergyTracker(): SynergyTrackerResult {
  const horses = useGameStore((state) => state.horses)
  const stableSlots = useGameStore((state) => state.stableSlots)
  const maxStableSlots = useGameStore((state) => state.maxStableSlots)

  return useMemo(() => {
    // Count horses by bloodline
    const bloodlineCounts: Record<Bloodline, number> = {
      'Northern Storm': 0,
      'Desert Wind': 0,
      'Iron Heart': 0,
      'Wild Card': 0,
      'Mudblood': 0,
      'Royal Line': 0,
    }

    for (const horse of horses) {
      bloodlineCounts[horse.bloodline]++
    }

    // Build bloodline info with active/inactive bonuses
    const bloodlines: BloodlineInfo[] = (Object.keys(BLOODLINE_BONUSES) as Bloodline[]).map(
      (bloodline) => ({
        name: bloodline,
        count: bloodlineCounts[bloodline],
        bonuses: BLOODLINE_BONUSES[bloodline].map((bonus) => ({
          ...bonus,
          active: bloodlineCounts[bloodline] >= bonus.threshold,
        })),
      })
    )

    // Filter to only bloodlines player has horses for
    const relevantBloodlines = bloodlines.filter((b) => b.count > 0)

    // Check if any synergy is active
    const hasAnySynergy = relevantBloodlines.some((b) =>
      b.bonuses.some((bonus) => bonus.active)
    )

    // Find next achievable breakpoint (prioritize those close to activation)
    let nextBreakpoint: SynergyTrackerResult['nextBreakpoint'] = null

    // Look for breakpoints where player has at least 1 horse of that bloodline
    for (const bloodlineInfo of relevantBloodlines) {
      const inactiveBonus = bloodlineInfo.bonuses.find((b) => !b.active)
      if (inactiveBonus) {
        const needed = inactiveBonus.threshold - bloodlineInfo.count
        if (
          !nextBreakpoint ||
          needed < nextBreakpoint.needed - nextBreakpoint.current
        ) {
          nextBreakpoint = {
            bloodline: bloodlineInfo.name,
            current: bloodlineInfo.count,
            needed: inactiveBonus.threshold,
            description: inactiveBonus.description,
          }
        }
      }
    }

    return {
      bloodlines: relevantBloodlines,
      stableSize: horses.length,
      stableSlots,
      maxStableSlots,
      hasAnySynergy,
      nextBreakpoint,
    }
  }, [horses, stableSlots, maxStableSlots])
}
