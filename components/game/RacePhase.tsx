'use client'

import { useState, useMemo } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import { PixiRaceRenderer } from './PixiRaceRenderer'
import { RaceCommentary } from './RaceCommentary'
import type { RaceOutcome } from '@/types/game'

export function RacePhase() {
  const { currentRound, raceInputs, raceResults } = useGameStore()
  const [simulationResult, setSimulationResult] = useState<RaceOutcome | null>(null)
  const [raceEvents, setRaceEvents] = useState<any[]>([])

  // Build player name mapping from race inputs
  const playerNames = useMemo(() => {
    if (!raceInputs) return {}
    const mapping: Record<string, string> = {}
    raceInputs.entries.forEach((entry) => {
      mapping[entry.playerId] = entry.playerName
    })
    return mapping
  }, [raceInputs])

  const handleRaceComplete = (result: { placements: any[]; events: any[] }) => {
    setSimulationResult({
      placements: result.placements,
      events: result.events,
    })
    setRaceEvents(result.events)
  }

  return (
    <div className="min-h-screen p-8 th-bg">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl th-title text-center mb-8">
          Race {currentRound} - In Progress
        </h1>

        {raceInputs && !simulationResult && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Race visualization - takes up 2/3 of width on large screens */}
            <div className="lg:col-span-2">
              <div className="th-panel rounded-lg p-8">
                <PixiRaceRenderer raceInputs={raceInputs} onRaceComplete={handleRaceComplete} />
              </div>
            </div>

            {/* Race commentary - takes up 1/3 of width on large screens */}
            <div className="lg:col-span-1">
              <RaceCommentary
                events={raceEvents}
                playerNames={playerNames}
              />
            </div>
          </div>
        )}

        {!raceInputs && !simulationResult && (
          <div className="th-panel rounded-lg p-12">
            <div className="text-6xl mb-6 text-center animate-bounce">🐎</div>
            <h2 className="text-2xl font-bold mb-4 text-center">Waiting for race data...</h2>
            <p className="th-label text-center">
              The race will begin shortly. Get ready to watch the action!
            </p>
          </div>
        )}

        {simulationResult && (
          <div className="th-panel rounded-lg p-8">
            <h3 className="text-xl font-bold mb-6 text-center">Final Results</h3>
            <div className="space-y-2">
              {simulationResult.placements.map((placement, idx) => (
                <div
                  key={placement.playerId}
                  className="th-panel-strong rounded-lg p-4 flex justify-between items-center"
                  style={{
                    animation: `slideIn 0.5s ease-out ${idx * 0.1}s both`,
                  }}
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

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
