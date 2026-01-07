'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useAudioStore } from '@/lib/store/audioStore'
import { useGameStore } from '@/lib/store/gameStore'

export function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  const {
    musicVolume,
    sfxVolume,
    musicEnabled,
    sfxEnabled,
    setMusicVolume,
    setSfxVolume,
    toggleMusic,
    toggleSfx,
  } = useAudioStore()

  const { playerId: storePlayerId, reset, currentPhase } = useGameStore()

  // Use session user ID (which is what the server uses), falling back to store playerId
  const playerId = session?.user?.id || storePlayerId

  const handleLeaveGame = () => {
    if (!playerId) {
      console.error('Cannot leave game: no playerId')
      // Still navigate away even without playerId
      reset()
      setIsOpen(false)
      setShowLeaveConfirm(false)
      router.push('/')
      return
    }

    // Get the WebSocket before we do anything
    const ws = useGameStore.getState().ws
    console.log('Leave game - WebSocket state:', ws?.readyState, 'playerId:', playerId)

    // Send leave_game message directly via WebSocket to ensure it's sent
    // Server uses authenticated connection ID, no need to send userId
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'leave_game',
        timestamp: Date.now(),
      })
      console.log('Sending leave_game message:', message)
      ws.send(message)
    } else {
      console.error('Cannot send leave_game: WebSocket not open', ws?.readyState)
      // Still proceed with local cleanup even if we can't notify server
    }

    // Reset game store
    reset()

    // Close the menu
    setIsOpen(false)
    setShowLeaveConfirm(false)

    // Navigate to home
    router.push('/')
  }

  // Determine if we're in-game (past lobby)
  const isInGame = currentPhase !== 'lobby'

  return (
    <div className="relative">
      {/* Gear Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
        aria-label="Settings"
        title="Settings"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false)
              setShowLeaveConfirm(false)
            }}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border-2 border-gray-700 rounded-lg shadow-xl z-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Settings</h3>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setShowLeaveConfirm(false)
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Audio Section */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Audio</h4>

              {/* Music Controls */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm">Background Music</label>
                  <button
                    onClick={toggleMusic}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      musicEnabled
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {musicEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={musicVolume * 100}
                    onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                    disabled={!musicEnabled}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: musicEnabled
                        ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${musicVolume * 100}%, #374151 ${musicVolume * 100}%, #374151 100%)`
                        : '#374151',
                    }}
                  />
                  <span className="text-xs w-10 text-right text-gray-400">
                    {Math.round(musicVolume * 100)}%
                  </span>
                </div>
              </div>

              {/* SFX Controls */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm">Sound Effects</label>
                  <button
                    onClick={toggleSfx}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      sfxEnabled
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {sfxEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sfxVolume * 100}
                    onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
                    disabled={!sfxEnabled}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: sfxEnabled
                        ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${sfxVolume * 100}%, #374151 ${sfxVolume * 100}%, #374151 100%)`
                        : '#374151',
                    }}
                  />
                  <span className="text-xs w-10 text-right text-gray-400">
                    {Math.round(sfxVolume * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Leave Game Section - only show when in game */}
            {isInGame && (
              <>
                <div className="border-t border-gray-700 my-4" />

                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Game</h4>

                  {!showLeaveConfirm ? (
                    <button
                      onClick={() => setShowLeaveConfirm(true)}
                      className="w-full py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 hover:text-red-300 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Leave Game
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400 text-center mb-3">
                        Are you sure you want to leave?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowLeaveConfirm(false)}
                          className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleLeaveGame}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm font-medium"
                        >
                          Leave
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
