'use client'

import { useEffect, useRef, useState } from 'react'

interface RaceEvent {
  tick: number
  playerId: string
  type: string
  description: string
}

interface RaceCommentaryProps {
  events: RaceEvent[]
  playerNames: Record<string, string> // playerId -> playerName mapping
  className?: string
}

export function RaceCommentary({ events, playerNames, className = '' }: RaceCommentaryProps) {
  const [visibleEvents, setVisibleEvents] = useState<RaceEvent[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const eventIndexRef = useRef(0)

  useEffect(() => {
    // Reset when events change (new race)
    setVisibleEvents([])
    eventIndexRef.current = 0

    if (events.length === 0) return

    // Show events gradually over time
    const interval = setInterval(() => {
      if (eventIndexRef.current < events.length) {
        const nextEvent = events[eventIndexRef.current]
        setVisibleEvents((prev) => [...prev, nextEvent])
        eventIndexRef.current++

        // Auto-scroll to bottom
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
      } else {
        clearInterval(interval)
      }
    }, 800) // Show new event every 800ms

    return () => clearInterval(interval)
  }, [events])

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'stumble':
        return '💥'
      case 'surge':
        return '⚡'
      case 'ability':
        return '✨'
      case 'trait':
        return '⭐'
      case 'strategy_change':
        return '🎯'
      case 'obstacle':
        return '🚧'
      case 'recovery':
        return '💪'
      default:
        return '📢'
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'stumble':
        return 'text-red-400'
      case 'surge':
      case 'ability':
      case 'trait':
        return 'text-green-400'
      case 'strategy_change':
        return 'text-blue-400'
      case 'obstacle':
        return 'text-yellow-400'
      case 'recovery':
        return 'text-purple-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className={`th-panel rounded-lg p-4 ${className}`}>
      <h3 className="text-xl font-bold th-title mb-3">📻 Race Commentary</h3>

      <div
        ref={containerRef}
        className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      >
        {visibleEvents.length === 0 && (
          <div className="text-center text-gray-500 py-8 italic">
            Waiting for race to begin...
          </div>
        )}

        {visibleEvents.map((event, index) => {
          const playerName = playerNames[event.playerId] || 'Unknown'
          const icon = getEventIcon(event.type)
          const colorClass = getEventColor(event.type)

          return (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 bg-gray-900/50 rounded border border-gray-700 ${colorClass}`}
              style={{
                animation: 'slideInLeft 0.3s ease-out',
              }}
            >
              <span className="text-2xl flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{playerName}</div>
                <div className="text-xs text-gray-300">{event.description}</div>
              </div>
              <div className="text-xs text-gray-500 flex-shrink-0">
                {Math.floor(event.tick / 10)}s
              </div>
            </div>
          )
        })}
      </div>

      <style jsx>{`
        @keyframes slideInLeft {
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
