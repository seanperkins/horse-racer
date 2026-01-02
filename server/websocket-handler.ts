import type { WebSocketServer, WebSocket } from 'ws'
import { ClientMessageSchema } from '@/types/messages'
import type { ClientMessage } from '@/types/messages'
import { GameRoom } from './GameRoom'

// Store active game rooms
const gameRooms = new Map<string, GameRoom>()

// Store player connections
const playerConnections = new Map<string, WebSocket>()

export function setupWebSocketServer(wss: WebSocketServer): void {
  console.log('WebSocket server initialized')

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection')

    let playerId: string | null = null
    let currentRoom: GameRoom | null = null

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString())

        // Validate message against schema
        const validatedMessage = ClientMessageSchema.parse(message) as ClientMessage

        // Handle different message types
        switch (validatedMessage.type) {
          case 'join_lobby':
            playerId = validatedMessage.userId
            console.log(`🔑 Setting playerId to: ${playerId}`)
            playerConnections.set(playerId, ws)
            handleJoinLobby(ws, validatedMessage, wss, playerId, (room) => {
              currentRoom = room
              console.log(`📍 Set currentRoom to: ${room.roomId} for player ${playerId}`)
            })
            break

          case 'ready_up':
            console.log(`📨 Received ready_up from ${validatedMessage.userId}: ${validatedMessage.ready}, currentRoom: ${currentRoom?.roomId || 'none'}`)
            // If currentRoom is null, try to find the room by player ID
            const roomForReady = currentRoom || findRoomByPlayerId(validatedMessage.userId)
            if (roomForReady) {
              roomForReady.handleReadyUp(validatedMessage.userId, validatedMessage.ready)
              // Update currentRoom reference for future messages
              if (!currentRoom) {
                currentRoom = roomForReady
                console.log(`📍 Restored currentRoom to: ${roomForReady.roomId} for player ${validatedMessage.userId}`)
              }
            } else {
              console.error(`❌ ready_up failed: No room found for player ${validatedMessage.userId}`)
            }
            break

          case 'purchase_unit':
            if (currentRoom) {
              currentRoom.handlePurchase(playerId!, validatedMessage)
            }
            break

          case 'sell_unit':
            if (currentRoom) {
              currentRoom.handleSell(playerId!, validatedMessage)
            }
            break

          case 'reroll_shop':
            if (currentRoom) {
              currentRoom.handleReroll(playerId!)
            }
            break

          case 'train_horse':
            if (currentRoom) {
              currentRoom.handleTrain(playerId!, validatedMessage)
            }
            break

          case 'hire_jockey':
            if (currentRoom) {
              currentRoom.handleHireJockey(playerId!, validatedMessage)
            }
            break

          case 'fire_jockey':
            if (currentRoom) {
              currentRoom.handleFireJockey(playerId!)
            }
            break

          case 'setup_race_entry':
            if (currentRoom) {
              currentRoom.handleSetupRaceEntry(playerId!, validatedMessage)
            }
            break

          case 'place_bet':
            if (currentRoom) {
              currentRoom.handlePlaceBet(playerId!, validatedMessage)
            }
            break

          default:
            sendError(ws, `Unknown message type: ${(validatedMessage as any).type}`)
        }
      } catch (error) {
        console.error('Error processing message:', error)
        sendError(ws, error instanceof Error ? error.message : 'Unknown error')
      }
    })

    ws.on('close', () => {
      console.log(`WebSocket connection closed for player ${playerId || 'unknown'}`)
      if (playerId) {
        playerConnections.delete(playerId)

        // Don't immediately remove player - give them a grace period to reconnect
        // The player data stays in the room, only the socket connection is cleared
        // Room cleanup will handle removing empty rooms after 60 seconds
      }
    })

    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
    })

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'Connected to Thunder Hooves server',
        timestamp: Date.now(),
      })
    )
  })
}

function handleJoinLobby(
  ws: WebSocket,
  message: Extract<ClientMessage, { type: 'join_lobby' }>,
  wss: WebSocketServer,
  playerId: string,
  setCurrentRoom: (room: GameRoom) => void
): void {
  const { playerName, userId, friendCode, createPrivate } = message

  let room: GameRoom | undefined

  if (friendCode) {
    // Join room by friend code
    room = findRoomByFriendCode(friendCode)

    if (!room) {
      // Create a new room with the specific friend code
      const roomId = `room-${Date.now()}`
      room = new GameRoom(roomId, wss, friendCode.toUpperCase())
      room.isPrivate = true
      gameRooms.set(roomId, room)
      console.log(`Created new room with specific code: ${roomId} code: ${friendCode.toUpperCase()}`)
    } else if (!room.canJoin()) {
      sendError(ws, `Room "${friendCode}" is full or game already started`, 'ROOM_FULL')
      return
    }
  } else if (createPrivate) {
    // Create a new private room
    const roomId = `room-${Date.now()}`
    room = new GameRoom(roomId, wss, null)
    room.isPrivate = true
    gameRooms.set(roomId, room)
    console.log(`Created new private room: ${roomId} with code: ${room.friendCode}`)
  } else {
    // Find or create a public game room
    room = findAvailablePublicRoom()

    if (!room) {
      // Create new public room
      const roomId = `room-${Date.now()}`
      room = new GameRoom(roomId, wss)
      room.isPrivate = false
      gameRooms.set(roomId, room)
      console.log(`Created new public room: ${roomId} with code: ${room.friendCode}`)
    }
  }

  // Add player to room
  room.addPlayer(userId, playerName, ws)

  // Set currentRoom for this connection
  setCurrentRoom(room)

  // Send lobby state to all players in room
  room.broadcastLobbyState()
}

function findAvailablePublicRoom(): GameRoom | undefined {
  for (const [, room] of gameRooms) {
    if (!room.isPrivate && room.canJoin()) {
      return room
    }
  }
  return undefined
}

function findRoomByFriendCode(friendCode: string): GameRoom | undefined {
  for (const [, room] of gameRooms) {
    if (room.friendCode === friendCode.toUpperCase()) {
      return room
    }
  }
  return undefined
}

function findRoomByPlayerId(playerId: string): GameRoom | undefined {
  for (const [, room] of gameRooms) {
    if (room.players.has(playerId)) {
      return room
    }
  }
  return undefined
}

function sendError(ws: WebSocket, message: string, code?: string): void {
  ws.send(
    JSON.stringify({
      type: 'error',
      message,
      code,
      timestamp: Date.now(),
    })
  )
}

// Cleanup empty rooms periodically
setInterval(() => {
  for (const [roomId, room] of gameRooms) {
    if (room.isEmpty()) {
      console.log(`Removing empty room: ${roomId}`)
      gameRooms.delete(roomId)
    }
  }
}, 60000)
