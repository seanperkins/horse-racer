import { create } from 'zustand'
import type { Player, GamePhase, Horse, Jockey, Equipment, Track } from '@/types/game'

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
  phaseDuration: number
  phaseStartTime: number

  // Player resources
  gold: number
  hearts: number
  eliminated: boolean

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
  raceInputs: {
    entries: Array<any>
    track: Track | null
    seed: string | null
  } | null
  raceResults: {
    placements: Array<any>
    betResults: Array<any>
    eliminatedPlayers: string[]
    events: Array<{
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
  setGamePhase: (phase: GamePhase | 'lobby', duration: number, round: number) => void
  setPlayerState: (state: {
    gold: number
    hearts: number
    inventory: { horses: Horse[]; hiredJockey: Jockey | null; equipment: Equipment[] }
  }) => void
  setShopState: (state: { units: any[]; playerGold: number }) => void
  setTrackInfo: (track: Track) => void
  setBettingState: (state: { entries: Array<any> }) => void
  setRaceInputs: (inputs: { entries: Array<any>; track: Track; seed: string }) => void
  setRaceResults: (results: { placements: Array<any>; betResults: Array<any>; eliminatedPlayers: string[] }) => void
  setPlayerReadyStatus: (playerId: string, ready: boolean) => void
  setWebSocket: (ws: WebSocket | null) => void
  sendMessage: (message: any) => void
  reset: () => void
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
  phaseDuration: 0,
  phaseStartTime: 0,
  gold: 10,
  hearts: 5,
  eliminated: false,
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

  setGamePhase: (phase, duration, round) => {
    const updates: any = {
      currentPhase: phase,
      phaseDuration: duration,
      currentRound: round,
      phaseStartTime: Date.now(),
    }

    // Reset player ready status when entering results or shop phase
    if (phase === 'results' || phase === 'shop') {
      updates.playerReadyStatus = {}
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
}))
