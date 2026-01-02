'use client'

interface HorsesListProps {
  entries: Array<{
    playerId: string
    playerName: string
    horse: {
      name: string
      tier: number
      stats: {
        speed: number
        stamina: number
        grit: number
      }
    }
    jockey: {
      name: string
    }
  }>
}

export function HorsesList({ entries }: HorsesListProps) {
  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div key={entry.playerId} className="th-panel rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="font-bold text-sm">Lane {i + 1}:</div>
            <div className="text-sm truncate">{entry.playerName}</div>
          </div>
          <div className="text-xs th-label space-y-1">
            <div className="truncate">
              🐴 {entry.horse.name} (T{entry.horse.tier})
            </div>
            <div className="truncate">🏇 {entry.jockey.name}</div>
            <div className="flex gap-2 text-xs">
              <span>SPD:{entry.horse.stats.speed}</span>
              <span>STA:{entry.horse.stats.stamina}</span>
              <span>GRT:{entry.horse.stats.grit}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
