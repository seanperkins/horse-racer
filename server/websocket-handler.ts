import type { WebSocketServer, WebSocket } from 'ws'
import { ClientMessageSchema } from '@/types/messages'
import type { ClientMessage } from '@/types/messages'
import { GameRoom } from './GameRoom'

// Store active game rooms
const gameRooms = new Map<string, GameRoom>()

// Store player connections
const playerConnections = new Map<string, WebSocket>()

interface AuthenticatedUser {
  id: string
  username: string
  email?: string
}

export function setupWebSocketServer(wss: WebSocketServer): void {
  console.log('WebSocket server initialized')

  wss.on('connection', (ws: WebSocket, request: any, user: AuthenticatedUser | null) => {
    console.log('New WebSocket connection')

    // Require authentication - reject unauthenticated connections
    if (!user || !user.id) {
      console.log('❌ Rejected unauthenticated WebSocket connection')
      sendError(ws, 'Authentication required. Please login to play.')
      ws.close(1008, 'Authentication required')
      return
    }

    // Use authenticated user info
    const playerId: string = user.id
    const playerName: string = user.username
    let currentRoom: GameRoom | null = null

    console.log(`🔐 Authenticated connection for user: ${playerId} (${playerName})`)

    // Close any previous connection for this user
    const existingConnection = playerConnections.get(playerId)
    if (existingConnection && existingConnection !== ws) {
      console.log(`🔄 Closing previous connection for player ${playerId}`)
      existingConnection.close()
    }

    playerConnections.set(playerId, ws)

    // Try to find and restore the player's room
    const existingRoom = findRoomByPlayerId(playerId)
    if (existingRoom) {
      currentRoom = existingRoom
      console.log(`📍 Auto-restored room ${existingRoom.roomId} for player ${playerId}`)

      // Update the WebSocket connection in the room
      existingRoom.updatePlayerConnection(playerId, ws)

      // Send current lobby state to reconnected player
      existingRoom.broadcastLobbyState()
    }

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString())

        // Validate message against schema
        const validatedMessage = ClientMessageSchema.parse(message) as ClientMessage

        // Helper function to ensure currentRoom is set
        const ensureRoom = (): GameRoom | null => {
          if (!currentRoom) {
            currentRoom = findRoomByPlayerId(playerId) ?? null
            if (currentRoom) {
              console.log(`📍 Restored currentRoom to: ${currentRoom.roomId} for player ${playerId}`)
            }
          }
          return currentRoom
        }

        // Handle different message types
        switch (validatedMessage.type) {
          case 'join_lobby':
            // playerId and playerName are already set from authenticated user
            console.log(`🔐 Authenticated user ${playerId} joining lobby`)

            handleJoinLobby(ws, validatedMessage, wss, playerId, playerName, (room) => {
              currentRoom = room
              console.log(`📍 Set currentRoom to: ${room.roomId} for player ${playerId}`)
            })
            break

          case 'ready_up':
            // Enforce sender identity - use connection-bound playerId, reject mismatched userId
            if (validatedMessage.userId !== playerId) {
              console.error(`❌ ready_up rejected: userId mismatch (message: ${validatedMessage.userId}, connection: ${playerId})`)
              sendError(ws, 'Invalid sender identity')
              break
            }
            console.log(`📨 Received ready_up from ${playerId}: ${validatedMessage.ready}, currentRoom: ${currentRoom?.roomId || 'none'}`)
            if (ensureRoom()) {
              currentRoom!.handleReadyUp(playerId, validatedMessage.ready)
            } else {
              console.error(`❌ ready_up failed: No room found for player ${playerId}`)
              sendError(ws, 'Not in a room')
            }
            break

          case 'purchase_unit':
            if (ensureRoom()) {
              currentRoom!.handlePurchase(playerId, validatedMessage)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'sell_unit':
            if (ensureRoom()) {
              currentRoom!.handleSell(playerId, validatedMessage)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'reroll_shop':
            if (ensureRoom()) {
              currentRoom!.handleReroll(playerId)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'expand_stable':
            if (ensureRoom()) {
              currentRoom!.handleExpandStable(playerId)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'train_horse':
            if (ensureRoom()) {
              currentRoom!.handleTrain(playerId, validatedMessage)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'hire_jockey':
            if (ensureRoom()) {
              currentRoom!.handleHireJockey(playerId, validatedMessage)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'fire_jockey':
            if (ensureRoom()) {
              currentRoom!.handleFireJockey(playerId)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'setup_race_entry':
            if (ensureRoom()) {
              currentRoom!.handleSetupRaceEntry(playerId, validatedMessage)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'place_bet':
            if (ensureRoom()) {
              currentRoom!.handlePlaceBet(playerId, validatedMessage)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'skip_betting':
            if (ensureRoom()) {
              currentRoom!.handleSkipBetting(playerId)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'leave_game':
            // Enforce sender identity - use connection-bound playerId, reject mismatched userId
            if (validatedMessage.userId !== playerId) {
              console.error(`❌ leave_game rejected: userId mismatch (message: ${validatedMessage.userId}, connection: ${playerId})`)
              sendError(ws, 'Invalid sender identity')
              break
            }
            console.log(`📨 Received leave_game from ${playerId}`)
            if (ensureRoom()) {
              currentRoom!.handleLeaveGame(playerId)
              currentRoom = null // Clear room reference since player left
            } else {
              console.log(`Player ${playerId} not in a room, just closing connection`)
            }
            // Close the WebSocket connection after processing leave
            ws.close()
            break

          case 'animation_complete':
            console.log(`📨 Received animation_complete from ${playerId}`)
            if (ensureRoom()) {
              currentRoom!.handleAnimationComplete(playerId)
            } else {
              console.log(`Player ${playerId} not in a room, ignoring animation_complete`)
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
      console.log(`WebSocket connection closed for player ${playerId}`)
      playerConnections.delete(playerId)

      // Clean up the socket reference from the room to prevent memory leaks
      // The player data stays in the room for reconnection grace period
      if (currentRoom) {
        currentRoom.handleSocketDisconnect(playerId)
      } else {
        // Try to find the room if currentRoom wasn't set
        const room = findRoomByPlayerId(playerId)
        if (room) {
          room.handleSocketDisconnect(playerId)
        }
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
  authenticatedPlayerName: string | null,
  setCurrentRoom: (room: GameRoom) => void
): void {
  const { playerName: messagePlayerName, userId, friendCode, createPrivate } = message
  // Use authenticated player name if available, otherwise use message player name
  const playerName = authenticatedPlayerName || messagePlayerName

  let room: GameRoom | undefined

  if (friendCode) {
    // Join room by friend code (join-only, don't create)
    room = findRoomByFriendCode(friendCode)

    if (!room) {
      sendError(ws, `Room "${friendCode}" not found`, 'ROOM_NOT_FOUND')
      return
    }

    // Allow reconnects to bypass canJoin() check
    const isReconnecting = room.players.has(userId)
    if (!isReconnecting && !room.canJoin()) {
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

// Cleanup empty rooms and dead sockets periodically
setInterval(() => {
  for (const [roomId, room] of gameRooms) {
    // Clean up any dead socket references first
    const cleanedSockets = room.cleanupDeadSockets()
    if (cleanedSockets > 0) {
      console.log(`🧹 Cleaned ${cleanedSockets} dead socket(s) in room ${roomId}`)
    }

    // Then check if room should be removed
    if (room.isEmpty()) {
      console.log(`Removing empty room: ${roomId}`)
      gameRooms.delete(roomId)
    }
  }
}, 60000)
