'use client'

interface KeyboardHintProps {
  shortcut: string
  className?: string
  size?: 'sm' | 'md'
}

export function KeyboardHint({ shortcut, className = '', size = 'sm' }: KeyboardHintProps) {
  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1 py-0.5 min-w-[18px]'
    : 'text-xs px-1.5 py-0.5 min-w-[22px]'

  return (
    <kbd
      className={`
        inline-flex items-center justify-center
        font-mono font-medium
        bg-[var(--bg-secondary)] border border-[var(--outline)]
        rounded
        ${sizeClasses}
        ${className}
      `}
    >
      {shortcut}
    </kbd>
  )
}

// Helper component to show shortcut hint next to a button
interface ShortcutHintProps {
  shortcut: string
  description?: string
  className?: string
}

export function ShortcutHint({ shortcut, description, className = '' }: ShortcutHintProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs th-label ${className}`}>
      <KeyboardHint shortcut={shortcut} />
      {description && <span>{description}</span>}
    </span>
  )
}

// Panel showing all active shortcuts for current phase
interface ShortcutPanelProps {
  shortcuts: Map<string, string>
  collapsed?: boolean
  className?: string
}

export function ShortcutPanel({ shortcuts, collapsed = false, className = '' }: ShortcutPanelProps) {
  if (shortcuts.size === 0) return null

  if (collapsed) {
    return (
      <div className={`flex items-center gap-2 text-xs th-label ${className}`}>
        <span>Shortcuts:</span>
        {Array.from(shortcuts.entries()).slice(0, 3).map(([key]) => (
          <KeyboardHint key={key} shortcut={key} />
        ))}
        {shortcuts.size > 3 && <span>+{shortcuts.size - 3}</span>}
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-1 text-xs ${className}`}>
      {Array.from(shortcuts.entries()).map(([key, description]) => (
        <div key={key} className="flex items-center gap-2">
          <KeyboardHint shortcut={key} />
          <span className="th-label">{description}</span>
        </div>
      ))}
    </div>
  )
}
