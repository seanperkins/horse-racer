'use client'

interface RaceEvent {
  tick: number
  playerId: string
  playerName: string
  type: string
  description: string
}

interface RaceEventLogProps {
  events: RaceEvent[]
}

export function RaceEventLog({ events }: RaceEventLogProps) {
  return (
    <div className="th-panel-strong rounded-lg p-4">
      <h3 className="text-base md:text-lg font-bold mb-3 flex items-center gap-2">
        📋 Race Events
      </h3>
      <div className="space-y-2 max-h-48 md:max-h-60 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-xs md:text-sm th-label text-center py-4">
            Race events will appear here...
          </div>
        ) : (
          events.map((event, idx) => (
            <div
              key={`${event.tick}-${event.playerId}-${idx}`}
              className={`text-xs md:text-sm p-2 rounded ${
                event.type === 'stumble'
                  ? 'bg-red-900/30 border-l-4 border-red-500'
                  : 'bg-blue-900/30 border-l-4 border-blue-500'
              }`}
              style={{
                animation: `fadeIn 0.3s ease-out`,
              }}
            >
              <div className="font-semibold text-xs th-label mb-1">Tick {event.tick}</div>
              <div className="text-white">
                <span className="font-bold">{event.playerName}:</span> {event.description}
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
