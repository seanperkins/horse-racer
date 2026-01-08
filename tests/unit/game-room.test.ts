import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameRoom } from '@/server/GameRoom'
import type { Horse, Jockey } from '@/types/game'

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}))

// Mock WebSocketServer and WebSocket
const mockWss = {} as any
const mockWs = {
  send: vi.fn(),
  readyState: 1,
} as any

describe('GameRoom', () => {
  let room: GameRoom

  beforeEach(() => {
    room = new GameRoom('test-room', mockWss)
    vi.clearAllMocks()
  })

  describe('AI Horse Generation', () => {
    it('should fill race with AI horses when not enough players', () => {
      // Add only 2 players with race entries
      room.addPlayer('player1', 'Player 1', mockWs)
      room.addPlayer('player2', 'Player 2', mockWs)

      // Give them horses and jockeys
      const player1 = room.players.get('player1')!
      const player2 = room.players.get('player2')!

      const testHorse: Horse = {
        id: 'h1',
        name: 'Test Horse',
        tier: 2,
        bloodline: 'Iron Heart',
        stats: { speed: 7, stamina: 6, grit: 5, temper: 4 },
        potential: { speed: 9, stamina: 8, grit: 7, temper: 6 },
        cost: 3,
      }

      const testJockey: Jockey = {
        id: 'j1',
        name: 'Test Jockey',
        stats: { skill: 6, timing: 5, weight: 5 },
        hireCost: 3,
        upkeepCost: 1,
      }

      player1.horses = [testHorse]
      player1.hiredJockey = testJockey
      player1.raceEntry = {
        horse: testHorse,
        jockey: testJockey,
        equipment: {},
        strategy: {},
      }

      player2.horses = [testHorse]
      player2.hiredJockey = testJockey
      player2.raceEntry = {
        horse: testHorse,
        jockey: testJockey,
        equipment: {},
        strategy: {},
      }

      const entries = room.getRaceEntries()

      // Should have 8 total entries (2 players + 6 AI)
      expect(entries).toHaveLength(8)

      // First 2 should be real players
      expect(entries[0].playerId).toBe('player1')
      expect(entries[1].playerId).toBe('player2')

      // Remaining 6 should be AI
      for (let i = 2; i < 8; i++) {
        expect(entries[i].playerId).toMatch(/^ai-player-\d+$/)
        expect(entries[i].playerName).toMatch(/^AI Racer \d+$/)
        expect(entries[i].horse).toBeDefined()
        expect(entries[i].jockey).toBeDefined()
      }
    })

    it('should not add AI horses when 8 players have entries', () => {
      // Add 8 players with race entries
      for (let i = 1; i <= 8; i++) {
        room.addPlayer(`player${i}`, `Player ${i}`, mockWs)
        const player = room.players.get(`player${i}`)!

        const horse: Horse = {
          id: `h${i}`,
          name: `Horse ${i}`,
          tier: 2,
          bloodline: 'Iron Heart',
          stats: { speed: 7, stamina: 6, grit: 5, temper: 4 },
          potential: { speed: 9, stamina: 8, grit: 7, temper: 6 },
          cost: 3,
        }

        const jockey: Jockey = {
          id: `j${i}`,
          name: `Jockey ${i}`,
          stats: { skill: 6, timing: 5, weight: 5 },
          hireCost: 3,
          upkeepCost: 1,
        }

        player.horses = [horse]
        player.hiredJockey = jockey
        player.raceEntry = {
          horse,
          jockey,
          equipment: {},
          strategy: {},
        }
      }

      const entries = room.getRaceEntries()

      // Should have exactly 8 entries, all real players
      expect(entries).toHaveLength(8)
      expect(entries.every(e => e.playerId.startsWith('player'))).toBe(true)
    })
  })

  describe('Race Entry Storage', () => {
    it('should store full horse and jockey objects, not just IDs', () => {
      room.addPlayer('player1', 'Player 1', mockWs)
      const player = room.players.get('player1')!

      const horse: Horse = {
        id: 'horse1',
        name: 'Thunder',
        tier: 3,
        bloodline: 'Northern Storm',
        stats: { speed: 8, stamina: 7, grit: 6, temper: 5 },
        potential: { speed: 10, stamina: 9, grit: 8, temper: 7 },
        cost: 9,
      }

      const jockey: Jockey = {
        id: 'jockey1',
        name: 'Alex',
        stats: { skill: 8, timing: 7, weight: 4 },
        trait: 'Front-Runner',
        hireCost: 4,
        upkeepCost: 2,
      }

      player.horses = [horse]
      player.hiredJockey = jockey

      room.handleSetupRaceEntry('player1', {
        horseId: 'horse1',
        jockeyId: 'jockey1',
        equipment: {},
        strategy: {},
      })

      // Check that full objects are stored
      expect(player.raceEntry?.horse).toEqual(horse)
      expect(player.raceEntry?.jockey).toEqual(jockey)

      // Verify it has all the stats, not just IDs
      expect(player.raceEntry?.horse.stats.speed).toBe(8)
      expect(player.raceEntry?.jockey.stats.skill).toBe(8)
      expect(player.raceEntry?.jockey.trait).toBe('Front-Runner')
    })
  })

  describe('Place Bet Payouts', () => {
    it('should pay out place bets for top 3 finishers', () => {
      // Add 3 players
      for (let i = 1; i <= 3; i++) {
        room.addPlayer(`player${i}`, `Player ${i}`, mockWs)
        const player = room.players.get(`player${i}`)!
        player.gold = 100
      }

      // Player 1 bets on player 3 to place
      const player1 = room.players.get('player1')!
      player1.currentBet = {
        type: 'place',
        targetPlayerId: 'player3',
        amount: 10,
        betForHeart: false,
      }

      // Set up odds
      room.lastBettingOdds.set('player3', { win: 3, place: 1.8 })

      // Simulate race results - player3 comes in 3rd
      const placements = [
        { playerId: 'player1', position: 1 },
        { playerId: 'player2', position: 2 },
        { playerId: 'player3', position: 3 },
      ]

      const betResults = room.calculateBetResults(placements)

      // Player 1's bet should win (player3 placed in top 3)
      const player1Bet = betResults.find(r => r.playerId === 'player1')
      expect(player1Bet?.won).toBe(true)
      expect(player1Bet?.payout).toBe(18) // 10 * 1.8
    })

    it('should not pay out place bets for 4th place or lower', () => {
      room.addPlayer('player1', 'Player 1', mockWs)
      const player1 = room.players.get('player1')!
      player1.currentBet = {
        type: 'place',
        targetPlayerId: 'player4',
        amount: 10,
        betForHeart: false,
      }

      room.lastBettingOdds.set('player4', { win: 3, place: 1.8 })

      const placements = [
        { playerId: 'player1', position: 1 },
        { playerId: 'player2', position: 2 },
        { playerId: 'player3', position: 3 },
        { playerId: 'player4', position: 4 },
      ]

      const betResults = room.calculateBetResults(placements)
      const player1Bet = betResults.find(r => r.playerId === 'player1')

      expect(player1Bet?.won).toBe(false)
      expect(player1Bet?.payout).toBe(0)
    })
  })

  describe('Track Generation', () => {
    it('should generate different track for each round', () => {
      room.currentRound = 1
      room.setupPreparationPhase()
      const track1 = room.currentTrack

      room.currentRound = 2
      room.setupPreparationPhase()
      const track2 = room.currentTrack

      expect(track1).not.toBeNull()
      expect(track2).not.toBeNull()
      expect(track1?.id).not.toBe(track2?.id)
    })

    it('should rotate through track categories', () => {
      const categories = new Set<string>()

      // Run through multiple rounds
      for (let round = 1; round <= 4; round++) {
        room.currentRound = round
        room.setupPreparationPhase()
        if (room.currentTrack) {
          categories.add(room.currentTrack.category)
        }
      }

      // Should have different categories
      expect(categories.size).toBeGreaterThan(1)
    })

    it('should include surface conditions', () => {
      room.currentRound = 1
      room.setupPreparationPhase()

      expect(room.currentTrack).not.toBeNull()
      expect(room.currentTrack?.surface).toBeDefined()
      expect(['dry_dirt', 'wet_muddy', 'turf_grass', 'rocky', 'sand', 'frozen']).toContain(
        room.currentTrack?.surface
      )
    })
  })

  describe('Equipment Slot Unlocks', () => {
    it('charges escalating reputation when unlocking slots', () => {
      room.addPlayer('player1', 'Player 1', mockWs)
      room.currentPhase = 'shop'

      const player = room.players.get('player1')!
      player.reputation = 3

      mockWs.send.mockClear()

      room.handleUnlockEquipmentSlot('player1', { slot: 'saddle' })
      expect(player.reputation).toBe(2)
      expect(player.unlockedEquipmentSlots).toEqual(['saddle'])

      room.handleUnlockEquipmentSlot('player1', { slot: 'horseshoes' })
      expect(player.reputation).toBe(0)
      expect(player.unlockedEquipmentSlots).toEqual(['saddle', 'horseshoes'])
    })

    it('rejects unlocks when reputation is below the next cost', () => {
      room.addPlayer('player1', 'Player 1', mockWs)
      room.currentPhase = 'shop'

      const player = room.players.get('player1')!
      player.unlockedEquipmentSlots = ['saddle', 'horseshoes']
      player.reputation = 2

      mockWs.send.mockClear()

      room.handleUnlockEquipmentSlot('player1', { slot: 'blinders' })

      expect(player.unlockedEquipmentSlots).toEqual(['saddle', 'horseshoes'])

      const lastMessage = JSON.parse(mockWs.send.mock.calls.at(-1)![0])
      expect(lastMessage.type).toBe('error')
      expect(lastMessage.message).toMatch(/Need 3 Reputation/i)
    })

    it('rejects equipment purchase for locked slots', () => {
      room.addPlayer('player1', 'Player 1', mockWs)
      room.currentPhase = 'shop'

      const player = room.players.get('player1')!
      player.gold = 10
      player.unlockedEquipmentSlots = [] // No slots unlocked

      // Add equipment to shop inventory
      player.shopInventory = {
        horses: [],
        jockeys: [],
        equipment: [
          { id: 'test-saddle', name: 'Test Saddle', slot: 'saddle', cost: 2, effects: {} },
        ],
      }

      mockWs.send.mockClear()

      room.handlePurchase('player1', { unitType: 'equipment', unitId: 'test-saddle' })

      // Should not have purchased
      expect(player.equipment.length).toBe(0)
      expect(player.gold).toBe(10)

      const lastMessage = JSON.parse(mockWs.send.mock.calls.at(-1)![0])
      expect(lastMessage.type).toBe('error')
      expect(lastMessage.message).toMatch(/locked/i)
    })

    it('allows equipment purchase for unlocked slots', () => {
      room.addPlayer('player1', 'Player 1', mockWs)
      room.currentPhase = 'shop'

      const player = room.players.get('player1')!
      player.gold = 10
      player.unlockedEquipmentSlots = ['saddle'] // Saddle slot unlocked

      // Add equipment to shop inventory
      player.shopInventory = {
        horses: [],
        jockeys: [],
        equipment: [
          { id: 'test-saddle', name: 'Test Saddle', slot: 'saddle', cost: 2, effects: {} },
        ],
      }

      mockWs.send.mockClear()

      room.handlePurchase('player1', { unitType: 'equipment', unitId: 'test-saddle' })

      // Should have purchased
      expect(player.equipment.length).toBe(1)
      expect(player.gold).toBe(8)
    })
  })
})
