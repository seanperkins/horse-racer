'use client'

import { useState } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import { PixiRaceRenderer } from './PixiRaceRenderer'
import type { RaceOutcome } from '@/types/game'

export function RacePhase() {
  const { raceInputs } = useGameStore()
  const [simulationResult, setSimulationResult] = useState<RaceOutcome | null>(null)

  const handleRaceEvent = (_events: any[]) => {
    // Commentary hidden for now
  }

  const handleRaceComplete = (result: { placements: any[]; events: any[] }) => {
    setSimulationResult({
      placements: result.placements,
      events: result.events,
    })
  }

  return (
    <div className="min-h-screen p-8 th-bg">
      <div className="max-w-7xl mx-auto">
        {raceInputs && !simulationResult && (
          <div className="th-panel rounded-lg p-8">
            <PixiRaceRenderer
              raceInputs={raceInputs}
              onRaceComplete={handleRaceComplete}
              onRaceEvent={handleRaceEvent}
            />
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
