'use client'

import { PixiRaceRenderer } from '@/components/game/PixiRaceRenderer'
import { generateHorse, generateJockey } from '@/game/generators'
import type { RaceInputs } from '@/types/messages'
import type { Track } from '@/types/game'
import { useState } from 'react'

export default function TestRacePage() {
  const [raceInputs, setRaceInputs] = useState<RaceInputs | null>(null)
  const [results, setResults] = useState<any[] | null>(null)

  const startTestRace = () => {
    // Generate 8 test horses and jockeys
    const entries = Array.from({ length: 8 }, (_, i) => {
      const tier = Math.min(4, Math.floor(i / 2) + 1) as 1 | 2 | 3 | 4
      const horse = generateHorse(tier)
      const jockey = generateJockey()

      return {
        playerId: `player-${i + 1}`,
        playerName: `Racer ${i + 1}`,
        horse,
        jockey,
        equipment: {},
        strategy: {
          start: (i % 3 === 0 ? 'burst' : i % 3 === 1 ? 'steady' : 'hang_back') as 'burst' | 'steady' | 'hang_back',
          mid: (i % 3 === 0 ? 'push' : i % 3 === 1 ? 'conserve' : 'react') as 'push' | 'conserve' | 'react',
          finish: (i % 2 === 0 ? 'sprint' : 'maintain') as 'sprint' | 'maintain',
        },
      }
    })

    // Generate a test track
    const track: Track = {
      id: 'test-track-1',
      name: 'Thunder Downs',
      category: 'mixed',
      distance: 2, // 2 furlongs for quick testing (~30 seconds)
      surface: 'dry_dirt',
      description: 'A classic dirt track for testing',
      obstacles: [],
    }

    const inputs: RaceInputs = {
      entries,
      track,
      seed: `test-race-${Date.now()}`,
    }

    setRaceInputs(inputs)
    setResults(null)
  }

  const handleRaceComplete = (placements: any[]) => {
    setResults(placements)
  }

  const resetRace = () => {
    setRaceInputs(null)
    setResults(null)
  }

  return (
    <div className="min-h-screen p-8 th-bg">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl th-title mb-4">🐎 Race Visualization Test</h1>
          <p className="th-label mb-6">
            Test the Pixi.js race renderer with randomly generated horses and jockeys
          </p>

          {!raceInputs && (
            <button
              onClick={startTestRace}
              className="th-button px-8 py-3 rounded-lg font-bold text-lg"
            >
              🎬 Start Test Race
            </button>
          )}

          {raceInputs && !results && (
            <div className="mb-4">
              <div className="inline-block px-4 py-2 bg-yellow-600 rounded-lg font-bold">
                🏁 Race in Progress...
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="inline-block px-4 py-2 bg-green-600 rounded-lg font-bold">
                ✅ Race Complete!
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={startTestRace}
                  className="th-button px-6 py-2 rounded-lg font-bold"
                >
                  🔄 Run Another Race
                </button>
                <button
                  onClick={resetRace}
                  className="px-6 py-2 rounded-lg font-bold bg-gray-600 hover:bg-gray-500"
                >
                  🏠 Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {raceInputs && (
          <div className="th-panel rounded-lg p-6 mb-6">
            <PixiRaceRenderer raceInputs={raceInputs} onRaceComplete={handleRaceComplete} />
          </div>
        )}

        {raceInputs && (
          <div className="th-panel rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Race Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {raceInputs.entries.map((entry: any, i: number) => (
                <div key={entry.playerId} className="th-panel-strong rounded-lg p-3">
                  <div className="font-bold text-sm mb-2">
                    Lane {i + 1}: {entry.playerName}
                  </div>
                  <div className="text-xs th-label space-y-1">
                    <div>
                      🐴 {entry.horse.name} (T{entry.horse.tier})
                    </div>
                    <div>
                      🏇 {entry.jockey.name}
                    </div>
                    <div className="text-xs">
                      SPD:{entry.horse.stats.speed} STA:{entry.horse.stats.stamina} GRT:
                      {entry.horse.stats.grit}
                    </div>
                    <div className="text-xs">
                      Strategy: {entry.strategy.start}/{entry.strategy.mid}/{entry.strategy.finish}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-900/30 rounded-lg">
              <div className="font-bold text-sm mb-2">Track Info</div>
              <div className="text-xs th-label">
                <div>📍 {raceInputs.track.name}</div>
                <div>📏 Distance: {raceInputs.track.distance} furlongs</div>
                <div>🌍 Surface: {raceInputs.track.surface}</div>
                {raceInputs.track.obstacles && (
                  <div>🚧 Obstacles: {raceInputs.track.obstacles.length}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {results && (
          <div className="mt-6 th-panel rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Final Results</h2>
            <div className="space-y-2">
              {results.map((placement, idx) => (
                <div
                  key={placement.playerId}
                  className="th-panel-strong rounded-lg p-4 flex justify-between items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold w-8">{placement.position}</div>
                    <div>
                      <div className="font-semibold">{placement.playerName}</div>
                      <div className="text-sm th-label">
                        Time: {(placement.finishTime / 1000).toFixed(2)}s
                      </div>
                    </div>
                  </div>
                  {placement.position === 1 && <div className="text-3xl">🏆</div>}
                  {placement.position === 2 && <div className="text-2xl">🥈</div>}
                  {placement.position === 3 && <div className="text-2xl">🥉</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
