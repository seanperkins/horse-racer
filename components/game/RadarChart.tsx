'use client'

import { useMemo, useState } from 'react'

interface RadarChartProps {
  stats: Record<string, number>
  maxStats?: Record<string, number>
  maxValue?: number
  size?: number
  showLabels?: boolean
  className?: string
  statLabels?: Record<string, string> // Full names for stats (e.g., { spd: 'Speed', sta: 'Stamina' })
  statDescriptions?: Record<string, string> // Descriptions of what each stat does
}

export function RadarChart({
  stats,
  maxStats,
  maxValue = 10,
  size = 120,
  showLabels = true,
  className = '',
  statLabels = {},
  statDescriptions = {},
}: RadarChartProps) {
  const statKeys = Object.keys(stats)
  const numStats = statKeys.length
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

  // Calculate radar chart points
  const { currentPoints, maxPoints, labelPositions } = useMemo(() => {
    const centerX = size / 2
    const centerY = size / 2
    const radius = (size / 2) - 40

    const angleStep = (Math.PI * 2) / numStats
    const startAngle = -Math.PI / 2 // Start at top

    const currentPts: Array<{ x: number; y: number }> = []
    const maxPts: Array<{ x: number; y: number }> = []
    const labelPos: Array<{ x: number; y: number; label: string; value: number; maxValue?: number }> = []

    statKeys.forEach((key, i) => {
      const angle = startAngle + angleStep * i
      const currentValue = stats[key]
      const maxStatValue = maxStats?.[key]

      // Current stat point
      const currentRatio = Math.min(currentValue / maxValue, 1)
      const currentR = radius * currentRatio
      currentPts.push({
        x: centerX + currentR * Math.cos(angle),
        y: centerY + currentR * Math.sin(angle),
      })

      // Max potential point (if provided)
      if (maxStatValue !== undefined) {
        const maxRatio = Math.min(maxStatValue / maxValue, 1)
        const maxR = radius * maxRatio
        maxPts.push({
          x: centerX + maxR * Math.cos(angle),
          y: centerY + maxR * Math.sin(angle),
        })
      }

      // Label position (slightly outside the max radius)
      const labelR = radius + 35
      labelPos.push({
        x: centerX + labelR * Math.cos(angle),
        y: centerY + labelR * Math.sin(angle),
        label: statLabels[key] || key.toUpperCase(),
        value: currentValue,
        maxValue: maxStatValue,
      })
    })

    return {
      currentPoints: currentPts,
      maxPoints: maxPts,
      labelPositions: labelPos,
    }
  }, [stats, maxStats, maxValue, size, numStats, statKeys])

  // Convert points array to SVG path
  const pointsToPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return ''
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  }

  // Draw background grid circles
  const gridCircles = [0.25, 0.5, 0.75, 1].map((ratio) => {
    const r = ((size / 2) - 40) * ratio
    return (
      <circle
        key={ratio}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.3"
      />
    )
  })

  // Draw axis lines
  const axisLines = labelPositions.map((pos, i) => (
    <line
      key={i}
      x1={size / 2}
      y1={size / 2}
      x2={pos.x}
      y2={pos.y}
      stroke="currentColor"
      strokeWidth="0.5"
      opacity="0.3"
    />
  ))

  return (
    <div className={`relative ${className}`} style={{ padding: '30px' }}>
      <svg width={size} height={size} className="text-gray-400" style={{ overflow: 'visible' }}>
        {/* Background grid */}
        {gridCircles}
        {axisLines}

        {/* Max potential polygon (if provided) */}
        {maxPoints.length > 0 && (
          <path
            d={pointsToPath(maxPoints)}
            fill="rgba(59, 130, 246, 0.15)"
            stroke="rgb(96, 165, 250)"
            strokeWidth="2.5"
            strokeDasharray="5,5"
          />
        )}

        {/* Current stats polygon */}
        <path
          d={pointsToPath(currentPoints)}
          fill="rgba(34, 197, 94, 0.3)"
          stroke="rgb(34, 197, 94)"
          strokeWidth="2"
        />

        {/* Current stat points with hover */}
        {currentPoints.map((p, i) => (
          <g key={i}>
            {/* Larger invisible hit area for easier hovering */}
            <circle
              cx={p.x}
              cy={p.y}
              r="8"
              fill="transparent"
              onMouseEnter={() => setHoveredPoint(i)}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{ cursor: 'pointer' }}
            />
            {/* Visible point */}
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredPoint === i ? "5" : "3"}
              fill="rgb(34, 197, 94)"
              stroke={hoveredPoint === i ? "white" : "none"}
              strokeWidth={hoveredPoint === i ? "2" : "0"}
              style={{ transition: 'all 0.2s', pointerEvents: 'none' }}
            />
          </g>
        ))}

        {/* Labels with hover areas */}
        {showLabels && labelPositions.map((pos, i) => {
          const isLeft = pos.x < size / 2 - 5
          const isRight = pos.x > size / 2 + 5
          const isTop = pos.y < size / 2 - 5
          const isBottom = pos.y > size / 2 + 5
          const isSide = isLeft || isRight

          const textAnchor = isLeft ? 'end' : isRight ? 'start' : 'middle'
          const rotation = isSide ? (isLeft ? -90 : 90) : 0

          return (
            <g key={i} transform={`rotate(${rotation}, ${pos.x}, ${pos.y})`}>
              {/* Invisible hover area for labels */}
              <rect
                x={pos.x - 30}
                y={pos.y - 25}
                width={60}
                height={50}
                fill="transparent"
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: 'pointer' }}
              />
              {/* Stat name */}
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dy="-0.8em"
                className="text-[18px] font-bold fill-current"
                style={{ textShadow: '0 0 4px rgba(0,0,0,0.9)', pointerEvents: 'none' }}
              >
                {pos.label}
              </text>
              {/* Current value */}
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dy="0.9em"
                className="text-[20px] font-bold fill-green-400"
                style={{ textShadow: '0 0 5px rgba(0,0,0,1)', pointerEvents: 'none' }}
              >
                {pos.value}
              </text>
              {/* Max trainable value */}
              {pos.maxValue !== undefined && (
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dy="2.5em"
                  className="text-[15px] font-bold fill-blue-300"
                  style={{ textShadow: '0 0 4px rgba(0,0,0,0.9)', pointerEvents: 'none' }}
                >
                  (max: {pos.maxValue})
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hoveredPoint !== null && (
        <div
          className="absolute bg-gray-900/95 text-white px-4 py-3 rounded-lg shadow-lg border border-gray-700 pointer-events-none z-10 max-w-sm"
          style={{
            left: '50%',
            top: '-10px',
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="text-base font-bold text-green-400 mb-2">
            {statLabels[statKeys[hoveredPoint]] || statKeys[hoveredPoint].toUpperCase()}
          </div>
          <div className="text-base font-bold mb-1">
            Current: {labelPositions[hoveredPoint].value}
          </div>
          {labelPositions[hoveredPoint].maxValue !== undefined && (
            <div className="text-sm text-blue-400 mb-2">
              Max Trainable: {labelPositions[hoveredPoint].maxValue}
            </div>
          )}
          {statDescriptions[statKeys[hoveredPoint]] && (
            <div className="text-sm text-gray-300 mt-2 pt-2 border-t border-gray-600">
              {statDescriptions[statKeys[hoveredPoint]]}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {maxStats && (
        <div className="absolute bottom-0 left-0 right-0 flex gap-3 justify-center text-[13px] font-semibold">
          <div className="flex items-center gap-2 bg-gray-900/90 px-3 py-1.5 rounded">
            <div className="w-4 h-4 bg-green-400 rounded-full"></div>
            <span className="text-green-400">Current</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-900/90 px-3 py-1.5 rounded">
            <div className="w-4 h-1.5 bg-blue-300 rounded" style={{ background: 'repeating-linear-gradient(90deg, rgb(147, 197, 253) 0px, rgb(147, 197, 253) 5px, transparent 5px, transparent 10px)' }}></div>
            <span className="text-blue-300">Max</span>
          </div>
        </div>
      )}
    </div>
  )
}
