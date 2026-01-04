'use client'

import { useState, ReactNode, useRef, useEffect, useCallback } from 'react'

interface InfoTooltipProps {
  title: string
  description: string
  children: ReactNode
  className?: string
}

export function InfoTooltip({ title, description, children, className = '' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Calculate position to keep tooltip within viewport
  const calculatePosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return

    const margin = 8
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Get actual tooltip dimensions if available, otherwise use estimates
    const tooltipRect = tooltipRef.current?.getBoundingClientRect()
    const tooltipWidth = tooltipRect?.width || 280
    const tooltipHeight = tooltipRect?.height || 80

    let x = clientX + 15
    let y = clientY + 15

    // Keep tooltip within horizontal bounds
    if (x + tooltipWidth > viewportWidth - margin) {
      x = clientX - tooltipWidth - 15
    }
    if (x < margin) {
      x = margin
    }

    // Keep tooltip within vertical bounds
    if (y + tooltipHeight > viewportHeight - margin) {
      y = clientY - tooltipHeight - 15
    }
    if (y < margin) {
      y = margin
    }

    setPosition({ x, y })
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    calculatePosition(e.clientX, e.clientY)
  }

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsVisible(true)
    calculatePosition(e.clientX, e.clientY)
  }

  const handleMouseLeave = () => {
    setIsVisible(false)
  }

  // Touch support - toggle on tap
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation() // Don't block scrolling, just stop event bubbling
    const touch = e.touches[0]
    calculatePosition(touch.clientX, touch.clientY)
    setIsVisible(!isVisible)
  }

  // Close tooltip when tapping elsewhere
  useEffect(() => {
    if (!isVisible) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsVisible(false)
      }
    }

    // Add listeners with a slight delay to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVisible])

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
    >
      <div className="cursor-help border-b border-dotted border-current">
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-60 bg-gray-900/95 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-700 pointer-events-none w-[calc(100vw-16px)] sm:w-auto sm:min-w-[200px] max-w-[280px]"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          <div className="text-sm font-bold text-blue-400 mb-1">
            {title}
          </div>
          <div className="text-xs text-gray-300 leading-relaxed">
            {description}
          </div>
        </div>
      )}
    </div>
  )
}
