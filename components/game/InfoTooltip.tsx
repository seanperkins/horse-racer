'use client'

import { useState, ReactNode, useRef, useEffect } from 'react'

interface InfoTooltipProps {
  title: string
  description: string
  children: ReactNode
  className?: string
}

export function InfoTooltip({ title, description, children, className = '' }: InfoTooltipProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      <div className="cursor-help border-b border-dotted border-current">
        {children}
      </div>

      {isHovered && (
        <div
          className="fixed z-50 bg-gray-900/95 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-700 pointer-events-none min-w-[200px] max-w-xs"
          style={{
            left: `${mousePos.x + (containerRef.current?.getBoundingClientRect().left || 0) + 15}px`,
            top: `${mousePos.y + (containerRef.current?.getBoundingClientRect().top || 0) + 15}px`,
          }}
        >
          <div className="text-sm font-bold text-blue-400 mb-1">
            {title}
          </div>
          <div className="text-xs text-gray-300">
            {description}
          </div>
        </div>
      )}
    </div>
  )
}
