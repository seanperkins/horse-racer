// Core game types matching the PRD specifications

export type Bloodline =
  | 'Northern Storm'
  | 'Desert Wind'
  | 'Iron Heart'
  | 'Wild Card'
  | 'Mudblood'
  | 'Royal Line'

export type HorseVariant =
  | 'regular'
  | 'pegasus'
  | 'unicorn'
  | 'zombie'
  | 'skeleton'
  | 'kelpie'

export type JockeyStyle =
  | 'classic'
  | 'lightweight'
  | 'veteran'
  | 'mudder'
  | 'royal'
  | 'lucky'

export type JockeyTrait =
  | 'Mudder'
  | 'Closer'
  | 'Front-Runner'
  | 'Horse Whisperer'
  | 'Lightweight'
  | 'Veteran'
  | 'Lucky'

export type EquipmentSlot = 'saddle' | 'horseshoes' | 'blinders'

export type SurfaceCondition =
  | 'dry_dirt'
  | 'wet_muddy'
  | 'turf_grass'
  | 'rocky'
  | 'sand'
  | 'frozen'

export type TrackCategory = 'sprint' | 'mixed' | 'distance' | 'cross_country'

export type RaceStrategy = {
  start: 'burst' | 'steady' | 'hang_back'
  mid: 'push' | 'conserve' | 'react'
  finish: 'sprint' | 'maintain' | 'gamble'
}

// Horse definition
export interface Horse {
  id: string
  name: string
  tier: 1 | 2 | 3 | 4
  bloodline: Bloodline
  variant?: HorseVariant // Defaults to 'regular'

  // Base stats (1-10 scale)
  stats: {
    speed: number
    stamina: number
    grit: number
    temper: number
  }

  // Genetic potential (max stats after training)
  potential: {
    speed: number
    stamina: number
    grit: number
    temper: number
  }

  // Optional ability for Tier 3+ horses
  ability?: {
    name: string
    description: string
    effect: any // Will be implemented in simulation engine
  }

  cost: number
}

// Jockey definition
export interface Jockey {
  id: string
  name: string

  // Jockey stats (1-10 scale)
  stats: {
    skill: number
    timing: number
    weight: number
  }

  trait?: JockeyTrait
  style?: JockeyStyle // Visual style, defaults to 'classic'
  color?: number // Optional team color tint (hex)
  hireCost: number // One-time cost to hire
  upkeepCost: number // Per-round cost to keep employed
}

// Equipment definitions
export interface Equipment {
  id: string
  name: string
  slot: EquipmentSlot

  // Stat modifiers
  effects: {
    speedMod?: number
    staminaMod?: number
    gritMod?: number
    temperMod?: number
    skillMod?: number
    timingMod?: number
    weightMod?: number

    // Special effects
    ignoreTerrainPenalty?: SurfaceCondition
    stumbleAvoidance?: number // Percentage
    conditional?: {
      condition: string
      effect: any
    }
  }

  cost: number
}

// Track definition
export interface Track {
  id?: string
  name: string
  category: TrackCategory
  surface: SurfaceCondition
  distance: number // in furlongs
  description?: string

  // For cross-country tracks
  obstacles?: Array<{
    type: 'jump' | 'water' | 'rough_terrain'
    position: number // percentage of track (0-100)
    difficulty: number
  }>
}

// Player in a match
export interface Player {
  id: string
  userId: string
  username: string

  // Match state
  gold: number
  hearts: number
  eliminated: boolean
  placement?: number

  // Inventory
  horses: Horse[]
  hiredJockey: Jockey | null // Current jockey under contract
  equipment: Equipment[]

  // Current race entry
  raceEntry?: {
    horse: Horse
    jockey: Jockey
    equipment: {
      saddle?: Equipment
      horseshoes?: Equipment
      blinders?: Equipment
    }
    strategy: RaceStrategy
  }

  // Current bet
  currentBet?: {
    type: 'win' | 'place' | 'exacta'
    targetPlayerId?: string
    exactaFirst?: string
    exactaSecond?: string
    amount: number
    betForHeart: boolean
  }

  // Stats
  wins: number
  roundsPlayed: number
  goldEarned: number
  betWins: number
}

// Derived stats (calculated from horse + jockey)
export interface DerivedStats {
  baseSpeed: number
  staminaPool: number
  burnRate: number
  terrainMod: number
  efficiency: number
  consistency: {
    variance: number // ±percentage
    isStable: boolean
  }
}

// Race participant (complete entry)
export interface RaceParticipant {
  playerId: string
  playerName: string
  horse: Horse
  jockey: Jockey
  equipment: {
    saddle?: Equipment
    horseshoes?: Equipment
    blinders?: Equipment
  }
  strategy: RaceStrategy
  derivedStats: DerivedStats
  bloodlineBonuses: any // Calculated bonuses from stable
}

// Race simulation tick state
export interface RaceState {
  tick: number // Current simulation tick
  participants: Array<{
    playerId: string
    position: number // Distance covered
    currentSpeed: number
    stamina: number
    isStumbled: boolean
    finishTick: number | null // Tick when crossed finish line (null if not finished)
    finishPosition: number | null // Exact position when crossed (for sub-tick precision)
    events: string[] // Recent events for this participant
  }>
}

// Final race outcome
export interface RaceOutcome {
  placements: Array<{
    playerId: string
    playerName: string
    position: number // 1-8
    finishTime: number // milliseconds
    distance: number // Total distance covered
  }>
  events: Array<{
    tick: number
    playerId: string
    type: 'stumble' | 'surge' | 'strategy_change' | 'ability_trigger'
    description: string
  }>
}

// Game phase enum
export enum GamePhase {
  LOBBY = 'lobby',
  SHOP = 'shop',
  PREPARATION = 'preparation',
  BETTING = 'betting',
  RACE = 'race',
  RESULTS = 'results',
}

// Match state
export interface MatchState {
  id: string
  currentPhase: GamePhase
  currentRound: number
  players: Player[]
  currentTrack?: Track
  phaseStartTime: number
  phaseDuration: number
}
