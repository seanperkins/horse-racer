// @ts-nocheck
import type { WebSocketServer, WebSocket } from 'ws'
import type { GamePhase, Player, Horse, Jockey, Equipment, Track } from '@/types/game'
import { RaceSimulator } from '@/game/simulation/RaceSimulator'
import {
  calculatePowerRating,
  calculateWinProbability,
  calculateBloodlineBonuses,
} from '@/game/stats'
import { generateShopInventory } from '@/game/shop'
import { generateTrackForRound } from '@/game/tracks'
import { generateAIRaceEntry } from '@/game/ai-horses'

const MAX_PLAYERS = 8
const HOUSE_EDGE = 0.95
const WIN_ODDS_CAP = 8
const PLACE_ODDS_CAP = 3
const EXACTA_ODDS_CAP = 60
const PHASE_DURATIONS: Record<GamePhase, number> = {
  lobby: 0,
  shop: 45,
  preparation: 30,
  betting: 20,
  race: 70, // Increased to allow for full race completion (max 60s + 2s buffer + safety margin)
  results: 60, // Increased to allow players to review results and ready up
}

interface PlayerData extends Player {
  ready: boolean
  raceEntry?: {
    horse: Horse
    jockey: Jockey
    equipment: Record<string, unknown>
    strategy: Record<string, unknown>
  }
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
  lastBettingOdds: Map<string, { win: number; place: number }>
  lastBettingStrengths: Map<string, number>
  lastBettingTotalStrength: number
  currentTrack: Track | null
  createdAt: number
  lastActivityAt: number

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
    this.lastBettingOdds = new Map()
    this.lastBettingStrengths = new Map()
    this.lastBettingTotalStrength = 0
    this.currentTrack = null
    this.createdAt = Date.now()
    this.lastActivityAt = Date.now()
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
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId)
    this.playerSockets.delete(playerId)

    if (this.gameStarted && this.players.size === 1) {
      this.endGame()
    }

    this.broadcastLobbyState()
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
              const bloodlineBonuses = calculateBloodlineBonuses(entry.horse)
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
        // Send race inputs if available
        if (this.lastRaceSeed && this.currentTrack) {
          const entries = Array.from(this.players.values())
            .filter((p) => p.raceEntry)
            .map((p) => {
              const entry = p.raceEntry!
              return {
                playerId: p.id,
                playerName: p.username,
                horse: entry.horse,
                jockey: entry.jockey,
                equipment: entry.equipment,
                strategy: entry.strategy,
              }
            })

          this.sendToPlayer(playerId, {
            type: 'race_inputs',
            entries,
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

  startGame(): void {
    console.log(`Starting game in room ${this.roomId}`)
    this.gameStarted = true
    this.currentRound = 1
    this.startPhase('shop')
  }

  startPhase(phase: GamePhase): void {
    this.currentPhase = phase
    const duration = PHASE_DURATIONS[phase] || 30

    console.log(`Room ${this.roomId}: Starting ${phase} phase (${duration}s)`)

    // Reset ready state when starting shop or results phase
    if (phase === 'shop' || phase === 'results') {
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

    this.phaseTimer = setTimeout(() => {
      this.advancePhase()
    }, duration * 1000)
  }

  advancePhase(): void {
    const phaseOrder: GamePhase[] = ['shop', 'preparation', 'betting', 'race', 'results']
    const currentIndex = phaseOrder.indexOf(this.currentPhase)

    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
      this.currentRound++

      const alivePlayers = Array.from(this.players.values()).filter((p) => !p.eliminated)

      if (alivePlayers.length === 1) {
        this.endGame(alivePlayers[0])
        return
      }

      this.startPhase('shop')
    } else {
      this.startPhase(phaseOrder[currentIndex + 1])
    }
  }

  setupShopPhase(): void {
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
  }

  setupPreparationPhase(): void {
    // Generate track for this round
    this.currentTrack = generateTrackForRound(this.currentRound)

    this.broadcast({
      type: 'track_info',
      track: this.currentTrack,
    })
  }

  setupBettingPhase(): void {
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
  }

  runRace(): void {
    const entries = this.getRaceEntries()
    this.lastRaceSeed = `race-${this.roomId}-${this.currentRound}`

    const raceInputs = {
      type: 'race_inputs',
      entries,
      track: this.currentTrack || generateTrackForRound(this.currentRound),
      seed: this.lastRaceSeed,
    }

    this.broadcast(raceInputs)

    // Run the race simulation to determine actual duration
    const track = this.currentTrack || generateTrackForRound(this.currentRound)
    const seed = this.lastRaceSeed

    const simulator = new RaceSimulator({
      track,
      participants: entries.map(entry => {
        const player = this.players.get(entry.playerId)
        const playerStable = player?.horses || []
        const bloodlineBonuses = calculateBloodlineBonuses(
          entry.horse,
          playerStable,
          track.surface,
        )

        return {
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
          bloodlineBonuses,
        }
      }),
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
    // Get race entries (participants with valid race setups)
    const entries = this.getRaceEntries()

    // Run the actual race simulation
    const seed = this.lastRaceSeed || `race-${this.roomId}-${this.currentRound}`
    const track = this.currentTrack || generateTrackForRound(this.currentRound)

    const simulator = new RaceSimulator({
      track,
      participants: entries.map(entry => {
        // Get player's full stable for bloodline bonus calculation
        const player = this.players.get(entry.playerId)
        const playerStable = player?.horses || []
        const playerName = player?.username || entry.playerName

        // Calculate bloodline bonuses based on stable composition
        const bloodlineBonuses = calculateBloodlineBonuses(
          entry.horse,
          playerStable,
          track.surface,
        )

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
          bloodlineBonuses,
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

    // Only apply race rewards to real players, not AI horses
    for (const placement of placements) {
      const player = this.players.get(placement.playerId)
      if (!player) continue // Skip AI horses

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
  }

  showResults(): void {
    // Results already shown
  }

  endGame(winner?: PlayerData): void {
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

    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
    }

    this.gameStarted = false
  }

  getRaceEntries(): Array<{
    playerId: string
    playerName: string
    horse: Horse
    jockey: Jockey
    equipment: Record<string, unknown>
    strategy: Record<string, unknown>
  }> {
    const playerEntries = Array.from(this.players.values())
      .filter((p) => !p.eliminated && p.raceEntry)
      .map((p) => ({
        playerId: p.id,
        playerName: p.username,
        horse: p.raceEntry!.horse,
        jockey: p.raceEntry!.jockey,
        equipment: p.raceEntry!.equipment,
        strategy: p.raceEntry!.strategy,
      }))

    // Fill remaining slots with AI horses to reach 8 total
    const aiEntriesNeeded = Math.max(0, MAX_PLAYERS - playerEntries.length)
    const aiEntries = Array.from({ length: aiEntriesNeeded }, (_, i) =>
      generateAIRaceEntry(i + 1)
    )

    return [...playerEntries, ...aiEntries]
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
      unit = shopInventory.jockeys.find((j: Jockey) => j.id === message.unitId)
    } else if (unitType === 'equipment') {
      unit = shopInventory.equipment.find((e: Equipment) => e.id === message.unitId)
    }

    if (!unit) {
      if (ws) this.sendError(ws, 'Unit not found in shop')
      return
    }

    // Check if player can afford it
    if (player.gold < unit.cost) {
      if (ws) this.sendError(ws, 'Not enough gold')
      return
    }

    // Deduct gold and add unit to player's inventory
    player.gold -= unit.cost

    if (unitType === 'horse') {
      player.horses.push(unit)
    } else if (unitType === 'equipment') {
      player.equipment.push(unit)
    }
    // Note: Jockeys are hired through the hire_jockey message, not purchase_unit

    console.log(`Player ${playerId} purchased ${message.unitType}: ${unit.name} for ${unit.cost}g`)

    // Send updated player state
    this.sendToPlayer(playerId, {
      type: 'player_state',
      gold: player.gold,
      hearts: player.hearts,
      inventory: {
        horses: player.horses,
        hiredJockey: player.hiredJockey,
        equipment: player.equipment,
      },
      wins: player.wins,
      currentRound: this.currentRound,
    })
  }

  handleSell(playerId: string, message: { unitId: string }): void {
    const player = this.players.get(playerId)
    if (!player) return

    const ws = this.playerSockets.get(playerId)

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

    console.log(`Player ${playerId} hired jockey ${jockey.name} for ${jockey.hireCost}g (${jockey.upkeepCost}g/round upkeep)`)

    // Send updated player state
    this.sendToPlayer(playerId, {
      type: 'player_state',
      gold: player.gold,
      hearts: player.hearts,
      inventory: {
        horses: player.horses,
        hiredJockey: player.hiredJockey,
        equipment: player.equipment,
      },
      wins: player.wins,
      currentRound: this.currentRound,
    })
  }

  handleFireJockey(playerId: string): void {
    const player = this.players.get(playerId)
    if (!player) return

    const ws = this.playerSockets.get(playerId)

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

    console.log(`Player ${playerId} set up race entry`)

    // Check if all players have set up their race entries during preparation phase
    if (this.currentPhase === 'preparation' && this.allPlayersHaveRaceEntries()) {
      console.log(`All players have submitted race entries, advancing from preparation phase`)
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

    console.log(`Player ${playerId} placed ${message.betType} bet for ${message.amount} gold`)
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
      name: p.username,
      ready: p.ready,
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
