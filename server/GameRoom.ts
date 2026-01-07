import type { WebSocketServer, WebSocket } from 'ws'
import type { Player, Horse, Jockey, Equipment, Track, PrecomputedRaceData, RaceOutcome } from '@/types/game'
import { RaceSimulator } from '@/game/simulation/RaceSimulator'
import {
  calculatePowerRating,
  calculateWinProbability,
  calculateBloodlineBonuses,
} from '@/game/stats'
import { generateShopInventory } from '@/game/shop'
import { generateTrackForRound } from '@/game/tracks'
import { generateHorse, generateJockey } from '@/game/generators'
import { prisma } from '@/lib/prisma'

// GameRoom uses string literals for phases, not the enum
type GamePhase = 'lobby' | 'shop' | 'preparation' | 'betting' | 'race' | 'results'

const MAX_PLAYERS = 8
const HOUSE_EDGE = 0.95
const WIN_ODDS_CAP = 8
const PLACE_ODDS_CAP = 3
const EXACTA_ODDS_CAP = 60
const PHASE_DURATIONS: Record<GamePhase, number> = {
  lobby: 0,
  shop: 45,
  preparation: 60,
  betting: 60,
  race: 70, // Increased to allow for full race completion (max 60s + 2s buffer + safety margin)
  results: 60, // Increased to allow players to review results and ready up
}

interface PlayerData extends Omit<Player, 'userId' | 'raceEntry' | 'currentBet'> {
  ready: boolean
  isAI?: boolean  // Flag to identify AI players
  userId?: string  // Optional for AI players
  reputation: number  // Economy currency for progression
  stableSlots: number  // Number of horse slots (1-3)
  // Override raceEntry from Player with more flexible types for server-side use
  raceEntry?: {
    horse: Horse
    jockey: Jockey
    equipment: any
    strategy: any
  }
  // Override currentBet from Player with more flexible types for server-side use
  currentBet?: {
    type: string
    targetPlayerId?: string
    exactaFirst?: string
    exactaSecond?: string
    amount: number
    betForHeart?: boolean
  }
  placement?: number
  shopInventory?: {
    horses: Horse[]
    jockeys: Jockey[]
    equipment: Equipment[]
  }
}

export class GameRoom {
  roomId: string
  friendCode: string
  wss: WebSocketServer
  players: Map<string, PlayerData>
  playerSockets: Map<string, WebSocket>
  currentPhase: GamePhase
  currentRound: number
  gameStarted: boolean
  phaseTimer: NodeJS.Timeout | null
  phaseEndTime: number | null // Unix timestamp (ms) when current phase ends
  isPrivate: boolean
  lastRaceSeed: string | null
  lastRaceEntries: any[] | null
  lastBettingOdds: Map<string, { win: number; place: number }>
  lastBettingStrengths: Map<string, number>
  lastBettingTotalStrength: number
  currentTrack: Track | null
  createdAt: number
  lastActivityAt: number
  matchId: string | null

  // Pre-computed race data cache
  cachedRaceResults: RaceOutcome | null
  cachedPrecomputedData: PrecomputedRaceData | null
  playersAnimationComplete: Set<string>

  // Stored race results for reconnection during results phase
  lastProcessedResults: {
    placements: Array<{
      playerId: string
      playerName: string
      position: number
      time: number
      goldReward: number
      heartsDamage: number
    }>
    betResults: Array<{
      playerId: string
      won: boolean
      payout?: number
      reputationEarned?: number
      isHeartBet: boolean
    }>
    eliminatedPlayers: string[]
    events: any[]
  } | null

  constructor(roomId: string, wss: WebSocketServer, friendCode: string | null = null) {
    this.roomId = roomId
    this.friendCode = friendCode || this.generateFriendCode()
    this.wss = wss
    this.players = new Map()
    this.playerSockets = new Map()
    this.currentPhase = 'lobby'
    this.currentRound = 0
    this.gameStarted = false
    this.phaseTimer = null
    this.phaseEndTime = null
    this.isPrivate = !!friendCode
    this.lastRaceSeed = null
    this.lastRaceEntries = null
    this.lastBettingOdds = new Map()
    this.lastBettingStrengths = new Map()
    this.lastBettingTotalStrength = 0
    this.currentTrack = null
    this.createdAt = Date.now()
    this.lastActivityAt = Date.now()
    this.matchId = null

    // Pre-computed race data cache
    this.cachedRaceResults = null
    this.cachedPrecomputedData = null
    this.playersAnimationComplete = new Set()
    this.lastProcessedResults = null
  }

  generateFriendCode(): string {
    const consonants = 'BCDFGHJKLMNPRSTVWXYZ'
    const vowels = 'AEIOU'
    let code = ''
    code += consonants[Math.floor(Math.random() * consonants.length)]
    code += vowels[Math.floor(Math.random() * vowels.length)]
    code += consonants[Math.floor(Math.random() * consonants.length)]
    code += vowels[Math.floor(Math.random() * vowels.length)]
    return code
  }

  canJoin(): boolean {
    // Count only real (non-AI) players - AI slots can be replaced
    const realPlayerCount = Array.from(this.players.values()).filter(p => !p.isAI).length
    return realPlayerCount < MAX_PLAYERS && !this.gameStarted
  }

  /**
   * Update WebSocket connection for an existing player (for reconnection)
   */
  updatePlayerConnection(userId: string, ws: WebSocket): void {
    this.lastActivityAt = Date.now()

    if (!this.players.has(userId)) {
      console.warn(`Cannot update connection: Player ${userId} not in room ${this.roomId}`)
      return
    }

    // Close old socket if it exists
    const oldSocket = this.playerSockets.get(userId)
    if (oldSocket && oldSocket !== ws) {
      console.log(`🔄 Replacing socket for player ${userId}`)
      oldSocket.close()
    }

    this.playerSockets.set(userId, ws)

    // Send full game state to reconnected player
    this.syncPlayerState(userId)
  }

  isEmpty(): boolean {
    // Room is empty if there are no players AND it's been inactive for > 3 minutes
    if (this.players.size === 0) {
      const inactiveTime = Date.now() - this.lastActivityAt
      const THREE_MINUTES = 3 * 60 * 1000
      return inactiveTime > THREE_MINUTES
    }

    // If game has started, keep room alive (players can reconnect)
    if (this.gameStarted) return false

    // In lobby, keep room alive if created recently (within 3 minutes) to allow reconnection
    const ageInMs = Date.now() - this.createdAt
    const THREE_MINUTES = 3 * 60 * 1000
    if (ageInMs < THREE_MINUTES) return false

    // Otherwise, check if anyone has an active socket connection
    return !Array.from(this.playerSockets.values()).some(
      (socket) => socket.readyState === 1 // WebSocket.OPEN
    )
  }

  addPlayer(userId: string, playerName: string, ws: WebSocket): void {
    this.lastActivityAt = Date.now()

    if (this.players.has(userId)) {
      // Player reconnecting
      console.log(`Player ${userId} reconnecting to room ${this.roomId}`)

      // Close and cleanup any prior socket for this player
      const oldSocket = this.playerSockets.get(userId)
      if (oldSocket && oldSocket !== ws) {
        console.log(`🔄 Cleaning up old socket for player ${userId}`)
        oldSocket.close()
      }

      this.playerSockets.set(userId, ws)

      // Send full game state to reconnecting player
      this.syncPlayerState(userId)
      return
    }

    if (!this.canJoin()) {
      this.sendError(ws, 'Room is full or game already started')
      return
    }

    // Initialize new player
    const player: PlayerData = {
      id: userId,
      userId,
      username: playerName,
      gold: 10,
      hearts: 5,
      reputation: 0,
      stableSlots: 1,
      eliminated: false,
      ready: false,
      horses: [],
      hiredJockey: null,
      equipment: [],
      wins: 0,
      roundsPlayed: 0,
      goldEarned: 0,
      betWins: 0,
    }

    this.players.set(userId, player)
    this.playerSockets.set(userId, ws)

    console.log(`Player ${playerName} joined room ${this.roomId}`)

    // Balance AI players to maintain MAX_PLAYERS total (only in lobby)
    if (!this.gameStarted) {
      this.balanceAIPlayers()
    }

    this.broadcastLobbyState()
  }

  removePlayer(playerId: string): void {
    const player = this.players.get(playerId)
    this.players.delete(playerId)
    this.playerSockets.delete(playerId)

    if (this.gameStarted && this.players.size === 1) {
      this.endGame()
    }

    // Balance AI players to maintain MAX_PLAYERS total (only in lobby, only for real players)
    if (!this.gameStarted && player && !player.isAI) {
      this.balanceAIPlayers()
    }

    this.broadcastLobbyState()
  }

  /**
   * Handle socket disconnection without removing the player from the game.
   * This allows players to reconnect within the grace period.
   * Cleans up the dead socket reference to prevent memory leaks.
   */
  handleSocketDisconnect(playerId: string): void {
    const socket = this.playerSockets.get(playerId)
    if (socket) {
      this.playerSockets.delete(playerId)
      console.log(`🔌 Cleaned up socket for player ${playerId} in room ${this.roomId}`)
    }
  }

  /**
   * Handle a player deliberately leaving the game.
   * This removes the player from the game entirely (unlike disconnect which allows reconnection).
   */
  handleLeaveGame(playerId: string): void {
    const player = this.players.get(playerId)
    if (!player) {
      console.log(`Player ${playerId} not found in room ${this.roomId}`)
      return
    }

    console.log(`🚪 Player ${player.username} is leaving room ${this.roomId}`)

    // Remove the player
    this.removePlayer(playerId)

    // If game hasn't started, rebalance AI players
    if (!this.gameStarted) {
      this.balanceAIPlayers()
      this.broadcastLobbyState()
    } else {
      // If game is in progress, check if we should end it
      const remainingHumanPlayers = Array.from(this.players.values())
        .filter(p => !p.isAI && !p.eliminated).length

      if (remainingHumanPlayers === 0) {
        console.log(`No human players left, ending game in room ${this.roomId}`)
        this.endGame()
      } else if (remainingHumanPlayers === 1) {
        console.log(`Only one human player left in room ${this.roomId}`)
        // Game can continue with AI players
      }
    }
  }

  /**
   * Clean up any dead socket references (sockets that are not in OPEN state).
   * Call this periodically to prevent memory leaks from ungraceful disconnects.
   */
  cleanupDeadSockets(): number {
    let cleanedCount = 0
    for (const [playerId, socket] of this.playerSockets) {
      // WebSocket.OPEN = 1
      if (socket.readyState !== 1) {
        this.playerSockets.delete(playerId)
        cleanedCount++
        console.log(`🧹 Removed dead socket for player ${playerId} in room ${this.roomId}`)
      }
    }
    return cleanedCount
  }

  /**
   * Create AI players to fill empty slots up to MAX_PLAYERS
   */
  initializeAIPlayers(): void {
    const realPlayerCount = Array.from(this.players.values())
      .filter(p => !p.isAI).length
    const aiNeeded = MAX_PLAYERS - realPlayerCount

    for (let i = 1; i <= aiNeeded; i++) {
      const aiId = `ai-player-${i}`
      const aiPlayer: PlayerData = {
        id: aiId,
        userId: aiId,
        username: `AI Racer ${i}`,
        gold: 10,
        hearts: 5,
        reputation: 0,
        stableSlots: 1,
        eliminated: false,
        ready: true,  // AI always ready
        isAI: true,
        horses: [generateHorse(2)],  // Start with one Tier 2 horse
        hiredJockey: generateJockey(2),  // Start with one Quality 2 jockey
        equipment: [],
        wins: 0,
        roundsPlayed: 0,
        goldEarned: 0,
        betWins: 0,
      }

      this.players.set(aiId, aiPlayer)
      console.log(`Created AI player: ${aiPlayer.username}`)
    }
  }

  /**
   * Maintain exactly MAX_PLAYERS total (real + AI)
   * Called when players join/leave lobby
   */
  balanceAIPlayers(): void {
    const realPlayerCount = Array.from(this.players.values())
      .filter(p => !p.isAI).length
    const currentAICount = Array.from(this.players.values())
      .filter(p => p.isAI).length
    const targetAICount = MAX_PLAYERS - realPlayerCount

    if (currentAICount < targetAICount) {
      // Add AI - find next available AI number
      const existingAINumbers = Array.from(this.players.values())
        .filter(p => p.isAI)
        .map(p => parseInt(p.id.replace('ai-player-', '')))
        .sort((a, b) => a - b)

      let nextAINumber = 1
      for (let i = 1; i <= MAX_PLAYERS; i++) {
        if (!existingAINumbers.includes(i)) {
          nextAINumber = i
          break
        }
      }

      for (let i = currentAICount; i < targetAICount; i++) {
        const aiId = `ai-player-${nextAINumber}`
        const aiPlayer: PlayerData = {
          id: aiId,
          userId: aiId,
          username: `AI Racer ${nextAINumber}`,
          gold: 10,
          hearts: 5,
          reputation: 0,
          stableSlots: 1,
          eliminated: false,
          ready: true,
          isAI: true,
          horses: [generateHorse(2)],
          hiredJockey: generateJockey(2),
          equipment: [],
          wins: 0,
          roundsPlayed: 0,
          goldEarned: 0,
          betWins: 0,
        }

        this.players.set(aiId, aiPlayer)
        console.log(`Added AI player: ${aiPlayer.username}`)

        // Find next available number
        nextAINumber++
        while (existingAINumbers.includes(nextAINumber)) {
          nextAINumber++
        }
      }
    } else if (currentAICount > targetAICount) {
      // Remove excess AI
      const aiPlayers = Array.from(this.players.values())
        .filter(p => p.isAI)
        .slice(0, currentAICount - targetAICount)

      for (const ai of aiPlayers) {
        this.players.delete(ai.id)
        console.log(`Removed AI player: ${ai.username}`)
      }
    }
  }

  /**
   * Auto-setup race entry for AI player
   */
  setupAIRaceEntry(playerId: string): void {
    const player = this.players.get(playerId)
    if (!player || !player.isAI) return

    // Select best available horse (highest tier/stats)
    const horse = player.horses.length > 0
      ? player.horses.reduce((best, current) =>
          current.tier > best.tier ? current : best
        )
      : generateHorse(2)

    // Use hired jockey or generate default
    const jockey = player.hiredJockey || generateJockey(2)

    player.raceEntry = {
      horse,
      jockey,
      equipment: {},
      strategy: { start: 'steady', mid: 'react', finish: 'maintain' }
    }

    player.ready = true
  }

  /**
   * Simple AI shopping: buy cheapest affordable horse or jockey
   */
  aiMakeShopPurchases(playerId: string): void {
    const player = this.players.get(playerId)
    if (!player || !player.isAI) return

    const shopInventory = player.shopInventory
    if (!shopInventory) return

    // Try to buy cheapest horse if affordable
    const affordableHorses = shopInventory.horses
      .filter(h => h.cost <= player.gold)
      .sort((a, b) => a.cost - b.cost)

    if (affordableHorses.length > 0) {
      const horse = affordableHorses[0]
      player.gold -= horse.cost
      player.horses.push(horse)
      // Remove from shop inventory
      shopInventory.horses = shopInventory.horses.filter(h => h.id !== horse.id)
      console.log(`${player.username} bought ${horse.name} for ${horse.cost}g`)
    }

    // Try to hire a jockey if don't have one (hiring is free now)
    if (!player.hiredJockey && shopInventory.jockeys.length > 0) {
      // Pick the best jockey by skill
      const sortedJockeys = [...shopInventory.jockeys].sort((a, b) => b.stats.skill - a.stats.skill)
      const jockey = sortedJockeys[0]
      player.hiredJockey = jockey
      shopInventory.jockeys = shopInventory.jockeys.filter(j => j.id !== jockey.id)
      console.log(`${player.username} hired ${jockey.name} (no upkeep)`)
    }

    player.ready = true
  }

  syncPlayerState(playerId: string): void {
    const player = this.players.get(playerId)
    if (!player) return

    console.log(`Syncing state for player ${playerId} in phase ${this.currentPhase}`)

    // Always send lobby state first
    this.sendToPlayer(playerId, {
      type: 'lobby_state',
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        name: p.username,
        ready: p.ready,
      })),
      requiredPlayers: MAX_PLAYERS,
      friendCode: this.friendCode,
      isPrivate: this.isPrivate,
    })

    // If game hasn't started, player is in lobby
    if (!this.gameStarted) {
      return
    }

    // Send current game phase with phaseEndTime for proper timer sync
    // If phaseEndTime is null (shouldn't happen), calculate it from now + duration as fallback
    const duration = PHASE_DURATIONS[this.currentPhase]
    const effectivePhaseEndTime = this.phaseEndTime || (Date.now() + duration * 1000)

    if (!this.phaseEndTime) {
      console.warn(`Room ${this.roomId}: phaseEndTime was null during sync, using fallback. Phase: ${this.currentPhase}`)
    }

    this.sendToPlayer(playerId, {
      type: 'game_phase',
      phase: this.currentPhase,
      duration,
      round: this.currentRound,
      phaseEndTime: effectivePhaseEndTime,
    })

    // Send player state
    this.sendToPlayer(playerId, {
      type: 'player_state',
      gold: player.gold,
      hearts: player.hearts,
      reputation: player.reputation,
      stableSlots: player.stableSlots,
      inventory: {
        horses: player.horses,
        hiredJockey: player.hiredJockey,
        equipment: player.equipment,
      },
    })

    // Phase-specific state sync
    switch (this.currentPhase) {
      case 'shop':
        // Send track info for the upcoming race
        if (this.currentTrack) {
          this.sendToPlayer(playerId, {
            type: 'track_info',
            track: this.currentTrack,
          })
        }

        if (player.shopInventory) {
          this.sendToPlayer(playerId, {
            type: 'shop_state',
            units: [
              ...player.shopInventory.horses.map((h) => ({
                id: h.id,
                type: 'horse' as const,
                name: h.name,
                cost: h.cost,
                data: h,
              })),
              ...player.shopInventory.jockeys.map((j) => ({
                id: j.id,
                type: 'jockey' as const,
                name: j.name,
                cost: j.hireCost,
                data: j,
              })),
              ...player.shopInventory.equipment.map((e) => ({
                id: e.id,
                type: 'equipment' as const,
                name: e.name,
                cost: e.cost,
                data: e,
              })),
            ],
            playerGold: player.gold,
            playerUnits: {
              horses: player.horses,
              hiredJockey: player.hiredJockey,
              equipment: player.equipment,
            },
          })
        }
        break

      case 'preparation':
      case 'betting':
        if (this.currentTrack) {
          this.sendToPlayer(playerId, {
            type: 'track_info',
            track: this.currentTrack,
          })
        }

        // Sync race entry status (for preparation and betting phases)
        if (player.raceEntry) {
          this.sendToPlayer(playerId, {
            type: 'race_entry_sync',
            submitted: true,
            entry: {
              horse: player.raceEntry.horse,
              jockey: player.raceEntry.jockey,
              equipment: player.raceEntry.equipment,
              strategy: player.raceEntry.strategy,
            },
          })
        }

        if (this.currentPhase === 'betting') {
          // Send betting entries
          const entries = Array.from(this.players.values())
            .filter((p) => p.raceEntry)
            .map((p) => {
              const entry = p.raceEntry!
              const bloodlineBonuses = calculateBloodlineBonuses(
                entry.horse,
                p.horses,
                this.currentTrack?.surface
              )
              const terrainFactor = this.currentTrack ? 1.0 : 1.0 // Default terrain factor
              const powerRating = calculatePowerRating(
                entry.horse,
                entry.jockey,
                entry.equipment,
                terrainFactor
              )

              return {
                playerId: p.id,
                playerName: p.username,
                horse: entry.horse,
                jockey: entry.jockey,
                powerRating,
              }
            })

          this.sendToPlayer(playerId, {
            type: 'betting_open',
            entries,
          })

          // Sync bet status if player already placed a bet
          if (player.currentBet) {
            this.sendToPlayer(playerId, {
              type: 'bet_sync',
              status: 'submitted',
              bet: {
                betType: player.currentBet.type,
                targetPlayerId: player.currentBet.targetPlayerId,
                exactaFirst: player.currentBet.exactaFirst,
                exactaSecond: player.currentBet.exactaSecond,
                amount: player.currentBet.amount,
                betForHeart: player.currentBet.betForHeart || false,
              },
            })
          } else if (player.ready) {
            // Player skipped betting
            this.sendToPlayer(playerId, {
              type: 'bet_sync',
              status: 'skipped',
            })
          }
        }
        break

      case 'race':
        // Send race_start with precomputed data if available (preferred)
        // Fall back to race_inputs for legacy compatibility
        if (this.cachedPrecomputedData && this.currentTrack && this.lastRaceEntries) {
          this.sendToPlayer(playerId, {
            type: 'race_start',
            entries: this.lastRaceEntries,
            track: this.currentTrack,
            seed: this.lastRaceSeed,
            precomputed: this.cachedPrecomputedData,
          })
        } else if (this.lastRaceSeed && this.currentTrack && this.lastRaceEntries) {
          // Fallback to legacy race_inputs
          this.sendToPlayer(playerId, {
            type: 'race_inputs',
            entries: this.lastRaceEntries,
            track: this.currentTrack,
            seed: this.lastRaceSeed,
          })
        }
        break

      case 'results':
        // Send race results for players who reconnect during results phase
        if (this.lastProcessedResults) {
          console.log(`Sending stored race_results to reconnecting player ${playerId}`)
          this.sendToPlayer(playerId, {
            type: 'race_results',
            placements: this.lastProcessedResults.placements,
            betResults: this.lastProcessedResults.betResults,
            eliminatedPlayers: this.lastProcessedResults.eliminatedPlayers,
            events: this.lastProcessedResults.events,
          })
        }
        break
    }

    console.log(`State sync complete for player ${playerId}`)
  }

  handleReadyUp(playerId: string, ready: boolean): void {
    const player = this.players.get(playerId)
    if (!player) return

    console.log(`Player ${playerId} ready: ${ready}, current phase: ${this.currentPhase}`)
    player.ready = ready

    // Broadcast ready state based on current phase
    if (this.currentPhase === 'lobby' || !this.gameStarted) {
      console.log('Broadcasting lobby_state')
      this.broadcastLobbyState()
    } else {
      // During game phases, broadcast player ready status
      console.log('Broadcasting player_ready')
      this.broadcast({
        type: 'player_ready',
        playerId,
        ready,
      })
    }

    // Lobby phase: start game when all ready
    if (!this.gameStarted && this.shouldStartGame()) {
      this.startGame()
      return
    }

    // Shop phase: advance to next phase when all ready
    if (this.currentPhase === 'shop' && this.shouldAdvancePhase()) {
      console.log(`All players ready in shop phase, advancing to next phase`)
      if (this.phaseTimer) {
        clearTimeout(this.phaseTimer)
      }
      this.advancePhase()
    }

    // Preparation phase: advance to next phase when all ready
    if (this.currentPhase === 'preparation' && this.shouldAdvancePhase()) {
      console.log(`All players ready in preparation phase, advancing to next phase`)
      if (this.phaseTimer) {
        clearTimeout(this.phaseTimer)
      }
      this.advancePhase()
    }

    // Betting phase: advance to next phase when all ready
    if (this.currentPhase === 'betting' && this.shouldAdvancePhase()) {
      console.log(`All players ready in betting phase, advancing to next phase`)
      if (this.phaseTimer) {
        clearTimeout(this.phaseTimer)
      }
      this.advancePhase()
    }

    // Results phase: advance to next phase when all ready
    if (this.currentPhase === 'results' && this.shouldAdvancePhase()) {
      console.log(`All players ready in results phase, advancing to next round`)
      if (this.phaseTimer) {
        clearTimeout(this.phaseTimer)
      }
      this.advancePhase()
    }
  }

  shouldStartGame(): boolean {
    if (this.players.size < 1) return false
    return Array.from(this.players.values()).every((p) => p.ready)
  }

  shouldAdvancePhase(): boolean {
    // Check if all non-eliminated players are ready
    const alivePlayers = Array.from(this.players.values()).filter((p) => !p.eliminated)
    if (alivePlayers.length < 1) return false
    return alivePlayers.every((p) => p.ready)
  }

  async startGame(): Promise<void> {
    console.log(`Starting game in room ${this.roomId}`)

    // Initialize AI players to fill remaining slots
    this.initializeAIPlayers()

    // Create Match record in database
    try {
      const match = await prisma.match.create({
        data: {
          startedAt: new Date(),
          totalRounds: 0,
        },
      })
      this.matchId = match.id
      console.log(`📊 Created match ${this.matchId} for room ${this.roomId}`)
    } catch (error) {
      console.error('Failed to create match record:', error)
    }

    this.gameStarted = true
    this.currentRound = 1
    this.startPhase('shop')
  }

  startPhase(phase: GamePhase): void {
    this.currentPhase = phase
    const duration = PHASE_DURATIONS[phase] || 30

    // Calculate when this phase will end (for reconnect sync)
    this.phaseEndTime = Date.now() + (duration * 1000)

    console.log(`Room ${this.roomId}: Starting ${phase} phase (${duration}s)${this.isSinglePlayerMode() ? ' - single player mode' : ''}`)

    // Reset ready state when starting shop, preparation, betting, or results phase
    if (phase === 'shop' || phase === 'preparation' || phase === 'betting' || phase === 'results') {
      this.players.forEach((player) => {
        player.ready = false
      })
    }

    this.broadcast({
      type: 'game_phase',
      phase,
      duration,
      round: this.currentRound,
      phaseEndTime: this.phaseEndTime,
    })

    switch (phase) {
      case 'shop':
        this.setupShopPhase()
        break
      case 'preparation':
        this.setupPreparationPhase()
        break
      case 'betting':
        this.setupBettingPhase()
        break
      case 'race':
        this.runRace()
        break
      case 'results':
        // Process race results when entering results phase
        // This ensures results are available immediately
        this.processRaceResults()
        break
    }

    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
    }

    // Single player mode: skip timer for most phases, wait for ready
    // Race phase still uses timer as it's automatic
    if (!this.isSinglePlayerMode() || phase === 'race') {
      this.phaseTimer = setTimeout(() => {
        this.advancePhase()
      }, duration * 1000)
    }
  }

  advancePhase(): void {
    const phaseOrder: GamePhase[] = ['shop', 'preparation', 'betting', 'race', 'results']
    const currentIndex = phaseOrder.indexOf(this.currentPhase)

    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
      this.currentRound++

      const alivePlayers = Array.from(this.players.values()).filter((p) => !p.eliminated)

      // Primary win condition: Last player standing
      if (alivePlayers.length === 1) {
        this.endGame(alivePlayers[0])
        return
      }

      // Game ends if all players are eliminated
      if (alivePlayers.length === 0) {
        this.endGame()
        return
      }

      // Secondary win condition: At round 10, highest Total Score wins
      // Total Score = Gold Earned + Reputation Earned
      if (this.currentRound > 10) {
        // Find winner by highest total score (gold + reputation)
        const winner = alivePlayers.reduce((best, player) => {
          const playerScore = player.gold + player.reputation
          const bestScore = best.gold + best.reputation
          return playerScore > bestScore ? player : best
        }, alivePlayers[0])

        console.log(`🏆 Game ending at round 10+ - Winner by score: ${winner.username} (${winner.gold}g + ${winner.reputation} rep = ${winner.gold + winner.reputation})`)
        this.endGame(winner)
        return
      }

      this.startPhase('shop')
    } else {
      this.startPhase(phaseOrder[currentIndex + 1])
    }
  }

  setupShopPhase(): void {
    // Clear previous round's race results
    this.lastProcessedResults = null

    // Generate track for this round so players can see what's coming
    this.currentTrack = generateTrackForRound(this.currentRound)

    // Broadcast track info to all players
    this.broadcast({
      type: 'track_info',
      track: this.currentTrack,
    })

    // Jockey upkeep removed - jockeys are now free to maintain
    // (Previously deducted upkeep at start of each round)

    // Generate per-player shop inventories
    for (const [playerId, player] of this.players) {
      // Generate unique shop inventory for this player
      player.shopInventory = generateShopInventory(this.currentRound)
      const shopInventory = player.shopInventory

      // Format inventory into flat units array for client
      const units = [
        ...shopInventory.horses.map((h: Horse) => ({ id: h.id, type: 'horse' as const, name: h.name, cost: h.cost, data: h })),
        ...shopInventory.jockeys.map((j: Jockey) => ({ id: j.id, type: 'jockey' as const, name: j.name, cost: j.hireCost, data: j })),
        ...shopInventory.equipment.map((e: Equipment) => ({ id: e.id, type: 'equipment' as const, name: e.name, cost: e.cost, data: e })),
      ]

      console.log(`Shop phase setup for player ${playerId}: Generated ${units.length} units (${shopInventory.horses.length} horses, ${shopInventory.jockeys.length} jockeys, ${shopInventory.equipment.length} equipment)`)

      this.sendToPlayer(playerId, {
        type: 'shop_state',
        units,
        playerGold: player.gold,
        playerUnits: {
          horses: player.horses,
          hiredJockey: player.hiredJockey,
          equipment: player.equipment,
        },
      })
    }

    // AI players make simple purchases and auto-ready
    for (const [playerId, player] of this.players) {
      if (player.isAI && !player.eliminated) {
        this.aiMakeShopPurchases(playerId)
      }
    }
  }

  setupPreparationPhase(): void {
    // Track was already generated in shop phase
    // Just broadcast it again in case players joined late
    if (this.currentTrack) {
      this.broadcast({
        type: 'track_info',
        track: this.currentTrack,
      })
    }

    // AI players auto-setup their race entries
    for (const [playerId, player] of this.players) {
      if (player.isAI && !player.eliminated) {
        this.setupAIRaceEntry(playerId)
      }
    }
  }

  setupBettingPhase(): void{
    const entries = this.getRaceEntries()

    // Calculate power ratings and odds for each entry
    const powerRatings = entries.map(entry => {
      return calculatePowerRating(entry.horse, entry.jockey, entry.equipment || {})
    })
    const totalStrength = powerRatings.reduce((sum, rating) => sum + rating, 0)
    this.lastBettingStrengths.clear()
    this.lastBettingTotalStrength = totalStrength

    const entriesWithOdds = entries.map((entry, index) => {
      const winProbability = calculateWinProbability(powerRatings[index], powerRatings)
      const placeProbability = this.calculatePlaceProbability(powerRatings, index)
      const payoutMultiplier = this.calculateOddsFromProbability(winProbability, WIN_ODDS_CAP)
      const placeMultiplier = this.calculateOddsFromProbability(placeProbability, PLACE_ODDS_CAP)

      this.lastBettingOdds.set(entry.playerId, {
        win: payoutMultiplier,
        place: placeMultiplier,
      })
      this.lastBettingStrengths.set(entry.playerId, powerRatings[index])

      return {
        ...entry,
        odds: payoutMultiplier,
        placeOdds: placeMultiplier,
        winProbability: Math.round(winProbability * 100),
      }
    })

    this.broadcast({
      type: 'betting_open',
      entries: entriesWithOdds,
    })

    // AI players don't bet, just auto-ready
    for (const [playerId, player] of this.players) {
      if (player.isAI && !player.eliminated) {
        player.ready = true
      }
    }
  }

  runRace(): void {
    const entries = this.getRaceEntries()
    this.lastRaceSeed = `race-${this.roomId}-${this.currentRound}`

    // Add bloodline bonuses to entries
    const track = this.currentTrack || generateTrackForRound(this.currentRound)
    const entriesWithBonuses = entries.map(entry => {
      const player = this.players.get(entry.playerId)
      const playerStable = player?.horses || []
      const bloodlineBonuses = calculateBloodlineBonuses(
        entry.horse,
        playerStable,
        track.surface,
      )

      return {
        ...entry,
        bloodlineBonuses,
      }
    })

    // Store entries for use in processRaceResults
    this.lastRaceEntries = entriesWithBonuses

    const seed = this.lastRaceSeed

    // Run the SINGLE simulation upfront and cache results
    const simulator = new RaceSimulator({
      track,
      participants: entriesWithBonuses.map(entry => ({
        playerId: entry.playerId,
        playerName: entry.playerName,
        horse: entry.horse,
        jockey: entry.jockey,
        equipment: entry.equipment as any || {},
        strategy: entry.strategy as any || { start: 'steady', mid: 'react', finish: 'maintain' },
        derivedStats: {
          baseSpeed: 0,
          staminaPool: 0,
          burnRate: 0,
          terrainMod: 0,
          efficiency: 0,
          consistency: { variance: 0, isStable: true },
        },
        bloodlineBonuses: entry.bloodlineBonuses,
      })),
      seed,
    })

    // Run simulation ONCE and cache everything
    this.cachedRaceResults = simulator.simulate()
    this.cachedPrecomputedData = simulator.getPrecomputedData()

    // Reset animation tracking for new race
    this.playersAnimationComplete = new Set()

    console.log('Broadcasting race_start with precomputed data')
    console.log(`  - ${this.cachedPrecomputedData.keyframes.length} keyframes`)
    console.log(`  - ${this.cachedPrecomputedData.events.length} events`)
    console.log(`  - ${this.cachedPrecomputedData.totalTicks} total ticks`)

    // Broadcast race_start with precomputed data for keyframe playback
    this.broadcast({
      type: 'race_start',
      entries: entriesWithBonuses,
      track,
      seed,
      precomputed: this.cachedPrecomputedData,
    })

    // Set up safety timeout - transition to results if clients take too long
    // Use the last finisher's time + 5 second buffer
    const lastFinishTime = this.cachedPrecomputedData.placements[
      this.cachedPrecomputedData.placements.length - 1
    ].finishTime
    const safetyTimeout = Math.max(lastFinishTime + 5000, 30000) // At least 30 seconds

    console.log(`Race safety timeout set to ${safetyTimeout}ms`)

    // Clear any existing phase timer and set new safety timeout
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
    }
    this.phaseTimer = setTimeout(() => {
      console.log('Race safety timeout triggered - transitioning to results')
      this.startPhase('results')
    }, safetyTimeout)
  }

  /**
   * Handle animation_complete message from a client
   */
  handleAnimationComplete(playerId: string): void {
    if (this.currentPhase !== 'race') {
      console.log(`Ignoring animation_complete from ${playerId} - not in race phase`)
      return
    }

    this.playersAnimationComplete.add(playerId)
    console.log(`Animation complete for ${playerId} (${this.playersAnimationComplete.size}/${this.getActiveHumanPlayerCount()})`)

    // Check if all active human players have completed
    if (this.allHumanPlayersAnimationComplete()) {
      console.log('All human players completed animation - transitioning to results')
      if (this.phaseTimer) {
        clearTimeout(this.phaseTimer)
        this.phaseTimer = null
      }
      this.startPhase('results')
    }
  }

  /**
   * Get count of non-eliminated human players
   */
  private getActiveHumanPlayerCount(): number {
    return Array.from(this.players.values())
      .filter(p => !p.eliminated && !p.isAI)
      .length
  }

  /**
   * Get count of all human players (including eliminated)
   */
  private getHumanPlayerCount(): number {
    return Array.from(this.players.values())
      .filter(p => !p.isAI)
      .length
  }

  /**
   * Check if this is a single-player game (one human + AI opponents)
   */
  private isSinglePlayerMode(): boolean {
    return this.getHumanPlayerCount() === 1
  }

  /**
   * Check if all non-eliminated human players have signaled animation complete
   */
  private allHumanPlayersAnimationComplete(): boolean {
    const activePlayers = Array.from(this.players.entries())
      .filter(([, p]) => !p.eliminated && !p.isAI)

    return activePlayers.every(([playerId]) =>
      this.playersAnimationComplete.has(playerId)
    )
  }

  processRaceResults(): void {
    // Use cached race results from runRace() - NO re-simulation needed!
    if (!this.cachedRaceResults || !this.cachedPrecomputedData) {
      console.error('No cached race results! This should not happen.')
      return
    }

    const raceOutcome = this.cachedRaceResults
    console.log('Using cached race results - no re-simulation needed')

    // Map simulation results to placements
    const placements = raceOutcome.placements.map((placement) => ({
      playerId: placement.playerId,
      playerName: this.players.get(placement.playerId)?.username || placement.playerId,
      position: placement.position,
      time: placement.finishTime,
      goldReward: this.calculateGoldReward(placement.position),
      heartsDamage: this.calculateHeartsDamage(placement.position),
    }))

    // Calculate bet results before applying race rewards
    const betResults = this.calculateBetResults(placements)

    // Apply race rewards to all players (including AI)
    for (const placement of placements) {
      const player = this.players.get(placement.playerId)
      if (!player) continue // Skip if player doesn't exist

      player.gold += placement.goldReward

      // Catch-up mechanic: +2 reputation per heart lost
      if (placement.heartsDamage > 0) {
        const catchUpReputation = placement.heartsDamage * 2
        player.reputation += catchUpReputation
        console.log(`Player ${placement.playerId} earned ${catchUpReputation} reputation from catch-up (lost ${placement.heartsDamage} hearts)`)
      }

      player.hearts -= placement.heartsDamage

      // Award reputation for top 3 finishers (+1 each)
      if (placement.position <= 3) {
        player.reputation += 1
        console.log(`Player ${placement.playerId} earned 1 reputation for finishing ${placement.position}${placement.position === 1 ? 'st' : placement.position === 2 ? 'nd' : 'rd'}`)
      }

      if (player.hearts <= 0) {
        player.eliminated = true
        player.placement = this.getEliminationPlacement()
      }
    }

    // Apply bet winnings/losses
    // Winning bets now award Prestige instead of gold
    for (const betResult of betResults) {
      const player = this.players.get(betResult.playerId)!
      if (betResult.won) {
        if (betResult.isHeartBet) {
          player.hearts = Math.min(player.hearts + 1, 5)
        } else {
          // Award Reputation instead of gold for winning bets
          player.reputation += betResult.reputationEarned || 0
        }
        player.betWins += 1
      }
      // Clear current bet after processing
      player.currentBet = undefined
    }

    // Store processed results for reconnection during results phase
    const eliminatedPlayers = Array.from(this.players.values())
      .filter((p) => p.eliminated)
      .map((p) => p.id)

    this.lastProcessedResults = {
      placements,
      betResults,
      eliminatedPlayers,
      events: raceOutcome.events,
    }

    console.log(`📊 Broadcasting race_results with ${placements.length} placements, current phase: ${this.currentPhase}`)
    this.broadcast({
      type: 'race_results',
      placements,
      betResults,
      eliminatedPlayers,
      events: raceOutcome.events,
    })

    // Clear cache after processing
    this.cachedRaceResults = null
    this.cachedPrecomputedData = null
    this.playersAnimationComplete = new Set()

    // Send updated player_state to all human players after race results
    for (const [playerId, player] of this.players) {
      if (!player.isAI) {
        console.log(`📤 Sending player_state to ${playerId}: gold=${player.gold}, hearts=${player.hearts}, reputation=${player.reputation}`)
        this.sendToPlayer(playerId, {
          type: 'player_state',
          gold: player.gold,
          hearts: player.hearts,
          reputation: player.reputation,
          stableSlots: player.stableSlots,
          inventory: {
            horses: player.horses,
            hiredJockey: player.hiredJockey,
            equipment: player.equipment,
          },
          wins: player.betWins,
          currentRound: this.currentRound,
        })
      }
    }

    // AI players auto-ready for next round
    for (const [playerId, player] of this.players) {
      if (player.isAI && !player.eliminated) {
        player.ready = true
      }
    }
  }


  async endGame(winner?: PlayerData): Promise<void> {
    console.log(`Game ended in room ${this.roomId}`)

    if (winner) {
      this.broadcast({
        type: 'game_end',
        winner: {
          id: winner.id,
          username: winner.username,
        },
      })
    }

    // Save match results to database
    await this.saveMatchResults(winner)

    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
    }

    this.gameStarted = false
  }

  async saveMatchResults(winner?: PlayerData): Promise<void> {
    if (!this.matchId) {
      console.log('⚠️  No matchId - skipping match results save')
      return
    }

    try {
      // Get all non-AI players sorted by placement
      const realPlayers = Array.from(this.players.values())
        .filter((p) => !p.isAI)
        .sort((a, b) => (a.placement || 999) - (b.placement || 999))

      console.log(`💾 Saving match results for ${realPlayers.length} players`)

      // Calculate XP for each player
      const XP_PER_ROUND = 10
      const XP_FOR_WIN = 100
      const XP_PER_PLACEMENT = [100, 75, 50, 30, 20, 10, 5, 0] // Bonus for placement

      // Update Match record
      await prisma.match.update({
        where: { id: this.matchId },
        data: {
          completedAt: new Date(),
          winner: winner?.id,
          totalRounds: this.currentRound,
        },
      })

      // Create MatchPlayer records and update User stats
      for (const player of realPlayers) {
        const roundsPlayed = this.currentRound
        const placement = player.placement || realPlayers.length
        const isWinner = player.id === winner?.id

        // Calculate XP earned
        const baseXP = roundsPlayed * XP_PER_ROUND
        const winBonus = isWinner ? XP_FOR_WIN : 0
        const placementBonus = XP_PER_PLACEMENT[placement - 1] || 0
        const totalXP = baseXP + winBonus + placementBonus

        // Create MatchPlayer record
        await prisma.matchPlayer.create({
          data: {
            matchId: this.matchId,
            userId: player.id,
            placement,
            goldEarned: player.gold,
            roundsPlayed,
            betWins: 0, // TODO: Track bet wins
          },
        })

        // Get current user XP to calculate new level
        const currentUser = await prisma.user.findUnique({
          where: { id: player.id },
          select: { xp: true },
        })

        const newXP = (currentUser?.xp || 0) + totalXP
        const newLevel = Math.floor(newXP / 1000) + 1

        // Update User stats
        await prisma.user.update({
          where: { id: player.id },
          data: {
            xp: { increment: totalXP },
            totalMatches: { increment: 1 },
            totalWins: isWinner ? { increment: 1 } : undefined,
            level: newLevel,
          },
        })

        console.log(`📊 Updated stats for ${player.username}: +${totalXP} XP (total: ${newXP}), level ${newLevel}, placement ${placement}`)
      }

      console.log(`✅ Match ${this.matchId} results saved successfully`)
    } catch (error) {
      console.error('Failed to save match results:', error)
    }
  }

  getRaceEntries(): Array<{
    playerId: string
    playerName: string
    horse: Horse
    jockey: Jockey
    equipment: Record<string, unknown>
    strategy: Record<string, unknown>
  }> {
    // All players (including AI) are now in this.players
    // No need to generate temporary AI entries
    return Array.from(this.players.values())
      .filter((p) => !p.eliminated && p.raceEntry)
      .map((p) => ({
        playerId: p.id,
        playerName: p.username,
        horse: p.raceEntry!.horse,
        jockey: p.raceEntry!.jockey,
        equipment: p.raceEntry!.equipment,
        strategy: p.raceEntry!.strategy,
      }))
  }

  calculateBetResults(placements: Array<{ playerId: string; position: number }>): Array<{
    playerId: string
    won: boolean
    payout?: number
    reputationEarned?: number
    isHeartBet: boolean
  }> {
    const results: Array<{ playerId: string; won: boolean; payout?: number; reputationEarned?: number; isHeartBet: boolean }> = []

    for (const [playerId, player] of this.players) {
      if (!player.currentBet) continue

      const bet = player.currentBet
      let won = false

      // Get top 3 finishers
      const winner = placements.find(p => p.position === 1)
      const runnerUp = placements.find(p => p.position === 2)
      const thirdPlace = placements.find(p => p.position === 3)

      switch (bet.type) {
        case 'win':
          // Bet on a specific horse to win
          won = bet.targetPlayerId === winner?.playerId
          break

        case 'place':
          // Bet on a specific horse to place (1st, 2nd, or 3rd)
          won = bet.targetPlayerId === winner?.playerId ||
                bet.targetPlayerId === runnerUp?.playerId ||
                bet.targetPlayerId === thirdPlace?.playerId
          break

        case 'exacta':
          // Bet on exact 1st and 2nd place finishers
          won = bet.exactaFirst === winner?.playerId && bet.exactaSecond === runnerUp?.playerId
          break
      }

      // Virtual stakes betting - fixed reputation rewards based on bet type
      // Place = 1, Win = 3, Exacta = 5
      const BET_REWARDS: Record<string, number> = { place: 1, win: 3, exacta: 5 }
      const reputationEarned = won && !bet.betForHeart ? (BET_REWARDS[bet.type] || 0) : 0

      results.push({
        playerId,
        won,
        payout: 0, // Betting no longer pays gold, only Reputation
        reputationEarned,
        isHeartBet: bet.betForHeart || false,
      })
    }

    return results
  }

  private calculateOddsFromProbability(probability: number, cap: number): number {
    const safeProbability = Math.max(probability, 1e-6)
    return Math.min(cap, HOUSE_EDGE / safeProbability)
  }

  private calculatePlaceProbability(strengths: number[], index: number): number {
    const totalStrength = strengths.reduce((sum, rating) => sum + rating, 0)
    const strength = strengths[index]
    if (totalStrength <= 0) return 0

    let probability = strength / totalStrength

    for (let j = 0; j < strengths.length; j++) {
      if (j === index) continue
      const strengthJ = strengths[j]
      const totalAfterJ = totalStrength - strengthJ
      if (totalAfterJ <= 0) continue
      probability += (strengthJ / totalStrength) * (strength / totalAfterJ)
    }

    for (let j = 0; j < strengths.length; j++) {
      if (j === index) continue
      const strengthJ = strengths[j]
      const totalAfterJ = totalStrength - strengthJ
      if (totalAfterJ <= 0) continue

      for (let k = 0; k < strengths.length; k++) {
        if (k === index || k === j) continue
        const strengthK = strengths[k]
        const totalAfterJK = totalAfterJ - strengthK
        if (totalAfterJK <= 0) continue
        probability += (strengthJ / totalStrength) * (strengthK / totalAfterJ) * (strength / totalAfterJK)
      }
    }

    return Math.min(probability, 1)
  }

  private calculateExactaProbability(firstId?: string, secondId?: string): number {
    if (!firstId || !secondId) return 0
    const totalStrength = this.lastBettingTotalStrength
    if (totalStrength <= 0) return 0

    const firstStrength = this.lastBettingStrengths.get(firstId)
    const secondStrength = this.lastBettingStrengths.get(secondId)
    if (!firstStrength || !secondStrength) return 0

    const remainingStrength = totalStrength - firstStrength
    if (remainingStrength <= 0) return 0

    return (firstStrength / totalStrength) * (secondStrength / remainingStrength)
  }

  calculateGoldReward(position: number): number {
    const rewards = [5, 4, 3, 2, 2, 1, 1, 1]
    return rewards[position - 1] || 1
  }

  calculateHeartsDamage(position: number): number {
    // V8 Progressive Heart Damage Curve
    // Rounds 1-3: No damage (grace period)
    // Rounds 4-6: Only 8th place takes 1 damage
    // Rounds 7-8: 8th=2, 7th=1
    // Rounds 9-10: 8th=2, 7th=1, 6th=1

    const round = this.currentRound

    // Grace period: rounds 1-3
    if (round <= 3) {
      return 0
    }

    // Rounds 4-6: Only dead last takes damage
    if (round <= 6) {
      if (position === 8) return 1
      return 0
    }

    // Rounds 7-8: 7th and 8th take damage
    if (round <= 8) {
      if (position === 8) return 2
      if (position === 7) return 1
      return 0
    }

    // Rounds 9-10+: Endgame acceleration
    if (position === 8) return 2
    if (position === 7) return 1
    if (position === 6) return 1
    return 0
  }

  getEliminationPlacement(): number {
    const eliminated = Array.from(this.players.values()).filter((p) => p.placement).length
    return MAX_PLAYERS - eliminated
  }

  handlePurchase(playerId: string, message: { unitType: string; unitId: string }): void {
    const player = this.players.get(playerId)
    if (!player) return

    const ws = this.playerSockets.get(playerId)

    // Only allow purchases during shop phase
    if (this.currentPhase !== 'shop') {
      if (ws) this.sendError(ws, 'Can only purchase during shop phase')
      return
    }

    // Get this player's shop inventory
    const shopInventory = player.shopInventory
    if (!shopInventory) {
      if (ws) this.sendError(ws, 'Shop not available')
      return
    }

    // Find the unit in the player's shop
    let unit: any = null
    let unitType: 'horse' | 'jockey' | 'equipment' = message.unitType as any

    if (unitType === 'horse') {
      unit = shopInventory.horses.find((h: Horse) => h.id === message.unitId)
    } else if (unitType === 'jockey') {
      // Jockeys should be hired through handleHireJockey, not purchased
      if (ws) this.sendError(ws, 'Use hire_jockey to hire jockeys')
      return
    } else if (unitType === 'equipment') {
      unit = shopInventory.equipment.find((e: Equipment) => e.id === message.unitId)
    }

    if (!unit) {
      if (ws) this.sendError(ws, 'Unit not found in shop')
      return
    }

    // Check if player can afford it (unit.cost is guaranteed to exist for horses/equipment)
    if (player.gold < unit.cost) {
      if (ws) this.sendError(ws, 'Not enough gold')
      return
    }

    // Check stable capacity for horses
    if (unitType === 'horse' && player.horses.length >= player.stableSlots) {
      if (ws) this.sendError(ws, `Stable full! You can only hold ${player.stableSlots} horses. Expand your stable with Reputation.`)
      return
    }

    // Deduct gold and add unit to player's inventory
    player.gold -= unit.cost

    if (unitType === 'horse') {
      player.horses.push(unit)
      // Remove from shop inventory
      const horseIndex = shopInventory.horses.findIndex((h: Horse) => h.id === message.unitId)
      if (horseIndex !== -1) {
        shopInventory.horses.splice(horseIndex, 1)
      }
    } else if (unitType === 'equipment') {
      player.equipment.push(unit)
      // Remove from shop inventory
      const equipmentIndex = shopInventory.equipment.findIndex((e: Equipment) => e.id === message.unitId)
      if (equipmentIndex !== -1) {
        shopInventory.equipment.splice(equipmentIndex, 1)
      }
    }
    // Note: Jockeys are hired through the hire_jockey message, not purchase_unit

    console.log(`Player ${playerId} purchased ${message.unitType}: ${unit.name} for ${unit.cost}g`)

    // Send updated player state
    this.sendToPlayer(playerId, {
      type: 'player_state',
      gold: player.gold,
      hearts: player.hearts,
      reputation: player.reputation,
      stableSlots: player.stableSlots,
      inventory: {
        horses: player.horses,
        hiredJockey: player.hiredJockey,
        equipment: player.equipment,
      },
      wins: player.wins,
      currentRound: this.currentRound,
    })

    // Send updated shop state to reflect removed item
    const units = [
      ...shopInventory.horses.map((h: Horse) => ({ id: h.id, type: 'horse' as const, name: h.name, cost: h.cost, data: h })),
      ...shopInventory.jockeys.map((j: Jockey) => ({ id: j.id, type: 'jockey' as const, name: j.name, cost: j.hireCost, data: j })),
      ...shopInventory.equipment.map((e: Equipment) => ({ id: e.id, type: 'equipment' as const, name: e.name, cost: e.cost, data: e })),
    ]

    this.sendToPlayer(playerId, {
      type: 'shop_state',
      units,
      playerGold: player.gold,
      playerUnits: {
        horses: player.horses,
        hiredJockey: player.hiredJockey,
        equipment: player.equipment,
      },
    })
  }

  handleSell(playerId: string, message: { unitId: string }): void {
    const player = this.players.get(playerId)
    if (!player) return

    const ws = this.playerSockets.get(playerId)

    // Only allow selling during shop phase
    if (this.currentPhase !== 'shop') {
      if (ws) this.sendError(ws, 'Can only sell during shop phase')
      return
    }

    // Find and remove the unit from player's inventory
    let soldUnit: any = null
    let unitType: 'horse' | 'jockey' | 'equipment' | null = null

    // Check horses
    const horseIndex = player.horses.findIndex(h => h.id === message.unitId)
    if (horseIndex !== -1) {
      soldUnit = player.horses[horseIndex]
      player.horses.splice(horseIndex, 1)
      unitType = 'horse'
    }

    // Note: Jockeys are fired through the fire_jockey message, not sell_unit

    // Check equipment
    if (!soldUnit) {
      const equipmentIndex = player.equipment.findIndex(e => e.id === message.unitId)
      if (equipmentIndex !== -1) {
        soldUnit = player.equipment[equipmentIndex]
        player.equipment.splice(equipmentIndex, 1)
        unitType = 'equipment'
      }
    }

    if (!soldUnit) {
      if (ws) this.sendError(ws, 'Unit not found in inventory')
      return
    }

    // Sell price is 50% of purchase cost
    const sellPrice = Math.floor(soldUnit.cost / 2)
    player.gold += sellPrice

    console.log(`Player ${playerId} sold ${unitType}: ${soldUnit.name} for ${sellPrice}g`)

    // Send updated player state
    this.sendToPlayer(playerId, {
      type: 'player_state',
      gold: player.gold,
      hearts: player.hearts,
      reputation: player.reputation,
      stableSlots: player.stableSlots,
      inventory: {
        horses: player.horses,
        hiredJockey: player.hiredJockey,
        equipment: player.equipment,
      },
      wins: player.wins,
      currentRound: this.currentRound,
    })
  }

  handleReroll(playerId: string): void {
    const player = this.players.get(playerId)
    if (!player) return

    const ws = this.playerSockets.get(playerId)

    // Only allow reroll during shop phase
    if (this.currentPhase !== 'shop') {
      if (ws) this.sendError(ws, 'Can only reroll during shop phase')
      return
    }

    if (player.gold < 2) {
      if (ws) this.sendError(ws, 'Not enough gold to reroll')
      return
    }

    player.gold -= 2

    // Generate new shop inventory for this player only
    player.shopInventory = generateShopInventory(this.currentRound)
    const shopInventory = player.shopInventory

    console.log(`Player ${playerId} rerolled shop for 2g`)

    // Send new shop state to this player only
    this.sendToPlayer(playerId, {
      type: 'shop_state',
      units: [
        ...shopInventory.horses.map((h: Horse) => ({ id: h.id, type: 'horse' as const, name: h.name, cost: h.cost, data: h })),
        ...shopInventory.jockeys.map((j: Jockey) => ({ id: j.id, type: 'jockey' as const, name: j.name, cost: j.hireCost, data: j })),
        ...shopInventory.equipment.map((e: Equipment) => ({ id: e.id, type: 'equipment' as const, name: e.name, cost: e.cost, data: e })),
      ],
      playerGold: player.gold,
      playerUnits: {
        horses: player.horses,
        hiredJockey: player.hiredJockey,
        equipment: player.equipment,
      },
    })
  }

  handleExpandStable(playerId: string): void {
    const player = this.players.get(playerId)
    if (!player) return

    const ws = this.playerSockets.get(playerId)

    // Only allow expansion during shop phase
    if (this.currentPhase !== 'shop') {
      if (ws) this.sendError(ws, 'Can only expand stable during shop phase')
      return
    }

    // Check if already at max capacity
    if (player.stableSlots >= 3) {
      if (ws) this.sendError(ws, 'Stable already at maximum capacity (3 slots)')
      return
    }

    // Calculate expansion cost: 1 Reputation for slot 2, 2 Reputation for slot 3
    const expansionCost = player.stableSlots === 1 ? 1 : 2

    // Check if player has enough Reputation
    if (player.reputation < expansionCost) {
      if (ws) this.sendError(ws, `Not enough Reputation to expand. Need ${expansionCost} Reputation.`)
      return
    }

    // Deduct Reputation and expand stable
    player.reputation -= expansionCost
    player.stableSlots += 1

    console.log(`Player ${playerId} expanded stable to ${player.stableSlots} slots for ${expansionCost} Reputation`)

    // Send updated player state
    this.sendToPlayer(playerId, {
      type: 'player_state',
      gold: player.gold,
      hearts: player.hearts,
      reputation: player.reputation,
      stableSlots: player.stableSlots,
      inventory: {
        horses: player.horses,
        hiredJockey: player.hiredJockey,
        equipment: player.equipment,
      },
      wins: player.wins,
      currentRound: this.currentRound,
    })
  }

  handleTrain(playerId: string, message: { horseId: string; stat: string }): void {
    const player = this.players.get(playerId)
    if (!player) return

    const ws = this.playerSockets.get(playerId)

    // Only allow training during shop phase
    if (this.currentPhase !== 'shop') {
      if (ws) this.sendError(ws, 'Can only train during shop phase')
      return
    }

    // Find the horse
    const horse = player.horses.find(h => h.id === message.horseId)
    if (!horse) {
      if (ws) this.sendError(ws, 'Horse not found in inventory')
      return
    }

    // Validate stat
    const stat = message.stat as 'speed' | 'stamina' | 'grit' | 'temper'
    if (!['speed', 'stamina', 'grit', 'temper'].includes(stat)) {
      if (ws) this.sendError(ws, 'Invalid stat')
      return
    }

    // Check if stat can be trained
    const currentValue = horse.stats[stat]
    const potentialValue = horse.potential[stat]

    if (currentValue >= potentialValue) {
      if (ws) this.sendError(ws, 'Stat already at maximum potential')
      return
    }

    // Calculate training cost
    const getTrainingCost = (currentStat: number) => {
      if (currentStat <= 3) return 2
      if (currentStat <= 6) return 3
      if (currentStat <= 8) return 4
      return 5
    }

    const trainingCost = getTrainingCost(currentValue)

    if (player.gold < trainingCost) {
      if (ws) this.sendError(ws, 'Not enough gold')
      return
    }

    // Deduct gold and train the stat
    player.gold -= trainingCost
    horse.stats[stat]++

    console.log(`Player ${playerId} trained ${horse.name}'s ${stat} from ${currentValue} to ${horse.stats[stat]} for ${trainingCost}g`)

    // Send updated player state
    this.sendToPlayer(playerId, {
      type: 'player_state',
      gold: player.gold,
      hearts: player.hearts,
      reputation: player.reputation,
      stableSlots: player.stableSlots,
      inventory: {
        horses: player.horses,
        hiredJockey: player.hiredJockey,
        equipment: player.equipment,
      },
      wins: player.wins,
      currentRound: this.currentRound,
    })
  }

  handleHireJockey(playerId: string, message: { jockeyId: string }): void {
    const player = this.players.get(playerId)
    if (!player) return

    const ws = this.playerSockets.get(playerId)

    // Only allow hiring during shop phase
    if (this.currentPhase !== 'shop') {
      if (ws) this.sendError(ws, 'Can only hire jockeys during shop phase')
      return
    }

    // Check if player already has a jockey
    if (player.hiredJockey) {
      if (ws) this.sendError(ws, 'Already have a jockey. Fire them first to hire another.')
      return
    }

    // Get this player's shop inventory
    const shopInventory = player.shopInventory
    if (!shopInventory) {
      if (ws) this.sendError(ws, 'Shop not available')
      return
    }

    // Find the jockey in the player's shop
    const jockey = shopInventory.jockeys.find((j: Jockey) => j.id === message.jockeyId)

    if (!jockey) {
      if (ws) this.sendError(ws, 'Jockey not found in shop')
      return
    }

    // Hiring is free - no upkeep costs
    player.hiredJockey = jockey

    // Remove from shop inventory
    const jockeyIndex = shopInventory.jockeys.findIndex((j: Jockey) => j.id === message.jockeyId)
    if (jockeyIndex !== -1) {
      shopInventory.jockeys.splice(jockeyIndex, 1)
    }

    console.log(`Player ${playerId} hired jockey ${jockey.name} (no upkeep)`)

    // Send updated player state
    this.sendToPlayer(playerId, {
      type: 'player_state',
      gold: player.gold,
      hearts: player.hearts,
      reputation: player.reputation,
      stableSlots: player.stableSlots,
      inventory: {
        horses: player.horses,
        hiredJockey: player.hiredJockey,
        equipment: player.equipment,
      },
      wins: player.wins,
      currentRound: this.currentRound,
    })

    // Send updated shop state to reflect removed jockey
    const units = [
      ...shopInventory.horses.map((h: Horse) => ({ id: h.id, type: 'horse' as const, name: h.name, cost: h.cost, data: h })),
      ...shopInventory.jockeys.map((j: Jockey) => ({ id: j.id, type: 'jockey' as const, name: j.name, cost: j.hireCost, data: j })),
      ...shopInventory.equipment.map((e: Equipment) => ({ id: e.id, type: 'equipment' as const, name: e.name, cost: e.cost, data: e })),
    ]

    this.sendToPlayer(playerId, {
      type: 'shop_state',
      units,
      playerGold: player.gold,
      playerUnits: {
        horses: player.horses,
        hiredJockey: player.hiredJockey,
        equipment: player.equipment,
      },
    })
  }

  handleFireJockey(playerId: string): void {
    const player = this.players.get(playerId)
    if (!player) return

    const ws = this.playerSockets.get(playerId)

    // Only allow firing during shop phase
    if (this.currentPhase !== 'shop') {
      if (ws) this.sendError(ws, 'Can only fire jockeys during shop phase')
      return
    }

    if (!player.hiredJockey) {
      if (ws) this.sendError(ws, 'No jockey currently hired')
      return
    }

    const jockeyName = player.hiredJockey.name
    player.hiredJockey = null

    console.log(`Player ${playerId} fired jockey ${jockeyName}`)

    // Send updated player state
    this.sendToPlayer(playerId, {
      type: 'player_state',
      gold: player.gold,
      hearts: player.hearts,
      reputation: player.reputation,
      stableSlots: player.stableSlots,
      inventory: {
        horses: player.horses,
        hiredJockey: player.hiredJockey,
        equipment: player.equipment,
      },
      wins: player.wins,
      currentRound: this.currentRound,
    })
  }

  handleSetupRaceEntry(playerId: string, message: {
    horseId: string
    jockeyId: string
    equipment: Record<string, unknown>
    strategy: Record<string, unknown>
  }): void {
    const player = this.players.get(playerId)
    if (!player) return

    // Find the full horse object from player's inventory
    const horse = player.horses.find(h => h.id === message.horseId)
    const jockey = player.hiredJockey

    if (!horse || !jockey || jockey.id !== message.jockeyId) {
      console.error(`Player ${playerId} tried to set up race entry with invalid horse or jockey`)
      return
    }

    player.raceEntry = {
      horse,
      jockey,
      equipment: message.equipment,
      strategy: message.strategy,
    }

    // Mark player as ready after submitting race entry
    player.ready = true
    this.broadcast({
      type: 'player_ready',
      playerId,
      ready: true,
    })

    console.log(`Player ${playerId} set up race entry`)

    // Check if all players are ready during preparation phase
    if (this.currentPhase === 'preparation' && this.shouldAdvancePhase()) {
      console.log(`All players ready in preparation phase, advancing to next phase`)
      if (this.phaseTimer) {
        clearTimeout(this.phaseTimer)
      }
      this.advancePhase()
    }
  }

  allPlayersHaveRaceEntries(): boolean {
    const alivePlayers = Array.from(this.players.values()).filter((p) => !p.eliminated)
    if (alivePlayers.length < 1) return false
    return alivePlayers.every((p) => p.raceEntry !== null && p.raceEntry !== undefined)
  }

  handlePlaceBet(playerId: string, message: {
    betType: string
    targetPlayerId?: string
    exactaFirst?: string
    exactaSecond?: string
    amount: number
    betForHeart?: boolean
  }): void {
    const player = this.players.get(playerId)
    if (!player) return

    const ws = this.playerSockets.get(playerId)

    // Validation: Cannot bet on your own horse
    if (message.targetPlayerId === playerId) {
      if (ws) this.sendError(ws, 'Cannot bet on your own horse')
      return
    }

    // Validation: Only one bet per round
    if (player.currentBet) {
      if (ws) this.sendError(ws, 'Already placed a bet this round')
      return
    }

    // Virtual stakes betting - no gold cost validation needed
    // Just validate heart recovery rules

    // Validation: Heart recovery bet only when hearts < max
    if (message.betForHeart && player.hearts >= 5) {
      if (ws) this.sendError(ws, 'Hearts already at maximum')
      return
    }

    // Validation: Heart recovery bet must be exacta
    if (message.betForHeart && message.betType !== 'exacta') {
      if (ws) this.sendError(ws, 'Heart recovery bet must be Exacta')
      return
    }

    // Validation: Exacta bets must have two different targets
    if (message.betType === 'exacta') {
      if (!message.exactaFirst || !message.exactaSecond) {
        if (ws) this.sendError(ws, 'Exacta bet requires two selections')
        return
      }
      if (message.exactaFirst === message.exactaSecond) {
        if (ws) this.sendError(ws, 'Exacta selections must be different')
        return
      }
      if (message.exactaFirst === playerId || message.exactaSecond === playerId) {
        if (ws) this.sendError(ws, 'Cannot include yourself in exacta bet')
        return
      }
    }

    player.currentBet = {
      type: message.betType,
      targetPlayerId: message.targetPlayerId,
      exactaFirst: message.exactaFirst,
      exactaSecond: message.exactaSecond,
      amount: message.amount,
      betForHeart: message.betForHeart,
    }

    // Virtual stakes betting - no gold cost
    // player.gold -= message.amount  // Removed: betting is now free

    // Mark player as ready after placing bet
    player.ready = true
    this.broadcast({
      type: 'player_ready',
      playerId,
      ready: true,
    })

    console.log(`Player ${playerId} placed ${message.betType} bet for ${message.amount} gold`)

    // Check if all players are ready during betting phase
    if (this.currentPhase === 'betting' && this.shouldAdvancePhase()) {
      console.log(`All players ready in betting phase, advancing to next phase`)
      if (this.phaseTimer) {
        clearTimeout(this.phaseTimer)
      }
      this.advancePhase()
    }
  }

  handleSkipBetting(playerId: string): void {
    const player = this.players.get(playerId)
    if (!player) return

    if (this.currentPhase !== 'betting') {
      console.log(`Player ${playerId} tried to skip betting outside of betting phase`)
      return
    }

    if (player.eliminated) {
      console.log(`Eliminated player ${playerId} tried to skip betting`)
      return
    }

    // Mark player as ready (without placing a bet)
    player.ready = true
    this.broadcast({
      type: 'player_ready',
      playerId,
      ready: true,
    })

    console.log(`Player ${playerId} skipped betting`)

    // Check if all players are ready during betting phase
    if (this.currentPhase === 'betting' && this.shouldAdvancePhase()) {
      console.log(`All players ready in betting phase, advancing to next phase`)
      if (this.phaseTimer) {
        clearTimeout(this.phaseTimer)
      }
      this.advancePhase()
    }
  }

  broadcast(message: Record<string, unknown>): void {
    const messageStr = JSON.stringify({ ...message, timestamp: Date.now() })
    for (const ws of this.playerSockets.values()) {
      if (ws.readyState === 1) {
        ws.send(messageStr)
      }
    }
  }

  sendToPlayer(playerId: string, message: Record<string, unknown>): void {
    const ws = this.playerSockets.get(playerId)
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ ...message, timestamp: Date.now() }))
    }
  }

  sendError(ws: WebSocket, message: string, code?: string): void {
    if (ws && ws.readyState === 1) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message,
          code,
          timestamp: Date.now(),
        })
      )
    }
  }

  broadcastLobbyState(): void {
    const players = Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.isAI ? `${p.username} 🤖` : p.username,  // Add robot emoji for AI
      ready: p.ready,
      isAI: p.isAI || false,
    }))

    this.broadcast({
      type: 'lobby_state',
      players,
      requiredPlayers: MAX_PLAYERS,
      friendCode: this.friendCode,
      isPrivate: this.isPrivate,
    })
  }
}
