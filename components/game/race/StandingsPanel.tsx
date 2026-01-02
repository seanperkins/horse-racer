'use client'

interface StandingsPanelProps {
  podium: Array<{ playerId: string; playerName: string }>
}

export function StandingsPanel({ podium }: StandingsPanelProps) {
  return (
    <div className="space-y-3">
      {/* 1st Place */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-900/30 border-2 border-yellow-500">
        <div className="text-3xl">🏆</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">1st Place</div>
          {podium[0] ? (
            <div className="text-xs th-label truncate">{podium[0].playerName}</div>
          ) : (
            <div className="text-xs th-label">Waiting...</div>
          )}
        </div>
      </div>

      {/* 2nd Place */}
      <div className="flex items-center gap-3 p-3 rounded-lg th-panel">
        <div className="text-2xl">🥈</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">2nd Place</div>
          {podium[1] ? (
            <div className="text-xs th-label truncate">{podium[1].playerName}</div>
          ) : (
            <div className="text-xs th-label">Waiting...</div>
          )}
        </div>
      </div>

      {/* 3rd Place */}
      <div className="flex items-center gap-3 p-3 rounded-lg th-panel">
        <div className="text-2xl">🥉</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">3rd Place</div>
          {podium[2] ? (
            <div className="text-xs th-label truncate">{podium[2].playerName}</div>
          ) : (
            <div className="text-xs th-label">Waiting...</div>
          )}
        </div>
      </div>
    </div>
  )
}
