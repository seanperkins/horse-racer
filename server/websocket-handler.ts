// @ts-nocheck
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

    // Use authenticated user ID if available, otherwise wait for join_lobby message
    let playerId: string | null = user?.id || null
    let playerName: string | null = user?.username || null
    let currentRoom: GameRoom | null = null

    // If user is authenticated, try to restore their session
    if (playerId) {
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
    } else {
      console.log('⚠️  Unauthenticated WebSocket connection - waiting for join_lobby')
    }

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString())

        // Validate message against schema
        const validatedMessage = ClientMessageSchema.parse(message) as ClientMessage

        // Handle different message types
        switch (validatedMessage.type) {
          case 'join_lobby':
            // For unauthenticated users, get playerId from the message
            if (!playerId) {
              playerId = validatedMessage.userId
              playerName = validatedMessage.playerName
              console.log(`🔑 Setting playerId from join_lobby: ${playerId}`)

              // Close any prior socket for the same userId
              const existingConnection = playerConnections.get(playerId)
              if (existingConnection && existingConnection !== ws) {
                console.log(`🔄 Closing previous connection for player ${playerId}`)
                existingConnection.close()
              }

              playerConnections.set(playerId, ws)
            } else {
              console.log(`🔐 Authenticated user ${playerId} joining lobby`)
            }

            handleJoinLobby(ws, validatedMessage, wss, playerId, playerName, (room) => {
              currentRoom = room
              console.log(`📍 Set currentRoom to: ${room.roomId} for player ${playerId}`)
            })
            break

          case 'ready_up':
            // Enforce sender identity - use connection-bound playerId, reject mismatched userId
            if (!playerId) {
              console.error(`❌ ready_up message received but playerId not set. Message:`, validatedMessage)
              sendError(ws, 'Player not identified (ready_up)')
              break
            }
            if (validatedMessage.userId !== playerId) {
              console.error(`❌ ready_up rejected: userId mismatch (message: ${validatedMessage.userId}, connection: ${playerId})`)
              sendError(ws, 'Invalid sender identity')
              break
            }
            console.log(`📨 Received ready_up from ${playerId}: ${validatedMessage.ready}, currentRoom: ${currentRoom?.roomId || 'none'}`)
            // If currentRoom is null, try to find the room by player ID
            const roomForReady = currentRoom || findRoomByPlayerId(playerId)
            if (roomForReady) {
              roomForReady.handleReadyUp(playerId, validatedMessage.ready)
              // Update currentRoom reference for future messages
              if (!currentRoom) {
                currentRoom = roomForReady
                console.log(`📍 Restored currentRoom to: ${roomForReady.roomId} for player ${playerId}`)
              }
            } else {
              console.error(`❌ ready_up failed: No room found for player ${playerId}`)
              sendError(ws, 'Not in a room')
            }
            break

          case 'purchase_unit':
            if (!playerId) {
              sendError(ws, 'Player not identified')
              break
            }
            if (!currentRoom) {
              currentRoom = findRoomByPlayerId(playerId)
              if (currentRoom) {
                console.log(`📍 Restored currentRoom to: ${currentRoom.roomId} for player ${playerId}`)
              }
            }
            if (currentRoom) {
              currentRoom.handlePurchase(playerId, validatedMessage)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'sell_unit':
            if (!playerId) {
              sendError(ws, 'Player not identified')
              break
            }
            if (!currentRoom) {
              currentRoom = findRoomByPlayerId(playerId)
              if (currentRoom) {
                console.log(`📍 Restored currentRoom to: ${currentRoom.roomId} for player ${playerId}`)
              }
            }
            if (currentRoom) {
              currentRoom.handleSell(playerId, validatedMessage)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'reroll_shop':
            if (!playerId) {
              sendError(ws, 'Player not identified')
              break
            }
            if (!currentRoom) {
              currentRoom = findRoomByPlayerId(playerId)
              if (currentRoom) {
                console.log(`📍 Restored currentRoom to: ${currentRoom.roomId} for player ${playerId}`)
              }
            }
            if (currentRoom) {
              currentRoom.handleReroll(playerId)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'train_horse':
            if (!playerId) {
              sendError(ws, 'Player not identified')
              break
            }
            if (!currentRoom) {
              currentRoom = findRoomByPlayerId(playerId)
              if (currentRoom) {
                console.log(`📍 Restored currentRoom to: ${currentRoom.roomId} for player ${playerId}`)
              }
            }
            if (currentRoom) {
              currentRoom.handleTrain(playerId, validatedMessage)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'hire_jockey':
            if (!playerId) {
              sendError(ws, 'Player not identified')
              break
            }
            if (!currentRoom) {
              currentRoom = findRoomByPlayerId(playerId)
              if (currentRoom) {
                console.log(`📍 Restored currentRoom to: ${currentRoom.roomId} for player ${playerId}`)
              }
            }
            if (currentRoom) {
              currentRoom.handleHireJockey(playerId, validatedMessage)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'fire_jockey':
            if (!playerId) {
              sendError(ws, 'Player not identified')
              break
            }
            if (!currentRoom) {
              currentRoom = findRoomByPlayerId(playerId)
              if (currentRoom) {
                console.log(`📍 Restored currentRoom to: ${currentRoom.roomId} for player ${playerId}`)
              }
            }
            if (currentRoom) {
              currentRoom.handleFireJockey(playerId)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'setup_race_entry':
            if (!playerId) {
              console.error(`❌ setup_race_entry message received but playerId not set. Message:`, validatedMessage)
              sendError(ws, 'Player not identified (setup_race_entry)')
              break
            }
            if (!currentRoom) {
              currentRoom = findRoomByPlayerId(playerId)
              if (currentRoom) {
                console.log(`📍 Restored currentRoom to: ${currentRoom.roomId} for player ${playerId}`)
              }
            }
            if (currentRoom) {
              currentRoom.handleSetupRaceEntry(playerId, validatedMessage)
            } else {
              sendError(ws, 'Not in a room')
            }
            break

          case 'place_bet':
            if (!playerId) {
              console.error(`❌ place_bet message received but playerId not set. Message:`, validatedMessage)
              sendError(ws, 'Player not identified (place_bet)')
              break
            }
            if (!currentRoom) {
              currentRoom = findRoomByPlayerId(playerId)
              if (currentRoom) {
                console.log(`📍 Restored currentRoom to: ${currentRoom.roomId} for player ${playerId}`)
              }
            }
            if (currentRoom) {
              currentRoom.handlePlaceBet(playerId, validatedMessage)
            } else {
              sendError(ws, 'Not in a room')
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

// Cleanup empty rooms periodically
setInterval(() => {
  for (const [roomId, room] of gameRooms) {
    if (room.isEmpty()) {
      console.log(`Removing empty room: ${roomId}`)
      gameRooms.delete(roomId)
    }
  }
}, 60000)
