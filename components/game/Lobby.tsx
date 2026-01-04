'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'
import { useGameStore } from '@/lib/store/gameStore'
import type { ClientMessage } from '@/types/messages'

interface LobbyProps {
  sendMessage: (message: ClientMessage) => void
  roomCode?: string | null
  isConnected: boolean
}

export function Lobby({ sendMessage, roomCode, isConnected }: LobbyProps) {
  const { data: session } = useSession()
  const { players, requiredPlayers, friendCode, isPrivate, playerId, playerName } =
    useGameStore()
  const [isReady, setIsReady] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [hasJoined, setHasJoined] = useState(false)
  const autoJoinAttemptedRef = useRef(false)

  // Use persistent player ID from localStorage to support reconnection
  const fallbackIdRef = useRef<string>('')
  if (typeof window !== 'undefined' && !fallbackIdRef.current) {
    const stored = localStorage.getItem('thunder-hooves-player-id')
    if (stored) {
      fallbackIdRef.current = stored
    } else {
      fallbackIdRef.current = uuidv4()
      localStorage.setItem('thunder-hooves-player-id', fallbackIdRef.current)
    }
  }

  const username = session?.user?.username?.trim() || playerName || ''
  // Always use localStorage UUID first for consistency across sessions
  const userId = fallbackIdRef.current || session?.user?.id || playerId
  const showAiPlaceholders = hasJoined

  // Auto-join if room code is in URL
  useEffect(() => {
    console.log(`Auto-join check: roomCode=${roomCode}, hasJoined=${hasJoined}, isConnected=${isConnected}, attempted=${autoJoinAttemptedRef.current}`)

    if (roomCode && !hasJoined && isConnected && !autoJoinAttemptedRef.current && userId) {
      // Use username if available, otherwise generate a guest name
      const playerNameToUse = username || `Guest-${userId.slice(0, 8)}`
      console.log(`✅ Auto-joining room with code: ${roomCode}, playerName: ${playerNameToUse}`)

      autoJoinAttemptedRef.current = true
      useGameStore.setState({ playerName: playerNameToUse, playerId: userId })

      sendMessage({
        type: 'join_lobby',
        playerName: playerNameToUse,
        userId,
        friendCode: roomCode.toUpperCase(),
      })

      setHasJoined(true)
      setCodeInput(roomCode.toUpperCase())
    }
  }, [roomCode, username, hasJoined, userId, sendMessage, isConnected])
  const aiNames = useMemo(() => {
    const pool = [
      'Stormhoof',
      'Nightbolt',
      'Ironmane',
      'Ghoststride',
      'Ashrunner',
      'Skyforge',
      'Thunderveil',
      'Crimson Derby',
      'Frostwhirl',
      'Wild Circuit',
      'Obsidian Breeze',
      'Volt Dancer',
    ]
    const used = new Set<string>()

    return Array.from({ length: requiredPlayers }, () => {
      if (used.size >= pool.length) {
        return pool[used.size % pool.length]
      }

      let name = pool[Math.floor(Math.random() * pool.length)]
      while (used.has(name)) {
        name = pool[Math.floor(Math.random() * pool.length)]
      }
      used.add(name)
      return name
    })
  }, [requiredPlayers])

  const handleJoinPublic = () => {
    if (!username || !userId) return

    useGameStore.setState({ playerName: username, playerId: userId })

    sendMessage({
      type: 'join_lobby',
      playerName: username,
      userId,
    })

    setHasJoined(true)
  }

  const handleJoinPrivate = () => {
    if (!username || !userId) return

    useGameStore.setState({ playerName: username, playerId: userId })

    sendMessage({
      type: 'join_lobby',
      playerName: username,
      userId,
      createPrivate: true,
    })

    setHasJoined(true)
  }

  const handleJoinByCode = () => {
    if (!username || !codeInput.trim() || !userId) return

    useGameStore.setState({ playerName: username, playerId: userId })

    sendMessage({
      type: 'join_lobby',
      playerName: username,
      userId,
      friendCode: codeInput.toUpperCase(),
    })

    setHasJoined(true)
  }

  const handleReadyToggle = () => {
    if (!userId) {
      console.error('❌ Cannot toggle ready: userId is null')
      return
    }

    const newReadyState = !isReady
    setIsReady(newReadyState)

    console.log(`🎮 Sending ready_up message: ${newReadyState}, playerId: ${userId}`)
    console.log(`Current players:`, players)
    sendMessage({
      type: 'ready_up',
      ready: newReadyState,
      userId,
    })
  }

  // Show join options if not yet joined
  if (!hasJoined) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 th-bg">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-6xl th-title mb-4">Neighs of Thunder</h1>
            <div className="th-label text-lg">Draft. Bet. Race.</div>
          </div>

          <div className="th-panel rounded-lg p-8 space-y-6">
            <div className="th-chip rounded-lg px-4 py-3 text-sm">
              Signed in as <span className="font-semibold">{username || 'Guest'}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleJoinPublic}
                disabled={!username}
                className="th-button-blue disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-4 rounded-lg font-bold transition"
              >
                Join Public Game
              </button>

              <button
                onClick={handleJoinPrivate}
                disabled={!username}
                className="th-button disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-4 rounded-lg font-bold transition"
              >
                Create Private Room
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--outline)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[var(--bg-panel)] th-label">Or join with code</span>
              </div>
            </div>

            <div className="flex gap-4">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="ABCD"
                maxLength={4}
                className="flex-1 px-4 py-3 bg-[#201a33] border-2 border-[var(--outline)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-green)] text-center text-2xl font-mono tracking-widest"
              />
              <button
                onClick={handleJoinByCode}
                disabled={!username || codeInput.length !== 4}
                className="th-button-green disabled:bg-gray-600 disabled:cursor-not-allowed px-8 py-3 rounded-lg font-bold transition"
              >
                Join
              </button>
            </div>

            <div className="th-chip rounded-lg px-4 py-3 text-sm">
              Tip: Draft for bloodlines. Bet for comebacks.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show lobby once joined
  return (
    <div className="flex min-h-screen items-center justify-center p-8 th-bg">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl th-title mb-2">Lobby</h1>
          {friendCode && (
            <div className="inline-block th-panel px-6 py-3 rounded-lg">
              <div className="text-sm th-label mb-1">
                {isPrivate ? 'Private Room Code' : 'Room Code'}
              </div>
              <div className="text-3xl font-mono font-bold tracking-wider text-[var(--accent-blue)]">
                {friendCode}
              </div>
              <div className="text-xs th-label mt-2">Share with friends to join</div>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/game?room=${friendCode}`
                  navigator.clipboard.writeText(url)
                  toast.success('Room URL copied to clipboard!')
                }}
                className="mt-2 px-4 py-2 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/80 rounded text-sm font-semibold transition"
              >
                📋 Copy Room URL
              </button>
            </div>
          )}
        </div>

        <div className="th-panel rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              Players ({players.length}/{requiredPlayers})
            </h2>
            <div className="text-sm th-label">Waiting for players...</div>
          </div>

        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: requiredPlayers }).map((_, index) => {
            const player = players[index]
            return (
              <div
                key={index}
                className={`px-4 py-3 rounded-lg border-2 ${
                  player
                    ? player.ready
                      ? 'bg-[#1f3a2c] border-[#3f9b6a]'
                      : 'bg-[#26203b] border-[var(--outline)]'
                    : showAiPlaceholders
                      ? 'bg-[#1b1f2d] border-[#2f3b4f]'
                      : 'bg-[#181326] border-[#2a2442]'
                }`}
              >
                {player ? (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{player.name}</span>
                    {player.ready && (
                      <span className="text-[var(--accent-green)] text-sm">✓ Ready</span>
                    )}
                    {player.id === playerId && (
                      <span className="text-[var(--accent-blue)] text-sm">(You)</span>
                    )}
                  </div>
                ) : showAiPlaceholders ? (
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">[AI] {aiNames[index]}</span>
                    <span className="text-slate-400 text-xs">Auto-ready</span>
                  </div>
                ) : (
                  <span className="th-label">Waiting...</span>
                )}
              </div>
            )
          })}
        </div>
        </div>

        <button
          onClick={handleReadyToggle}
          className={`w-full py-4 rounded-lg font-bold text-xl transition ${
            isReady
              ? 'th-button-red'
              : 'th-button-green animate-pulse'
          }`}
        >
          {isReady ? 'Not Ready' : players.length === 1 ? 'Start Solo' : 'Ready!'}
        </button>

        {players.length >= 1 && players.every((p) => p.ready) && (
          <div className="mt-4 text-center text-[var(--accent-green)] animate-pulse">
            Game starting soon...
          </div>
        )}
      </div>
    </div>
  )
}
