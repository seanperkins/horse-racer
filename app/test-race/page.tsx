'use client'

import { PixiRaceRenderer } from '@/components/game/PixiRaceRenderer'
import { generateHorse, generateJockey } from '@/game/generators'
import type { RaceInputs } from '@/types/messages'
import type { Track } from '@/types/game'
import { useState } from 'react'

export default function TestRacePage() {
  const [raceInputs, setRaceInputs] = useState<RaceInputs | null>(null)
  const [results, setResults] = useState<any[] | null>(null)
  const [raceDistance, setRaceDistance] = useState<number>(6) // Default 6 furlongs

  const startTestRace = () => {
    // Generate 8 test horses and jockeys with unique names
    const usedHorseNames = new Set<string>()
    const usedJockeyNames = new Set<string>()

    const entries = Array.from({ length: 8 }, (_, i) => {
      const tier = Math.min(4, Math.floor(i / 2) + 1) as 1 | 2 | 3 | 4

      // Generate unique horse
      let horse = generateHorse(tier)
      while (usedHorseNames.has(horse.name)) {
        horse = generateHorse(tier)
      }
      usedHorseNames.add(horse.name)

      // Generate unique jockey
      let jockey = generateJockey()
      while (usedJockeyNames.has(jockey.name)) {
        jockey = generateJockey()
      }
      usedJockeyNames.add(jockey.name)

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

    // Randomize track surface
    const surfaces: Array<'dry_dirt' | 'wet_muddy' | 'turf_grass' | 'rocky' | 'sand' | 'frozen'> = [
      'dry_dirt',
      'wet_muddy',
      'turf_grass',
      'rocky',
      'sand',
      'frozen',
    ]
    const randomSurface = surfaces[Math.floor(Math.random() * surfaces.length)]

    // Randomize track category based on distance
    const categories: Array<'sprint' | 'mixed' | 'distance' | 'cross_country'> =
      raceDistance <= 4 ? ['sprint'] :
      raceDistance <= 8 ? ['sprint', 'mixed'] :
      ['mixed', 'distance', 'cross_country']
    const randomCategory = categories[Math.floor(Math.random() * categories.length)]

    // Generate a test track with randomized properties
    const trackNames = [
      'Thunder Downs', 'Sprint Circuit', 'Championship Mile', 'Victory Valley',
      'Royal Raceway', 'Golden Gate Track', 'Desert Speedway', 'Mountain Ridge',
      'Coastal Course', 'Frozen Fields', 'Storm Track', 'Sunset Strip'
    ]
    const randomTrackName = trackNames[Math.floor(Math.random() * trackNames.length)]

    const track: Track = {
      id: 'test-track-1',
      name: randomTrackName,
      category: randomCategory,
      distance: raceDistance,
      surface: randomSurface,
      description: `A ${raceDistance} furlong ${randomSurface.replace('_', ' ')} track`,
      obstacles: [],
    }

    const inputs: RaceInputs = {
      type: 'race_inputs',
      entries,
      track,
      seed: `test-race-${Date.now()}`,
    }

    setRaceInputs(inputs)
    setResults(null)
  }

  const handleRaceComplete = (result: { placements: any[]; events: any[] }) => {
    setResults(result.placements)
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
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <label className="font-bold th-label">Race Distance:</label>
                <select
                  value={raceDistance}
                  onChange={(e) => setRaceDistance(Number(e.target.value))}
                  className="px-4 py-2 rounded-lg th-panel font-bold"
                >
                  <option value={2}>2 furlongs (Sprint - ~402m)</option>
                  <option value={4}>4 furlongs (Short - ~805m)</option>
                  <option value={6}>6 furlongs (Medium - ~1207m)</option>
                  <option value={8}>8 furlongs (Mile - ~1609m)</option>
                  <option value={10}>10 furlongs (Long - ~2012m)</option>
                  <option value={12}>12 furlongs (Classic - ~2414m)</option>
                </select>
              </div>
              <button
                onClick={startTestRace}
                className="th-button px-8 py-3 rounded-lg font-bold text-lg"
              >
                🎬 Start Test Race
              </button>
            </div>
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
              <div className="text-xs th-label space-y-1">
                <div>📍 {raceInputs.track.name}</div>
                <div>🏁 Category: {raceInputs.track.category}</div>
                <div>📏 Distance: {raceInputs.track.distance} furlongs ({(raceInputs.track.distance * 201.168).toFixed(0)}m)</div>
                <div>🌍 Surface: {raceInputs.track.surface.replace('_', ' ')}</div>
                {raceInputs.track.obstacles && raceInputs.track.obstacles.length > 0 && (
                  <div>🚧 Obstacles: {raceInputs.track.obstacles.length}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {results && raceInputs && (
          <div className="mt-6 th-panel rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Final Results</h2>
            <div className="space-y-2">
              {results.map((placement, idx) => {
                const entry = raceInputs.entries.find((e: any) => e.playerId === placement.playerId);
                return (
                  <div
                    key={placement.playerId}
                    className="th-panel-strong rounded-lg p-4 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold w-8">{placement.position}</div>
                      <div>
                        <div className="font-semibold">{entry?.horse?.name || 'Unknown'}</div>
                        <div className="text-xs th-label">@{placement.playerName}</div>
                        <div className="text-sm th-label">
                          Time: {(placement.finishTime / 1000).toFixed(2)}s
                        </div>
                      </div>
                    </div>
                    {placement.position === 1 && <div className="text-3xl">🏆</div>}
                    {placement.position === 2 && <div className="text-2xl">🥈</div>}
                    {placement.position === 3 && <div className="text-2xl">🥉</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
