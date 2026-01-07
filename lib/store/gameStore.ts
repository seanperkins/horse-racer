import { create } from 'zustand'
import type { Player, Horse, Jockey, Equipment, Track, SubmittedEntry } from '@/types/game'
import type { RaceInputs as RaceInputsMessage } from '@/types/messages'

type GamePhase = 'shop' | 'preparation' | 'betting' | 'race' | 'results'

interface GameState {
  // Player info
  playerId: string | null
  playerName: string | null

  // Lobby state
  friendCode: string | null
  isPrivate: boolean
  players: Array<{ id: string; name: string; ready: boolean }>
  requiredPlayers: number

  // Game state
  currentPhase: GamePhase | 'lobby'
  currentRound: number
  phaseEndTime: number // Unix timestamp (ms) when phase ends - 0 means no timer

  // Player resources
  gold: number
  hearts: number
  reputation: number
  stableSlots: number
  maxStableSlots: number
  eliminated: boolean

  // UI state for phase actions
  bettingStatus: 'open' | 'submitted' | 'skipped'
  entryStatus: 'open' | 'submitted'
  lastSubmittedEntry: SubmittedEntry | null
  prepSelection: SubmittedEntry | null

  // Inventory
  horses: Horse[]
  hiredJockey: Jockey | null
  equipment: Equipment[]

  // Shop
  shopUnits: Array<{
    id: string
    type: 'horse' | 'jockey' | 'equipment'
    name: string
    cost: number
    data: any
  }>

  // Track
  currentTrack: Track | null

  // Betting
  bettingEntries: Array<any>

  // Race
  raceInputs: RaceInputsMessage | null
  raceResults: {
    placements: Array<any>
    betResults: Array<any>
    eliminatedPlayers: string[]
    events?: Array<{
      tick: number
      playerId: string
      type: string
      description: string
    }>
  } | null

  // Player ready status (for results phase)
  playerReadyStatus: Record<string, boolean>

  // WebSocket
  ws: WebSocket | null

  // Actions
  setPlayerId: (id: string) => void
  setPlayerName: (name: string) => void
  setLobbyState: (state: {
    players: Array<{ id: string; name: string; ready: boolean }>
    requiredPlayers: number
    friendCode: string
    isPrivate: boolean
  }) => void
  setGamePhase: (phase: GamePhase | 'lobby', duration: number, round: number, phaseEndTime?: number) => void
  setPlayerState: (state: {
    gold: number
    hearts: number
    inventory: { horses: Horse[]; hiredJockey: Jockey | null; equipment: Equipment[] }
  }) => void
  setShopState: (state: {
    units: any[]
    playerGold: number
    playerUnits?: { horses: Horse[]; hiredJockey: Jockey | null; equipment: Equipment[] }
  }) => void
  setTrackInfo: (track: Track) => void
  setBettingState: (state: { entries: Array<any> }) => void
  setRaceInputs: (inputs: RaceInputsMessage) => void
  setRaceResults: (results: { placements: Array<any>; betResults: Array<any>; eliminatedPlayers: string[]; events?: Array<any> }) => void
  setPlayerReadyStatus: (playerId: string, ready: boolean) => void
  setWebSocket: (ws: WebSocket | null) => void
  sendMessage: (message: any) => void
  reset: () => void

  // UI state actions
  setBettingStatus: (status: 'open' | 'submitted' | 'skipped') => void
  setEntryStatus: (status: 'open' | 'submitted', entry?: SubmittedEntry) => void
  setPrepSelection: (selection: SubmittedEntry | null) => void

  // Economy actions
  setReputation: (reputation: number) => void
  addReputation: (amount: number) => void
  setStableSlots: (slots: number) => void
}

const initialState = {
  playerId: null,
  playerName: null,
  friendCode: null,
  isPrivate: false,
  players: [],
  requiredPlayers: 8,
  currentPhase: 'lobby' as const,
  currentRound: 0,
  phaseEndTime: 0,
  gold: 10,
  hearts: 5,
  reputation: 0,
  stableSlots: 1,
  maxStableSlots: 3,
  eliminated: false,
  bettingStatus: 'open' as const,
  entryStatus: 'open' as const,
  lastSubmittedEntry: null,
  prepSelection: null,
  horses: [],
  hiredJockey: null,
  equipment: [],
  shopUnits: [],
  currentTrack: null,
  bettingEntries: [],
  raceInputs: null,
  raceResults: null,
  playerReadyStatus: {},
  ws: null,
}

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setPlayerId: (id) => set({ playerId: id }),

  setPlayerName: (name) => set({ playerName: name }),

  setLobbyState: (state) =>
    set({
      players: state.players,
      requiredPlayers: state.requiredPlayers,
      friendCode: state.friendCode,
      isPrivate: state.isPrivate,
    }),

  setGamePhase: (phase, duration, round, phaseEndTime) => {
    const updates: any = {
      currentPhase: phase,
      currentRound: round,
      // Use server's phaseEndTime if provided, otherwise calculate from duration
      // Check for undefined specifically since 0 would be falsy but invalid
      phaseEndTime: phaseEndTime !== undefined ? phaseEndTime : (Date.now() + duration * 1000),
    }

    // Reset player ready status when entering results, shop, or betting phase
    if (phase === 'results' || phase === 'shop' || phase === 'betting') {
      updates.playerReadyStatus = {}
    }

    // Reset betting status when entering betting phase
    if (phase === 'betting') {
      updates.bettingStatus = 'open'
    }

    // Reset entry status when entering preparation phase
    if (phase === 'preparation') {
      updates.entryStatus = 'open'
      updates.lastSubmittedEntry = null
      updates.prepSelection = null
    }

    set(updates)
  },

  setPlayerState: (state) =>
    set({
      gold: state.gold,
      hearts: state.hearts,
      horses: state.inventory.horses,
      hiredJockey: state.inventory.hiredJockey,
      equipment: state.inventory.equipment,
    }),

  setShopState: (state: { units: any[]; playerGold: number; playerUnits?: { horses: Horse[]; hiredJockey: Jockey | null; equipment: Equipment[] } }) => {
    console.log('setShopState called with:', state.units.length, 'units')
    set({
      shopUnits: state.units,
      gold: state.playerGold,
      ...(state.playerUnits && {
        horses: state.playerUnits.horses,
        hiredJockey: state.playerUnits.hiredJockey,
        equipment: state.playerUnits.equipment,
      }),
    })
  },

  setTrackInfo: (track) => set({ currentTrack: track }),

  setBettingState: (state) => set({ bettingEntries: state.entries }),

  setRaceInputs: (inputs) => set({ raceInputs: inputs }),

  setRaceResults: (results) => set({ raceResults: results }),

  setPlayerReadyStatus: (playerId, ready) =>
    set((state) => ({
      playerReadyStatus: {
        ...state.playerReadyStatus,
        [playerId]: ready,
      },
    })),

  setWebSocket: (ws) => set({ ws }),

  sendMessage: (message) => {
    const state = useGameStore.getState()
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify(message))
    }
  },

  reset: () => set(initialState),

  // UI state actions
  setBettingStatus: (status) => set({ bettingStatus: status }),

  setEntryStatus: (status, entry) =>
    set({
      entryStatus: status,
      ...(entry && { lastSubmittedEntry: entry }),
    }),

  setPrepSelection: (selection) => set({ prepSelection: selection }),

  // Economy actions
  setReputation: (reputation) => set({ reputation }),

  addReputation: (amount) =>
    set((state) => ({ reputation: state.reputation + amount })),

  setStableSlots: (slots) => set({ stableSlots: slots }),
}))
