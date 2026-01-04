'use client';

import { useAudioStore } from '@/lib/store/audioStore';
import { useState } from 'react';

export function AudioSettings() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    musicVolume,
    sfxVolume,
    musicEnabled,
    sfxEnabled,
    setMusicVolume,
    setSfxVolume,
    toggleMusic,
    toggleSfx,
  } = useAudioStore();

  return (
    <div className="relative">
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
        aria-label="Audio settings"
        title="Audio settings"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {musicEnabled || sfxEnabled ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          )}
        </svg>
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border-2 border-gray-700 rounded-lg shadow-xl z-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Audio Settings</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Music Controls */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Background Music</label>
                <button
                  onClick={toggleMusic}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    musicEnabled
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {musicEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
                <span className="text-sm w-12 text-right">
                  {Math.round(musicVolume * 100)}%
                </span>
              </div>
            </div>

            {/* SFX Controls */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Sound Effects</label>
                <button
                  onClick={toggleSfx}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    sfxEnabled
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {sfxEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
                <span className="text-sm w-12 text-right">
                  {Math.round(sfxVolume * 100)}%
                </span>
              </div>
            </div>

            {/* Test Sound Button */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={() => useAudioStore.getState().playSfx('button_click')}
                disabled={!sfxEnabled}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors text-sm font-medium"
              >
                Test Sound Effect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
