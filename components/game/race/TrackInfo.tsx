'use client'

interface TrackInfoProps {
  track: {
    name: string
    distance: number
    surface: string
    category: string
    obstacles?: any[]
  }
  maxWidth?: number
}

export function TrackInfo({ track, maxWidth }: TrackInfoProps) {
  return (
    <div
      className="w-full th-panel-strong rounded-lg px-3 md:px-4 py-2 md:py-3"
      style={{ maxWidth }}
    >
      <div className="flex items-center gap-3 md:gap-4 flex-wrap text-xs md:text-sm">
        <div className="flex items-center gap-2">
          <span className="text-base md:text-lg">🏁</span>
          <span className="font-bold">{track.name}</span>
        </div>
        <div className="th-label">
          <span className="font-semibold">Distance:</span> {track.distance} furlongs
        </div>
        <div className="th-label">
          <span className="font-semibold">Surface:</span> {track.surface.replace(/_/g, ' ')}
        </div>
        <div className="th-label">
          <span className="font-semibold">Category:</span> {track.category}
        </div>
        {track.obstacles && track.obstacles.length > 0 && (
          <div className="th-label">
            <span className="font-semibold">Obstacles:</span> {track.obstacles.length}
          </div>
        )}
      </div>
    </div>
  )
}
