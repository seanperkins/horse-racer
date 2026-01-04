import type { WebSocketServer, WebSocket } from 'ws'
import type { Player, Horse, Jockey, Equipment, Track } from '@/types/game'
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
  prestige: number  // Economy currency for progression
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
    return this.players.size < MAX_PLAYERS && !this.gameStarted
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
      prestige: 0,
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
        prestige: 0,
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
          prestige: 0,
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

    // Try to hire cheapest jockey if don't have one or can afford better
    if (!player.hiredJockey) {
      const affordableJockeys = shopInventory.jockeys
        .filter(j => j.hireCost <= player.gold)
        .sort((a, b) => a.hireCost - b.hireCost)

      if (affordableJockeys.length > 0) {
        const jockey = affordableJockeys[0]
        player.gold -= jockey.hireCost
        player.hiredJockey = jockey
        shopInventory.jockeys = shopInventory.jockeys.filter(j => j.id !== jockey.id)
        console.log(`${player.username} hired ${jockey.name} for ${jockey.hireCost}g`)
      }
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

    // Send current game phase
    this.sendToPlayer(playerId, {
      type: 'game_phase',
      phase: this.currentPhase,
      duration: PHASE_DURATIONS[this.currentPhase],
      round: this.currentRound,
    })

    // Send player state
    this.sendToPlayer(playerId, {
      type: 'player_state',
      gold: player.gold,
      hearts: player.hearts,
      prestige: player.prestige,
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
        }
        break

      case 'race':
        // Send race inputs if available - use stored entries to ensure consistency
        if (this.lastRaceSeed && this.currentTrack && this.lastRaceEntries) {
          this.sendToPlayer(playerId, {
            type: 'race_inputs',
            entries: this.lastRaceEntries,
            track: this.currentTrack,
            seed: this.lastRaceSeed,
          })
        }
        break

      case 'results':
        // Results will be shown when the race completes
        // For now, just ensure player is in the right phase
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
    const alivePlayers = Array.from(this.players.values()).filter((p) => !p.eliminated)
    const isSinglePlayer = alivePlayers.length === 1

    console.log(`Room ${this.roomId}: Starting ${phase} phase (${duration}s)${isSinglePlayer ? ' - single player mode' : ''}`)

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
        this.showResults()
        break
    }

    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
    }

    // Single player mode: skip timer for most phases, wait for ready
    // Race phase still uses timer as it's automatic
    if (!isSinglePlayer || phase === 'race') {
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

      // Game ends when only one participant remains (AI or real player)
      if (alivePlayers.length === 1) {
        this.endGame(alivePlayers[0])
        return
      }

      // Game ends if all players are eliminated
      if (alivePlayers.length === 0) {
        this.endGame()
        return
      }

      this.startPhase('shop')
    } else {
      this.startPhase(phaseOrder[currentIndex + 1])
    }
  }

  setupShopPhase(): void {
    // Generate track for this round so players can see what's coming
    this.currentTrack = generateTrackForRound(this.currentRound)

    // Broadcast track info to all players
    this.broadcast({
      type: 'track_info',
      track: this.currentTrack,
    })

    // Deduct jockey upkeep at start of each round (except round 1)
    if (this.currentRound > 1) {
      for (const [playerId, player] of this.players) {
        if (player.hiredJockey && !player.eliminated) {
          const upkeep = player.hiredJockey.upkeepCost
          player.gold -= upkeep
          console.log(`Player ${playerId} paid ${upkeep}g upkeep for jockey ${player.hiredJockey.name}`)

          // If player can't afford upkeep, fire the jockey automatically
          if (player.gold < 0) {
            console.log(`Player ${playerId} can't afford upkeep - firing jockey ${player.hiredJockey.name}`)
            player.hiredJockey = null
            player.gold += upkeep // Refund the upkeep we just deducted
          }
        }
      }
    }

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

    const raceInputs = {
      type: 'race_inputs',
      entries: entriesWithBonuses,
      track,
      seed: this.lastRaceSeed,
    }

    console.log('Broadcasting race inputs with seed:', this.lastRaceSeed)
    console.log('Entries with bloodline bonuses:', entriesWithBonuses.map(e => ({
      name: e.playerName,
      bloodlineBonuses: e.bloodlineBonuses
    })))

    this.broadcast(raceInputs)

    // Run the race simulation to determine actual duration
    const seed = this.lastRaceSeed

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

    // Run simulation to get actual duration
    const outcome = simulator.simulate()

    // Calculate the actual race duration in milliseconds
    // All horses finish when the last horse crosses the line
    const maxFinishTime = Math.max(...outcome.placements.map(p => p.finishTime))

    // Add a small buffer (2 seconds) for results processing
    const raceDuration = maxFinishTime + 2000

    console.log(`Race will complete in ${(raceDuration / 1000).toFixed(2)} seconds (last horse finishes at ${(maxFinishTime / 1000).toFixed(2)}s)`)

    setTimeout(() => {
      this.processRaceResults()
    }, raceDuration)
  }

  processRaceResults(): void {
    // Use the stored race entries with bloodline bonuses (same as sent to clients)
    const entries = this.lastRaceEntries || this.getRaceEntries()

    // Run the actual race simulation
    const seed = this.lastRaceSeed || `race-${this.roomId}-${this.currentRound}`
    const track = this.currentTrack || generateTrackForRound(this.currentRound)

    console.log('Server simulation - Processing results with seed:', seed)

    const simulator = new RaceSimulator({
      track,
      participants: entries.map(entry => {
        const player = this.players.get(entry.playerId)
        const playerName = player?.username || entry.playerName

        // Calculate derived stats (note: RaceSimulator will recalculate with bloodline bonuses)
        const derivedStats = {
          baseSpeed: 0,
          staminaPool: 0,
          burnRate: 0,
          terrainMod: 0,
          efficiency: 0,
          consistency: { variance: 0, isStable: true },
        }

        return {
          playerId: entry.playerId,
          playerName,
          horse: entry.horse,
          jockey: entry.jockey,
          equipment: entry.equipment as any || {},
          strategy: entry.strategy as any || { start: 'steady', mid: 'react', finish: 'maintain' },
          derivedStats,
          bloodlineBonuses: entry.bloodlineBonuses,
        }
      }),
      seed,
    })

    const raceOutcome = simulator.simulate()

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
      player.hearts -= placement.heartsDamage

      if (player.hearts <= 0) {
        player.eliminated = true
        player.placement = this.getEliminationPlacement()
      }
    }

    // Apply bet winnings/losses
    for (const betResult of betResults) {
      const player = this.players.get(betResult.playerId)!
      if (betResult.won) {
        if (betResult.isHeartBet) {
          player.hearts = Math.min(player.hearts + 1, 5)
        } else {
          player.gold += betResult.payout || 0
        }
        player.betWins += 1
      }
      // Clear current bet after processing
      player.currentBet = undefined
    }

    this.broadcast({
      type: 'race_results',
      placements,
      betResults,
      eliminatedPlayers: Array.from(this.players.values())
        .filter((p) => p.eliminated)
        .map((p) => p.id),
      events: raceOutcome.events,
    })

    // AI players auto-ready for next round
    for (const [playerId, player] of this.players) {
      if (player.isAI && !player.eliminated) {
        player.ready = true
      }
    }
  }

  showResults(): void {
    // Results already shown
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
    isHeartBet: boolean
  }> {
    const results: Array<{ playerId: string; won: boolean; payout?: number; isHeartBet: boolean }> = []

    for (const [playerId, player] of this.players) {
      if (!player.currentBet) continue

      const bet = player.currentBet
      let won = false
      let payoutMultiplier = 0

      // Get top 3 finishers
      const winner = placements.find(p => p.position === 1)
      const runnerUp = placements.find(p => p.position === 2)
      const thirdPlace = placements.find(p => p.position === 3)
      const odds = this.lastBettingOdds.get(bet.targetPlayerId || '') || { win: 2, place: 1.5 }

      switch (bet.type) {
        case 'win':
          // Bet on a specific horse to win
          won = bet.targetPlayerId === winner?.playerId
          if (won) {
            payoutMultiplier = odds.win
          }
          break

        case 'place':
          // Bet on a specific horse to place (1st, 2nd, or 3rd)
          won = bet.targetPlayerId === winner?.playerId ||
                bet.targetPlayerId === runnerUp?.playerId ||
                bet.targetPlayerId === thirdPlace?.playerId
          if (won) {
            payoutMultiplier = odds.place
          }
          break

        case 'exacta':
          // Bet on exact 1st and 2nd place finishers
          won = bet.exactaFirst === winner?.playerId && bet.exactaSecond === runnerUp?.playerId
          if (won) {
            const exactaProbability = this.calculateExactaProbability(bet.exactaFirst, bet.exactaSecond)
            if (exactaProbability > 0) {
              payoutMultiplier = this.calculateOddsFromProbability(exactaProbability, EXACTA_ODDS_CAP)
            } else {
              payoutMultiplier = 10
            }
          }
          break
      }

      results.push({
        playerId,
        won,
        payout: won && !bet.betForHeart ? Math.floor(bet.amount * payoutMultiplier) : 0,
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
    if (this.currentRound < 5) {
      if (position <= 5) return 0
      if (position <= 7) return 1
      return 2
    } else {
      if (position <= 3) return 0
      if (position <= 5) return 1
      if (position === 6) return 2
      if (position === 7) return 2
      return 3
    }
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
      prestige: player.prestige,
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
      prestige: player.prestige,
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
      prestige: player.prestige,
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

    // Check if player can afford it
    if (player.gold < jockey.hireCost) {
      if (ws) this.sendError(ws, 'Not enough gold to hire jockey')
      return
    }

    // Deduct gold and hire jockey
    player.gold -= jockey.hireCost
    player.hiredJockey = jockey

    // Remove from shop inventory
    const jockeyIndex = shopInventory.jockeys.findIndex((j: Jockey) => j.id === message.jockeyId)
    if (jockeyIndex !== -1) {
      shopInventory.jockeys.splice(jockeyIndex, 1)
    }

    console.log(`Player ${playerId} hired jockey ${jockey.name} for ${jockey.hireCost}g (${jockey.upkeepCost}g/round upkeep)`)

    // Send updated player state
    this.sendToPlayer(playerId, {
      type: 'player_state',
      gold: player.gold,
      hearts: player.hearts,
      prestige: player.prestige,
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
      prestige: player.prestige,
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

    // Validation: Bet amount limits (min 1, max 10 or remaining gold)
    if (message.amount < 1) {
      if (ws) this.sendError(ws, 'Minimum bet is 1 gold')
      return
    }

    const maxBet = Math.min(10, player.gold)
    if (message.amount > maxBet) {
      if (ws) this.sendError(ws, `Maximum bet is ${maxBet} gold`)
      return
    }

    if (player.gold < message.amount) {
      if (ws) this.sendError(ws, 'Not enough gold')
      return
    }

    // Validation: Heart recovery bet only when hearts < max
    if (message.betForHeart && player.hearts >= 5) {
      if (ws) this.sendError(ws, 'Hearts already at maximum')
      return
    }

    // Validation: Heart recovery bet must be exacta and minimum 5 gold
    if (message.betForHeart && message.betType !== 'exacta') {
      if (ws) this.sendError(ws, 'Heart recovery bet must be Exacta')
      return
    }

    if (message.betForHeart && message.amount < 5) {
      if (ws) this.sendError(ws, 'Heart recovery bet requires at least 5 gold')
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

    player.gold -= message.amount

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
