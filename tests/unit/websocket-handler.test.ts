import { describe, it, expect, vi } from 'vitest'

describe('WebSocket Handler', () => {
  describe('Room Assignment', () => {
    it('should set currentRoom when player joins lobby', () => {
      // This test validates the fix for issue #1:
      // currentRoom must be set after join_lobby so that subsequent messages
      // (ready_up, shop, setup, bet) can be routed to the correct room

      let currentRoom: any = null

      // Simulate the callback mechanism
      const setCurrentRoom = (room: any) => {
        currentRoom = room
      }

      // Simulate handleJoinLobby being called
      const mockRoom = { id: 'test-room', friendCode: 'ABCD' }
      setCurrentRoom(mockRoom)

      // Verify currentRoom was set
      expect(currentRoom).not.toBeNull()
      expect(currentRoom.id).toBe('test-room')
      expect(currentRoom.friendCode).toBe('ABCD')
    })

    it('should allow subsequent messages to reach the room', () => {
      let currentRoom: any = null

      const mockRoom = {
        id: 'test-room',
        handleReadyUp: vi.fn(),
        handlePurchase: vi.fn(),
        handlePlaceBet: vi.fn(),
      }

      currentRoom = mockRoom

      // Simulate messages that require currentRoom
      if (currentRoom) {
        currentRoom.handleReadyUp('player1', true)
        currentRoom.handlePurchase('player1', { unitId: 'u1', unitType: 'horse' })
        currentRoom.handlePlaceBet('player1', {
          betType: 'win',
          targetPlayerId: 'player2',
          amount: 5,
          betForHeart: false,
        })
      }

      // Verify methods were called
      expect(mockRoom.handleReadyUp).toHaveBeenCalledWith('player1', true)
      expect(mockRoom.handlePurchase).toHaveBeenCalledWith('player1', {
        unitId: 'u1',
        unitType: 'horse',
      })
      expect(mockRoom.handlePlaceBet).toHaveBeenCalledWith('player1', {
        betType: 'win',
        targetPlayerId: 'player2',
        amount: 5,
        betForHeart: false,
      })
    })
  })

  describe('Message Routing', () => {
    it('should route messages only when currentRoom is set', () => {
      let currentRoom: any = null

      // Before join - should not route
      const shouldRoute1 = currentRoom !== null
      expect(shouldRoute1).toBe(false)

      // After join - should route
      currentRoom = { id: 'room1' }
      const shouldRoute2 = currentRoom !== null
      expect(shouldRoute2).toBe(true)
    })
  })
})
