'use client'

import { useCallback, useMemo, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useWebSocket } from '@/lib/hooks/useWebSocket'
import { useGameStore } from '@/lib/store/gameStore'
import { useAudioStore } from '@/lib/store/audioStore'
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
    setPlayerId,
  } = useGameStore()

  // Set playerId in store on mount
  useEffect(() => {
    setPlayerId(userId)
  }, [userId, setPlayerId])

  // Get WebSocket URL (use ws:// in dev, wss:// in prod)
  const wsUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return ''
    }

    return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
  }, [])

  const handleMessage = useCallback((message: ServerMessage) => {
    console.log('Received message:', message.type, message)
    const { playSfx, playMusic } = useAudioStore.getState()

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
        console.log(`🎮 Phase change: ${message.phase}, round: ${message.round}, phaseEndTime: ${message.phaseEndTime}, duration: ${message.duration}`)
        if (message.phaseEndTime) {
          const timeLeft = Math.floor((message.phaseEndTime - Date.now()) / 1000)
          console.log(`⏱️ Time remaining: ${timeLeft}s (phaseEndTime from server)`)
        } else {
          console.log(`⏱️ No phaseEndTime from server, will calculate from duration: ${message.duration}s`)
        }
        if (message.phase === 'results') {
          const currentResults = useGameStore.getState().raceResults
          console.log('📊 Current raceResults when entering results phase:', currentResults)
        }
        setGamePhase(message.phase, message.duration, message.round, message.phaseEndTime)
        // Play music based on phase
        if (message.phase === 'shop') {
          playMusic('shop')
        } else if (message.phase === 'race') {
          playSfx('race_start')
          playMusic('race')
        }
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
        console.log('📊 Received player_state:', {
          gold: message.gold,
          hearts: message.hearts,
          reputation: message.reputation,
          stableSlots: message.stableSlots,
        })
        setPlayerState({
          gold: message.gold,
          hearts: message.hearts,
          inventory: message.inventory,
        })
        // Update reputation and stableSlots from server
        if ('reputation' in message) {
          useGameStore.getState().setReputation(message.reputation)
        }
        if ('stableSlots' in message) {
          useGameStore.getState().setStableSlots(message.stableSlots)
        }
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
        // Store race inputs for client-side simulation (legacy)
        useGameStore.getState().setRaceInputs(message)
        break

      case 'race_start':
        // Store race start with precomputed data (new flow)
        console.log('🎬 Received race_start with precomputed data')
        useGameStore.getState().setRaceInputs(message as any)
        break

      case 'race_results':
        // Store race results for results phase
        console.log('📊 Received race_results:', message.placements?.length, 'placements')
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

      case 'race_entry_sync':
        // Sync race entry status on reconnect
        console.log('🔄 Race entry sync:', message.submitted ? 'submitted' : 'not submitted')
        if (message.submitted && message.entry) {
          useGameStore.getState().setEntryStatus('submitted', {
            horse: message.entry.horse,
            jockey: message.entry.jockey,
            equipment: message.entry.equipment,
            strategy: message.entry.strategy,
          })
        }
        break

      case 'bet_sync':
        // Sync bet status on reconnect
        console.log('🔄 Bet sync:', message.status)
        useGameStore.getState().setBettingStatus(message.status)
        break
    }
  }, [setLobbyState, setGamePhase, setShopState, setPlayerState, setPlayerReadyStatus, roomCode, router])

  // Track if we've ever connected (to show reconnecting vs initial connecting)
  const [hasConnected, setHasConnected] = useState(false)
  const [showConnectingScreen, setShowConnectingScreen] = useState(false)

  const { isConnected, sendMessage, ws } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
    onConnect: useCallback(() => {
      console.log('Connected to game server')
      setHasConnected(true)
      setShowConnectingScreen(false)
    }, []),
    onDisconnect: useCallback(() => {
      console.log('Disconnected from game server')
      setWebSocket(null)
    }, [setWebSocket]),
  })

  // Store WebSocket instance in the store when connected
  // We check isConnected to ensure the ws ref is populated
  useEffect(() => {
    if (isConnected && ws) {
      console.log('Storing WebSocket in game store')
      setWebSocket(ws)
    }
  }, [isConnected, ws, setWebSocket])

  // Show connecting screen after a delay if still not connected
  // This prevents flickering during quick reconnects
  useEffect(() => {
    if (!isConnected) {
      const timer = setTimeout(() => {
        setShowConnectingScreen(true)
      }, 500) // Wait 500ms before showing connecting screen

      return () => clearTimeout(timer)
    } else {
      setShowConnectingScreen(false)
    }
  }, [isConnected])

  // Render current phase
  const renderPhase = () => {
    // Only show full connecting screen if:
    // 1. Not connected AND
    // 2. Either never connected OR delayed timer has fired
    if (!isConnected && (!hasConnected || showConnectingScreen)) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-2xl">
              {hasConnected ? 'Reconnecting to server...' : 'Connecting to server...'}
            </div>
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

  // Check if we should show reconnecting banner
  const showReconnectingBanner = !isConnected && hasConnected && !showConnectingScreen

  return (
    <div className="min-h-screen th-bg text-white">
      {/* Subtle reconnecting banner */}
      {showReconnectingBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-600/90 text-black py-1 px-4 text-center text-sm font-semibold">
          Reconnecting to server...
        </div>
      )}
      <UniversalHeader />
      {renderPhase()}
    </div>
  )
}
