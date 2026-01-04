/**
 * Deterministic Race Simulator
 * Given the same inputs and seed, produces identical results
 */

import seedrandom from 'seedrandom'
import type {
  RaceParticipant,
  Track,
  RaceOutcome,
  RaceState,
  RaceStrategy,
} from '@/types/game'
import {
  calculateDerivedStats,
  applyStrategyModifiers,
  calculateObstacleTimeCost,
  calculateStumbleRecovery,
} from '@/game/stats'

interface SimulationConfig {
  track: Track
  participants: RaceParticipant[]
  seed: string
  tickRate?: number // Ticks per second, default 10
}

interface ParticipantState {
  playerId: string
  position: number // Distance covered in meters
  currentSpeed: number
  stamina: number
  maxStamina: number
  isStumbled: boolean
  stumbleRecoveryTicks: number
  stumbleImmunityTicks: number // Cooldown after recovery to prevent immediate re-stumbling
  finishTick: number | null // Tick when horse crossed finish line
  finishPosition: number | null // Exact position when crossed (for sub-tick precision)
  events: Array<{ tick: number; type: string; description: string }>
}

export class RaceSimulator {
  private rng: () => number
  private config: SimulationConfig
  private states: Map<string, ParticipantState>
  private currentTick: number
  private raceDistance: number // Total race distance in meters
  private tickRate: number

  constructor(config: SimulationConfig) {
    this.config = config
    this.rng = seedrandom(config.seed)
    this.states = new Map()
    this.currentTick = 0
    this.tickRate = config.tickRate || 10 // 10 ticks per second

    // Convert furlongs to meters (1 furlong = 201.168 meters)
    this.raceDistance = config.track.distance * 201.168

    this.initializeParticipants()
  }

  /**
   * Initialize participant states
   */
  private initializeParticipants(): void {
    for (const participant of this.config.participants) {
      const derivedStats = calculateDerivedStats(
        participant.horse,
        participant.jockey,
        participant.equipment,
        this.config.track.surface,
        participant.bloodlineBonuses, // Pass bloodline bonuses
      )

      // Apply consistency variance to initial stamina
      let varianceRoll = (this.rng() - 0.5) * 2 // -1 to +1

      // Wild Card 2+ bonus: variance becomes favorable only (positive boosts only)
      const hasWildCardFavorableVariance =
        participant.horse.bloodline === 'Wild Card' &&
        participant.bloodlineBonuses?.favorableVariance === true

      if (hasWildCardFavorableVariance && varianceRoll < 0) {
        varianceRoll = Math.abs(varianceRoll) // Convert negative to positive
      }

      const varianceFactor = 1 + varianceRoll * derivedStats.consistency.variance

      this.states.set(participant.playerId, {
        playerId: participant.playerId,
        position: 0,
        currentSpeed: derivedStats.baseSpeed,
        stamina: derivedStats.staminaPool * varianceFactor,
        maxStamina: derivedStats.staminaPool,
        isStumbled: false,
        stumbleRecoveryTicks: 0,
        stumbleImmunityTicks: 0,
        finishTick: null,
        finishPosition: null,
        events: [],
      })
    }
  }

  /**
   * Run the complete race simulation
   */
  public simulate(): RaceOutcome {
    // Add race start events for all participants
    for (const participant of this.config.participants) {
      const state = this.states.get(participant.playerId)!
      this.addEvent(state, 'start', 'Off to a strong start!')
    }

    // Run until all horses finish the race
    while (!this.isRaceComplete()) {
      this.tick()
      this.currentTick++

      // Add position updates every 2 seconds (20 ticks)
      if (this.currentTick % 20 === 0) {
        this.addPositionUpdates()
      }

      // Safety check: if simulation runs too long, something is wrong
      // Increased limit to allow all horses to finish (100k ticks = ~2.7 hours at 10 ticks/sec)
      if (this.currentTick > 100000) {
        console.error('Race simulation exceeded 100000 ticks (~2.7 hours), stopping')
        console.error('Unfinished horses:', Array.from(this.states.values())
          .filter(s => s.position < this.raceDistance)
          .map(s => ({ playerId: s.playerId, position: s.position, distance: this.raceDistance }))
        )
        break
      }
    }

    return this.generateOutcome()
  }

  /**
   * Single simulation tick
   */
  private tick(): void {
    const raceProgress = this.getRaceProgress()
    const phase = this.getCurrentPhase(raceProgress)

    for (const participant of this.config.participants) {
      const state = this.states.get(participant.playerId)!
      const derivedStats = calculateDerivedStats(
        participant.horse,
        participant.jockey,
        participant.equipment,
        this.config.track.surface,
        participant.bloodlineBonuses, // Pass bloodline bonuses to tick calculations
      )

      // Decrement immunity ticks if active
      if (state.stumbleImmunityTicks > 0) {
        state.stumbleImmunityTicks--
      }

      // Skip if stumbled and still recovering
      if (state.isStumbled) {
        if (state.stumbleRecoveryTicks > 0) {
          state.stumbleRecoveryTicks = Math.max(0, state.stumbleRecoveryTicks - 1)
          console.log(`[SIM] ${state.playerId} recovering: ${state.stumbleRecoveryTicks} ticks left`)
        }

        if (state.stumbleRecoveryTicks <= 0) {
          state.isStumbled = false
          state.stumbleImmunityTicks = 30 // 3 seconds of immunity after recovery
          console.log(`[SIM] ${state.playerId} RECOVERED from stumble, immunity granted for 30 ticks`)
          this.addEvent(state, 'recovery', 'Recovered from stumble')
        } else {
          continue
        }
      }

      // Get strategy for current phase
      const strategy = this.getStrategyForPhase(participant.strategy, phase)

      // Apply strategy modifiers
      const { speed, burn } = applyStrategyModifiers(
        phase,
        strategy,
        derivedStats.baseSpeed,
        derivedStats.burnRate,
        state.stamina,
        state.maxStamina,
        this.rng,
      )
      const speedRatio = derivedStats.baseSpeed > 0 ? speed / derivedStats.baseSpeed : 1
      const speedBurnFactor = Math.max(0.8, 1 + (speedRatio - 1) * 0.8)
      const baseSpeedBurnFactor = 1 + Math.max(0, (derivedStats.baseSpeed - 18) * 0.03)
      const adjustedBurn = burn * speedBurnFactor * baseSpeedBurnFactor

      // Apply terrain modifier
      let terrainSpeed = speed * derivedStats.terrainMod

      // Apply jockey trait bonuses
      terrainSpeed = this.applyJockeyTraits(
        participant,
        terrainSpeed,
        state,
        phase,
        raceProgress,
      )

      // Apply horse ability bonuses
      terrainSpeed = this.applyHorseAbilities(
        participant,
        terrainSpeed,
        state,
        phase,
      )

      // Apply consistency penalties (high temper can cause brief nerves)
      if (!derivedStats.consistency.isStable) {
        const nervesChance = derivedStats.consistency.variance * 0.12
        if (this.rng() < nervesChance) {
          terrainSpeed *= 0.92
          if (
            !state.events.some(
              (e) => e.description.includes('nerves') && e.tick > this.currentTick - 20,
            )
          ) {
            this.addEvent(state, 'strategy_change', 'Nerves cause a brief slowdown')
          }
        }
      }

      // Apply efficiency bonus
      const finalSpeed = terrainSpeed * derivedStats.efficiency

      // Check for stamina depletion
      if (state.stamina <= 0) {
        // Exhausted - move at 50% speed, no stamina burn
        state.currentSpeed = finalSpeed * 0.3
      } else {
        const staminaRatio = state.stamina / state.maxStamina
        const staminaSpeedMod = 0.7 + 0.3 * staminaRatio
        state.currentSpeed = finalSpeed * staminaSpeedMod

        // Burn stamina (modified by surface conditions and horse abilities)
        let surfaceStaminaMod = this.getSurfaceStaminaModifier()
        surfaceStaminaMod *= this.getDistanceStaminaModifier()

        // Apply Endurance ability (Iron Heart): stamina drains 15% slower
        if (participant.horse.ability?.name === 'Endurance') {
          surfaceStaminaMod *= 0.85
        }

        state.stamina = Math.max(0, state.stamina - adjustedBurn * surfaceStaminaMod)
      }

      // Check for obstacles
      this.checkObstacles(participant, state, derivedStats)

      // Check for stumbles (terrain-dependent)
      this.checkStumbles(participant, state, derivedStats)

      // Move forward based on current speed
      // Speed is in units per second, tick rate divides it
      state.position += state.currentSpeed / this.tickRate
    }
  }

  /**
   * Check if all participants have crossed the finish line
   */
  private isRaceComplete(): boolean {
    for (const state of this.states.values()) {
      // Record finish tick and exact position if horse just crossed the line
      if (state.position >= this.raceDistance && state.finishTick === null) {
        // Calculate sub-tick precision: how far past the finish line did we go?
        const overshoot = state.position - this.raceDistance
        const tickDistance = state.currentSpeed / this.tickRate

        // Calculate what fraction of this tick had elapsed when crossing the finish
        // If overshoot = 0, we crossed exactly at the end of previous tick (fraction = 0)
        // If overshoot = tickDistance, we crossed at the end of this tick (fraction = 1)
        const tickFraction = tickDistance > 0 ? (tickDistance - overshoot) / tickDistance : 0

        // Store finish time with sub-tick precision
        // The horse crossed at: (currentTick - 1) + tickFraction
        state.finishTick = (this.currentTick - 1) + tickFraction
        state.finishPosition = state.position

        // Clear stumble state when finishing
        if (state.isStumbled) {
          state.isStumbled = false
          state.stumbleRecoveryTicks = 0
          state.stumbleImmunityTicks = 0
        }
      }

      if (state.position < this.raceDistance) {
        return false
      }
    }
    return true
  }

  /**
   * Get current race phase based on progress
   */
  private getCurrentPhase(progress: number): 'start' | 'mid' | 'finish' {
    if (progress < 0.2) return 'start' // First 20%
    if (progress < 0.8) return 'mid' // Middle 60%
    return 'finish' // Final 20%
  }

  /**
   * Get race progress (0.0 to 1.0)
   */
  private getRaceProgress(): number {
    let maxProgress = 0
    for (const state of this.states.values()) {
      const progress = state.position / this.raceDistance
      maxProgress = Math.max(maxProgress, progress)
    }
    return maxProgress
  }

  /**
   * Get strategy for current phase
   */
  private getStrategyForPhase(
    strategy: RaceStrategy,
    phase: 'start' | 'mid' | 'finish',
  ): string {
    return strategy[phase]
  }

  /**
   * Apply jockey trait bonuses
   */
  private applyJockeyTraits(
    participant: RaceParticipant,
    currentSpeed: number,
    state: ParticipantState,
    phase: 'start' | 'mid' | 'finish',
    raceProgress: number,
  ): number {
    let modifiedSpeed = currentSpeed
    const trait = participant.jockey.trait

    if (!trait) return modifiedSpeed

    switch (trait) {
      case 'Mudder':
        // +2 Grit bonus on wet/muddy tracks (already applied in calculateDerivedStats via effective grit)
        // But we can add a speed bonus here
        if (this.config.track.surface === 'wet_muddy') {
          modifiedSpeed *= 1.1 // +10% speed in mud
          if (!state.events.some((e) => e.description.includes('Mudder trait'))) {
            this.addEvent(state, 'trait', 'Mudder trait activated!')
          }
        }
        break

      case 'Closer':
        // +2 Speed in final stretch when behind by 2+ lengths
        if (phase === 'finish') {
          const myPosition = this.getRelativePosition(participant.playerId)
          if (myPosition >= 3) {
            // Behind by several positions
            modifiedSpeed *= 1.15 // +15% speed boost
            if (!state.events.some((e) => e.description.includes('Closer trait'))) {
              this.addEvent(state, 'trait', 'Closer trait activated - surging!')
            }
          }
        }
        break

      case 'Front-Runner':
        // +1 Speed while in 1st place
        const currentPosition = this.getRelativePosition(participant.playerId)
        if (currentPosition === 1) {
          modifiedSpeed *= 1.08 // +8% speed while leading
        }
        break

      case 'Horse Whisperer':
        // -3 effective Temper (calming effect already applied in stats calculation)
        // No speed modification needed here
        break

      case 'Lightweight':
        // -1 Weight already applied in base stats
        // No additional modification needed
        break

      case 'Veteran':
        // +2 Timing when Stamina below 30%
        if (state.stamina < state.maxStamina * 0.3) {
          modifiedSpeed *= 1.12 // +12% speed when low on stamina
          if (
            !state.events.some(
              (e) => e.description.includes('Veteran') && e.tick > this.currentTick - 20,
            )
          ) {
            this.addEvent(state, 'trait', 'Veteran experience kicking in!')
          }
        }
        break

      case 'Lucky':
        // Lucky trait already handled in stumble avoidance
        // 15% chance to avoid stumbles (implemented in checkStumbles)
        break
    }

    return modifiedSpeed
  }

  /**
   * Get relative position (1st, 2nd, 3rd, etc.)
   */
  private getRelativePosition(playerId: string): number {
    const sorted = Array.from(this.states.values()).sort((a, b) => b.position - a.position)
    return sorted.findIndex((s) => s.playerId === playerId) + 1
  }

  /**
   * Apply horse ability bonuses
   */
  private applyHorseAbilities(
    participant: RaceParticipant,
    currentSpeed: number,
    state: ParticipantState,
    phase: 'start' | 'mid' | 'finish',
  ): number {
    let modifiedSpeed = currentSpeed
    const ability = participant.horse.ability

    if (!ability) return modifiedSpeed

    switch (ability.name) {
      case 'Heat Resistance':
        // Desert Wind: +1 Speed on dry/sand tracks
        if (this.config.track.surface === 'dry_dirt' || this.config.track.surface === 'sand') {
          modifiedSpeed += 1
          if (!state.events.some((e) => e.description.includes('Heat Resistance'))) {
            this.addEvent(state, 'ability', 'Heat Resistance activated!')
          }
        }
        break

      case 'Weatherproof':
        // Northern Storm: +1 Speed in wet/frozen conditions
        if (
          this.config.track.surface === 'wet_muddy' ||
          this.config.track.surface === 'frozen'
        ) {
          modifiedSpeed += 1
          if (!state.events.some((e) => e.description.includes('Weatherproof'))) {
            this.addEvent(state, 'ability', 'Weatherproof activated!')
          }
        }
        break

      case 'Endurance':
        // Iron Heart: Stamina drains 15% slower (already handled in stamina burn calculation)
        break

      case 'Chaos Factor':
        // Wild Card: Temper variance increased 50% (already applied in consistency calculation)
        // This affects the initial variance roll, not real-time speed
        break

      case 'Mud Runner':
        // Mudblood: +1 Grit on wet tracks (can translate to speed bonus)
        if (this.config.track.surface === 'wet_muddy') {
          modifiedSpeed *= 1.05 // +5% speed bonus in mud
          if (!state.events.some((e) => e.description.includes('Mud Runner'))) {
            this.addEvent(state, 'ability', 'Mud Runner activated!')
          }
        }
        break

      case 'Noble Blood':
        // Royal Line: +1 to all stats when in top 3 (translates to speed bonus)
        const currentPosition = this.getRelativePosition(participant.playerId)
        if (currentPosition <= 3) {
          modifiedSpeed += 1 // +1 effective speed
        }
        break
    }

    return modifiedSpeed
  }

  /**
   * Check for obstacles on cross-country tracks
   */
  private checkObstacles(
    participant: RaceParticipant,
    state: ParticipantState,
    derivedStats: any,
  ): void {
    if (!this.config.track.obstacles) return

    const progressPercent = (state.position / this.raceDistance) * 100

    for (const obstacle of this.config.track.obstacles) {
      // Check if we just passed this obstacle (within 1% range)
      if (
        Math.abs(progressPercent - obstacle.position) < 1 &&
        !state.events.some(
          (e) => e.description.includes(obstacle.type) && e.tick > this.currentTick - 10,
        )
      ) {
        const baseCost = obstacle.difficulty * 0.5 // Base time cost in ticks
        const actualCost = calculateObstacleTimeCost(
          baseCost,
          participant.jockey.stats.skill,
          participant.horse.stats.grit,
        )

        // Slow down for obstacle
        state.position -= actualCost * (state.currentSpeed / this.tickRate)
        this.addEvent(state, 'obstacle', `Cleared ${obstacle.type}`)
      }
    }
  }

  /**
   * Check for stumbles based on terrain
   */
  private checkStumbles(
    participant: RaceParticipant,
    state: ParticipantState,
    derivedStats: any,
  ): void {
    // Skip stumble check if horse has immunity from recent recovery
    if (state.stumbleImmunityTicks > 0) {
      return
    }

    let stumbleChance = 0

    // Base stumble chance depends on terrain
    switch (this.config.track.surface) {
      case 'rocky':
        stumbleChance = 0.1 // 10% per segment
        // Rocky stumbles are countered by jockey Skill (PRD)
        const skillReduction = participant.jockey.stats.skill * 0.001
        stumbleChance = Math.max(0, stumbleChance - skillReduction)
        break
      case 'frozen':
        stumbleChance = 0.05 // 5% on sharp turns
        break
      case 'wet_muddy':
        stumbleChance = 0.03
        // Grit reduces muddy stumble chance
        const gritReduction = participant.horse.stats.grit * 0.0003
        stumbleChance = Math.max(0, stumbleChance - gritReduction)
        break
      default:
        stumbleChance = 0.01 // Minimal on other surfaces
    }

    // Check for jockey trait: Lucky (15% to avoid stumbles)
    if (participant.jockey.trait === 'Lucky' && this.rng() < 0.15) {
      stumbleChance = 0
    }

    // Apply equipment stumble avoidance
    const equipmentStumbleAvoidance = this.getEquipmentStumbleAvoidance(participant)
    if (equipmentStumbleAvoidance > 0 && this.rng() < equipmentStumbleAvoidance) {
      stumbleChance = 0
    }

    // Roll for stumble
    if (this.rng() < stumbleChance / this.tickRate) {
      state.isStumbled = true

      const baseRecovery = 15 // 15 ticks = 1.5 seconds
      state.stumbleRecoveryTicks = Math.max(
        1,
        Math.ceil(
          calculateStumbleRecovery(
            baseRecovery,
            participant.jockey.stats.skill,
            participant.horse.stats.grit,
          ),
        ),
      )

      console.log(`[SIM] ${state.playerId} STUMBLED! Recovery ticks: ${state.stumbleRecoveryTicks}`)
      this.addEvent(state, 'stumble', 'Stumbled!')
    }
  }

  /**
   * Get equipment stumble avoidance percentage
   */
  private getEquipmentStumbleAvoidance(participant: RaceParticipant): number {
    const allEquipment = [
      participant.equipment.saddle,
      participant.equipment.horseshoes,
      participant.equipment.blinders,
    ].filter(Boolean)

    let totalAvoidance = 0
    for (const item of allEquipment) {
      if (item && item.effects && item.effects.stumbleAvoidance) {
        totalAvoidance += item.effects.stumbleAvoidance
      }
    }

    return totalAvoidance
  }

  /**
   * Get stamina modifier based on surface
   */
  private getSurfaceStaminaModifier(): number {
    switch (this.config.track.surface) {
      case 'wet_muddy':
        return 1.2 // +20% stamina drain
      case 'sand':
        return 1.3 // +30% stamina drain
      case 'turf_grass':
        return 0.95 // -5% stamina drain
      default:
        return 1.0
    }
  }

  /**
   * Get stamina modifier based on race distance (furlongs)
   */
  private getDistanceStaminaModifier(): number {
    return Math.min(1.5, 0.9 + this.config.track.distance * 0.035)
  }

  /**
   * Add event to participant's event log
   */
  private addEvent(state: ParticipantState, type: string, description: string): void {
    state.events.push({
      tick: this.currentTick,
      type,
      description,
    })
  }

  /**
   * Add position update commentary every few seconds
   */
  private addPositionUpdates(): void {
    // Get current standings sorted by position
    const standings = Array.from(this.states.entries())
      .sort(([, a], [, b]) => b.position - a.position)
      .map(([playerId], index) => ({ playerId, position: index + 1 }))

    // Add commentary for leaders
    if (standings.length > 0) {
      const leader = standings[0]
      const leaderState = this.states.get(leader.playerId)!
      const raceProgress = this.getRaceProgress()

      if (raceProgress < 0.3) {
        this.addEvent(leaderState, 'surge', 'Taking the early lead!')
      } else if (raceProgress < 0.7) {
        this.addEvent(leaderState, 'surge', 'Maintaining position at the front!')
      } else {
        this.addEvent(leaderState, 'surge', 'Charging towards the finish!')
      }
    }

    // Add commentary for horses making moves
    if (standings.length > 2) {
      const midPack = standings[Math.floor(standings.length / 2)]
      const midPackState = this.states.get(midPack.playerId)!

      if (this.rng() < 0.3) { // 30% chance of mid-pack commentary
        this.addEvent(midPackState, 'position', 'Making a move through the pack!')
      }
    }
  }

  /**
   * Generate final race outcome
   */
  private generateOutcome(): RaceOutcome {
    const placements = Array.from(this.states.values())
      .sort((a, b) => {
        // Sort by finish tick (earliest finisher = 1st place)
        // If both finished, compare finish ticks
        if (a.finishTick !== null && b.finishTick !== null) {
          const tickDiff = a.finishTick - b.finishTick
          // If they finished on the same tick, use exact finish position for sub-tick precision
          if (tickDiff === 0) {
            // Horse that went further past the finish line crossed first
            const finishPosDiff = (b.finishPosition || b.position) - (a.finishPosition || a.position)
            // If still exactly tied (extremely rare), use playerId for deterministic ordering
            if (Math.abs(finishPosDiff) < 0.001) {
              return a.playerId.localeCompare(b.playerId)
            }
            return finishPosDiff
          }
          return tickDiff
        }
        // If only one finished, they win
        if (a.finishTick !== null) return -1
        if (b.finishTick !== null) return 1
        // If neither finished, sort by distance, then playerId for ties
        const distDiff = b.position - a.position
        if (Math.abs(distDiff) < 0.001) {
          return a.playerId.localeCompare(b.playerId)
        }
        return distDiff
      })
      .map((state, index) => {
        const participant = this.config.participants.find(
          (p) => p.playerId === state.playerId,
        )!

        return {
          playerId: state.playerId,
          playerName: participant.playerName,
          position: index + 1,
          finishTime: (state.finishTick || this.currentTick) * (1000 / this.tickRate), // Convert to ms
          distance: state.position,
        }
      })

    // Collect all events
    const allEvents: RaceOutcome['events'] = []
    for (const state of this.states.values()) {
      for (const event of state.events) {
        const participant = this.config.participants.find(
          (p) => p.playerId === state.playerId,
        )!

        allEvents.push({
          tick: event.tick,
          playerId: state.playerId,
          type: event.type as any,
          description: `${participant.playerName}: ${event.description}`,
        })
      }
    }

    // Sort events by tick
    allEvents.sort((a, b) => a.tick - b.tick)

    return {
      placements,
      events: allEvents,
    }
  }

  /**
   * Get current race state (for real-time updates)
   */
  public getCurrentState(): RaceState {
    return {
      tick: this.currentTick,
      participants: Array.from(this.states.values()).map((state) => ({
        playerId: state.playerId,
        position: state.position,
        currentSpeed: state.currentSpeed,
        stamina: state.stamina,
        isStumbled: state.isStumbled,
        finishTick: state.finishTick,
        finishPosition: state.finishPosition,
        events: state.events
          .filter((e) => e.tick > this.currentTick - 30)
          .map((e) => e.description),
      })),
    }
  }

  /**
   * Advance simulation by one tick (for real-time rendering)
   * Returns true if race is still ongoing, false if complete
   */
  public advanceTick(): boolean {
    if (this.isRaceComplete()) {
      return false
    }

    this.tick()
    this.currentTick++
    return !this.isRaceComplete()
  }

  /**
   * Get the total race distance in meters
   */
  public getRaceDistance(): number {
    return this.raceDistance
  }

  /**
   * Get the final outcome (call after race is complete)
   */
  public getOutcome(): RaceOutcome {
    return this.generateOutcome()
  }
}
