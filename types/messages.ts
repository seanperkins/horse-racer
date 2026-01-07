import { z } from 'zod'

// Base message schema
export const BaseMessageSchema = z.object({
  type: z.string(),
  timestamp: z.number().optional(),
})

// Client -> Server messages
export const JoinLobbySchema = BaseMessageSchema.extend({
  type: z.literal('join_lobby'),
  playerName: z.string().min(1).max(20),
  userId: z.string(),
  friendCode: z.string().length(4).optional(), // 4-letter room code to join
  createPrivate: z.boolean().optional(), // Create a private room
})

export const ReadyUpSchema = BaseMessageSchema.extend({
  type: z.literal('ready_up'),
  ready: z.boolean(),
  userId: z.string().optional(), // Optional - server uses authenticated connection ID
})

export const PurchaseUnitSchema = BaseMessageSchema.extend({
  type: z.literal('purchase_unit'),
  unitId: z.string(),
  unitType: z.enum(['horse', 'jockey', 'equipment']),
})

export const SellUnitSchema = BaseMessageSchema.extend({
  type: z.literal('sell_unit'),
  unitId: z.string(),
})

export const RerollShopSchema = BaseMessageSchema.extend({
  type: z.literal('reroll_shop'),
})

export const TrainHorseSchema = BaseMessageSchema.extend({
  type: z.literal('train_horse'),
  horseId: z.string(),
  stat: z.enum(['speed', 'stamina', 'grit', 'temper']),
})

export const HireJockeySchema = BaseMessageSchema.extend({
  type: z.literal('hire_jockey'),
  jockeyId: z.string(),
})

export const FireJockeySchema = BaseMessageSchema.extend({
  type: z.literal('fire_jockey'),
})

export const SetupRaceEntrySchema = BaseMessageSchema.extend({
  type: z.literal('setup_race_entry'),
  horseId: z.string(),
  jockeyId: z.string(),
  equipment: z.object({
    saddle: z.string().optional(),
    horseshoes: z.string().optional(),
    blinders: z.string().optional(),
  }),
  strategy: z.object({
    start: z.enum(['burst', 'steady', 'hang_back']),
    mid: z.enum(['push', 'conserve', 'react']),
    finish: z.enum(['sprint', 'maintain', 'gamble']),
  }),
})

export const PlaceBetSchema = BaseMessageSchema.extend({
  type: z.literal('place_bet'),
  betType: z.enum(['win', 'place', 'exacta']),
  targetPlayerId: z.string().optional(), // For win/place bets
  exactaFirst: z.string().optional(), // For exacta
  exactaSecond: z.string().optional(), // For exacta
  amount: z.number().min(1).max(10),
  betForHeart: z.boolean().default(false), // Recovery bet
})

export const SkipBettingSchema = BaseMessageSchema.extend({
  type: z.literal('skip_betting'),
})

export const ExpandStableSchema = BaseMessageSchema.extend({
  type: z.literal('expand_stable'),
})

export const LeaveGameSchema = BaseMessageSchema.extend({
  type: z.literal('leave_game'),
  userId: z.string().optional(), // Optional - server uses authenticated connection ID
})

export const AnimationCompleteSchema = BaseMessageSchema.extend({
  type: z.literal('animation_complete'),
})

export const PingSchema = BaseMessageSchema.extend({
  type: z.literal('ping'),
})

// Server -> Client messages
export const PongSchema = BaseMessageSchema.extend({
  type: z.literal('pong'),
})
export const LobbyStateSchema = BaseMessageSchema.extend({
  type: z.literal('lobby_state'),
  players: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      ready: z.boolean(),
    }),
  ),
  requiredPlayers: z.number(),
  friendCode: z.string(), // 4-letter room code
  isPrivate: z.boolean(), // Whether this is a private room
})

export const GamePhaseSchema = BaseMessageSchema.extend({
  type: z.literal('game_phase'),
  phase: z.enum(['shop', 'preparation', 'betting', 'race', 'results']),
  duration: z.number(), // seconds
  round: z.number(),
  phaseEndTime: z.number().optional(), // Unix timestamp (ms) when phase ends - for reconnect sync
})

export const ShopStateSchema = BaseMessageSchema.extend({
  type: z.literal('shop_state'),
  units: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['horse', 'jockey', 'equipment']),
      name: z.string(),
      cost: z.number(),
      data: z.any(), // Full unit data
    }),
  ),
  playerGold: z.number(),
  playerUnits: z.object({
    horses: z.array(z.any()),
    hiredJockey: z.any().nullable(),
    equipment: z.array(z.any()),
  }),
})

export const TrackInfoSchema = BaseMessageSchema.extend({
  type: z.literal('track_info'),
  track: z.object({
    id: z.string().optional(),
    name: z.string(),
    category: z.string(),
    surface: z.string(),
    distance: z.number(),
    description: z.string().optional(),
    obstacles: z.array(z.any()).optional(),
  }),
})

export const BettingOpenSchema = BaseMessageSchema.extend({
  type: z.literal('betting_open'),
  entries: z.array(
    z.object({
      playerId: z.string(),
      playerName: z.string(),
      horse: z.any(),
      jockey: z.any(),
      equipment: z.any(),
      strategy: z.any(),
      odds: z.number(),
      placeOdds: z.number(),
      winProbability: z.number(),
    }),
  ),
})

// Legacy schema - kept for backward compatibility
export const RaceInputsSchema = BaseMessageSchema.extend({
  type: z.literal('race_inputs'),
  entries: z.array(
    z.object({
      playerId: z.string(),
      playerName: z.string(),
      horse: z.any(),
      jockey: z.any(),
      equipment: z.any(),
      strategy: z.any(),
    }),
  ),
  track: z.object({
    name: z.string(),
    category: z.string(),
    surface: z.string(),
    distance: z.number(),
    obstacles: z.array(z.any()).optional(),
  }),
  seed: z.string(), // For deterministic simulation
})

// New race_start message with pre-computed race data
export const RaceStartSchema = BaseMessageSchema.extend({
  type: z.literal('race_start'),
  entries: z.array(
    z.object({
      playerId: z.string(),
      playerName: z.string(),
      horse: z.any(),
      jockey: z.any(),
      equipment: z.any(),
      strategy: z.any(),
      bloodlineBonuses: z.any().optional(),
    }),
  ),
  track: z.object({
    name: z.string(),
    category: z.string(),
    surface: z.string(),
    distance: z.number(),
    obstacles: z.array(z.any()).optional(),
  }),
  seed: z.string(),
  precomputed: z.object({
    placements: z.array(
      z.object({
        playerId: z.string(),
        playerName: z.string(),
        position: z.number(),
        finishTime: z.number(),
        distance: z.number(),
      }),
    ),
    keyframes: z.array(
      z.object({
        tick: z.number(),
        positions: z.record(
          z.string(),
          z.object({
            distance: z.number(),
            speed: z.number(),
            stamina: z.number(),
            isStumbled: z.boolean(),
          }),
        ),
      }),
    ),
    events: z.array(
      z.object({
        tick: z.number(),
        playerId: z.string(),
        type: z.string(),
        description: z.string(),
      }),
    ),
    totalTicks: z.number(),
    raceDistance: z.number(),
  }),
})

export const RaceResultsSchema = BaseMessageSchema.extend({
  type: z.literal('race_results'),
  placements: z.array(
    z.object({
      playerId: z.string(),
      playerName: z.string(),
      position: z.number(),
      time: z.number(),
      goldReward: z.number(),
      heartsDamage: z.number(),
    }),
  ),
  betResults: z.array(
    z.object({
      playerId: z.string(),
      won: z.boolean(),
      payout: z.number().optional(),
      prestigeEarned: z.number().optional(), // Prestige from winning bets (replaces gold payout)
      isHeartBet: z.boolean().optional(),
    }),
  ),
  eliminatedPlayers: z.array(z.string()),
  events: z.array(
    z.object({
      tick: z.number(),
      playerId: z.string(),
      type: z.string(),
      description: z.string(),
    }),
  ),
})

export const PlayerStateSchema = BaseMessageSchema.extend({
  type: z.literal('player_state'),
  gold: z.number(),
  hearts: z.number(),
  prestige: z.number(),
  stableSlots: z.number(),
  inventory: z.object({
    horses: z.array(z.any()),
    hiredJockey: z.any().nullable(),
    equipment: z.array(z.any()),
  }),
  wins: z.number().optional(),
  currentRound: z.number().optional(),
})

export const ErrorMessageSchema = BaseMessageSchema.extend({
  type: z.literal('error'),
  message: z.string(),
  code: z.string().optional(),
})

export const PlayerReadySchema = BaseMessageSchema.extend({
  type: z.literal('player_ready'),
  playerId: z.string(),
  ready: z.boolean(),
})

// Sync message for race entry status (sent on reconnect)
export const RaceEntrySyncSchema = BaseMessageSchema.extend({
  type: z.literal('race_entry_sync'),
  submitted: z.boolean(),
  entry: z.object({
    horse: z.any(),
    jockey: z.any(),
    equipment: z.object({
      saddle: z.any().optional(),
      horseshoes: z.any().optional(),
      blinders: z.any().optional(),
    }),
    strategy: z.object({
      start: z.enum(['burst', 'steady', 'hang_back']),
      mid: z.enum(['push', 'conserve', 'react']),
      finish: z.enum(['sprint', 'maintain', 'gamble']),
    }),
  }).optional(),
})

// Sync message for bet status (sent on reconnect)
export const BetSyncSchema = BaseMessageSchema.extend({
  type: z.literal('bet_sync'),
  status: z.enum(['open', 'submitted', 'skipped']),
  bet: z.object({
    betType: z.enum(['win', 'place', 'exacta']),
    targetPlayerId: z.string().optional(),
    exactaFirst: z.string().optional(),
    exactaSecond: z.string().optional(),
    amount: z.number(),
    betForHeart: z.boolean(),
  }).optional(),
})

// Union of all client messages
export const ClientMessageSchema = z.discriminatedUnion('type', [
  JoinLobbySchema,
  ReadyUpSchema,
  PurchaseUnitSchema,
  SellUnitSchema,
  RerollShopSchema,
  TrainHorseSchema,
  HireJockeySchema,
  FireJockeySchema,
  SetupRaceEntrySchema,
  PlaceBetSchema,
  SkipBettingSchema,
  ExpandStableSchema,
  LeaveGameSchema,
  AnimationCompleteSchema,
  PingSchema,
])

// Union of all server messages
export const ServerMessageSchema = z.discriminatedUnion('type', [
  LobbyStateSchema,
  GamePhaseSchema,
  ShopStateSchema,
  TrackInfoSchema,
  BettingOpenSchema,
  RaceInputsSchema,
  RaceStartSchema,
  RaceResultsSchema,
  PlayerStateSchema,
  ErrorMessageSchema,
  PlayerReadySchema,
  PongSchema,
  RaceEntrySyncSchema,
  BetSyncSchema,
])

// TypeScript types inferred from schemas
export type ClientMessage = z.infer<typeof ClientMessageSchema>
export type ServerMessage = z.infer<typeof ServerMessageSchema>

export type JoinLobby = z.infer<typeof JoinLobbySchema>
export type ReadyUp = z.infer<typeof ReadyUpSchema>
export type PurchaseUnit = z.infer<typeof PurchaseUnitSchema>
export type SellUnit = z.infer<typeof SellUnitSchema>
export type RerollShop = z.infer<typeof RerollShopSchema>
export type TrainHorse = z.infer<typeof TrainHorseSchema>
export type HireJockey = z.infer<typeof HireJockeySchema>
export type FireJockey = z.infer<typeof FireJockeySchema>
export type SetupRaceEntry = z.infer<typeof SetupRaceEntrySchema>
export type PlaceBet = z.infer<typeof PlaceBetSchema>
export type SkipBetting = z.infer<typeof SkipBettingSchema>
export type ExpandStable = z.infer<typeof ExpandStableSchema>
export type LeaveGame = z.infer<typeof LeaveGameSchema>

export type LobbyState = z.infer<typeof LobbyStateSchema>
export type GamePhase = z.infer<typeof GamePhaseSchema>
export type ShopState = z.infer<typeof ShopStateSchema>
export type RaceInputs = z.infer<typeof RaceInputsSchema>
export type RaceStart = z.infer<typeof RaceStartSchema>
export type RaceResults = z.infer<typeof RaceResultsSchema>
export type PlayerState = z.infer<typeof PlayerStateSchema>
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>
export type AnimationComplete = z.infer<typeof AnimationCompleteSchema>
