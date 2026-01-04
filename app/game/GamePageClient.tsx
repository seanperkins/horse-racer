'use client'

import { useCallback, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useWebSocket } from '@/lib/hooks/useWebSocket'
import { useGameStore } from '@/lib/store/gameStore'
import { Lobby } from '@/components/game/Lobby'
import { ShopPhase } from '@/components/game/ShopPhase'
import { PreparationPhase } from '@/components/game/PreparationPhase'
import { BettingPhase } from '@/components/game/BettingPhase'
import { RacePhase } from '@/components/game/RacePhase'
import { ResultsPhase } from '@/components/game/ResultsPhase'
import { UniversalHeader } from '@/components/game/UniversalHeader'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'
import type { ServerMessage } from '@/types/messages'

interface GamePageClientProps {
  userId: string
  username: string
}

export default function GamePageClient({ userId, username }: GamePageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomCode = searchParams.get('room')

  const {
    currentPhase,
    setLobbyState,
    setGamePhase,
    setPlayerState,
    setShopState,
    setPlayerReadyStatus,
    setWebSocket,
  } = useGameStore()

  // Get WebSocket URL (use ws:// in dev, wss:// in prod)
  const wsUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return ''
    }

    return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
  }, [])

  const handleMessage = useCallback((message: ServerMessage) => {
    console.log('Received message:', message.type, message)

    switch (message.type) {
      case 'lobby_state':
        setLobbyState({
          players: message.players,
          requiredPlayers: message.requiredPlayers,
          friendCode: message.friendCode,
          isPrivate: message.isPrivate,
        })

        // Update URL with room code if it's a private room and not already in URL
        if (message.isPrivate && message.friendCode && !roomCode) {
          router.replace(`/game?room=${message.friendCode}`)
        }
        break

      case 'game_phase':
        setGamePhase(message.phase, message.duration, message.round)
        break

      case 'shop_state':
        console.log('📦 Received shop_state with', message.units.length, 'units')
        setShopState({
          units: message.units,
          playerGold: message.playerGold,
          playerUnits: message.playerUnits,
        })
        break

      case 'player_state':
        setPlayerState({
          gold: message.gold,
          hearts: message.hearts,
          inventory: message.inventory,
        })
        break

      case 'track_info':
        // Store track info in game store for prep/betting/race phases
        useGameStore.getState().setTrackInfo(message.track as any)
        break

      case 'betting_open':
        // Store betting entries and odds
        useGameStore.getState().setBettingState({
          entries: message.entries,
        })
        break

      case 'race_inputs':
        // Store race inputs for client-side simulation
        useGameStore.getState().setRaceInputs(message)
        break

      case 'race_results':
        // Store race results for results phase
        useGameStore.getState().setRaceResults({
          placements: message.placements,
          betResults: message.betResults,
          eliminatedPlayers: message.eliminatedPlayers,
        })
        break

      case 'player_ready':
        // Player ready state updated
        console.log(`Player ${message.playerId} ready: ${message.ready}`)
        setPlayerReadyStatus(message.playerId, message.ready)
        break

      case 'error':
        console.error('Server error:', message.message)
        // TODO: Show error toast
        break
    }
  }, [setLobbyState, setGamePhase, setShopState, setPlayerState, setPlayerReadyStatus, roomCode, router])

  const { isConnected, sendMessage, ws } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
    onConnect: useCallback(() => {
      console.log('Connected to game server')
    }, []),
    onDisconnect: useCallback(() => {
      console.log('Disconnected from game server')
      setWebSocket(null)
    }, [setWebSocket]),
  })

  // Store WebSocket instance in the store when it changes
  useEffect(() => {
    if (ws) {
      setWebSocket(ws)
    }
  }, [ws, setWebSocket])

  // Render current phase
  const renderPhase = () => {
    if (!isConnected) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-2xl">Connecting to server...</div>
            <div className="h-2 w-64 bg-gray-700 rounded overflow-hidden">
              <div className="h-full bg-blue-600 w-1/2 animate-pulse"></div>
            </div>
          </div>
        </div>
      )
    }

    switch (currentPhase) {
      case 'lobby':
        return (
          <ErrorBoundary componentName="Lobby">
            <Lobby sendMessage={sendMessage} roomCode={roomCode} isConnected={isConnected} />
          </ErrorBoundary>
        )

      case 'shop':
        return (
          <ErrorBoundary componentName="Shop Phase">
            <ShopPhase sendMessage={sendMessage} />
          </ErrorBoundary>
        )

      case 'preparation':
        return (
          <ErrorBoundary componentName="Preparation Phase">
            <PreparationPhase sendMessage={sendMessage} />
          </ErrorBoundary>
        )

      case 'betting':
        return (
          <ErrorBoundary componentName="Betting Phase">
            <BettingPhase sendMessage={sendMessage} />
          </ErrorBoundary>
        )

      case 'race':
        return (
          <ErrorBoundary componentName="Race Phase">
            <RacePhase />
          </ErrorBoundary>
        )

      case 'results':
        return (
          <ErrorBoundary componentName="Results Phase">
            <ResultsPhase />
          </ErrorBoundary>
        )

      default:
        return (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-xl">Unknown game phase: {currentPhase}</div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen th-bg text-white">
      <UniversalHeader />
      {renderPhase()}
    </div>
  )
}
