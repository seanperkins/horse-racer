'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useGameStore } from '@/lib/store/gameStore'

export interface KeyboardShortcut {
  key: string
  description: string
  action: () => void
  modifier?: 'ctrl' | 'alt' | 'shift'
  devOnly?: boolean
}

export interface KeyboardShortcutsConfig {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

// Check if the active element is an input field
function isInputFocused(): boolean {
  const activeElement = document.activeElement
  if (!activeElement) return false

  const tagName = activeElement.tagName.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    activeElement.getAttribute('contenteditable') === 'true'
  )
}

// Global keyboard shortcuts hook - mount once at top level
export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const { shortcuts, enabled = true } = config
  const shortcutsRef = useRef(shortcuts)

  // Keep ref updated
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if input is focused (unless it's Escape)
    if (isInputFocused() && event.key !== 'Escape') {
      return
    }

    for (const shortcut of shortcutsRef.current) {
      // Skip dev-only shortcuts in production
      if (shortcut.devOnly && process.env.NODE_ENV === 'production') {
        continue
      }

      // Check modifier requirements
      const modifierMatches =
        (!shortcut.modifier && !event.ctrlKey && !event.altKey && !event.metaKey) ||
        (shortcut.modifier === 'ctrl' && (event.ctrlKey || event.metaKey)) ||
        (shortcut.modifier === 'alt' && event.altKey) ||
        (shortcut.modifier === 'shift' && event.shiftKey)

      // Check key match (case-insensitive for letters)
      const keyMatches =
        event.key.toLowerCase() === shortcut.key.toLowerCase() ||
        event.code === shortcut.key

      if (modifierMatches && keyMatches) {
        event.preventDefault()
        shortcut.action()
        return
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}

// Phase-specific shortcut configurations
export function getPhaseShortcuts(
  phase: string,
  callbacks: Record<string, () => void>
): KeyboardShortcut[] {
  const shortcuts: KeyboardShortcut[] = []

  // Global shortcuts (always available)
  if (callbacks.closeModal) {
    shortcuts.push({
      key: 'Escape',
      description: 'Close modal',
      action: callbacks.closeModal,
    })
  }

  switch (phase) {
    case 'lobby':
      if (callbacks.toggleReady) {
        shortcuts.push({
          key: 'Enter',
          description: 'Ready/Unready',
          action: callbacks.toggleReady,
        })
      }
      if (callbacks.copyCode) {
        shortcuts.push({
          key: 'c',
          description: 'Copy room code',
          action: callbacks.copyCode,
        })
      }
      break

    case 'shop':
      if (callbacks.shopTab) {
        shortcuts.push({
          key: '1',
          description: 'Shop tab',
          action: callbacks.shopTab,
        })
      }
      if (callbacks.inventoryTab) {
        shortcuts.push({
          key: '2',
          description: 'Inventory tab',
          action: callbacks.inventoryTab,
        })
      }
      if (callbacks.reroll) {
        shortcuts.push({
          key: 'e',
          description: 'Reroll shop',
          action: callbacks.reroll,
        })
      }
      if (callbacks.expandStable) {
        shortcuts.push({
          key: 'x',
          description: 'Expand stable',
          action: callbacks.expandStable,
        })
      }
      if (callbacks.debug) {
        shortcuts.push({
          key: 'd',
          modifier: 'ctrl',
          description: 'Debug (dev only)',
          action: callbacks.debug,
          devOnly: true,
        })
      }
      break

    case 'preparation':
      // Horse selection (1-9)
      for (let i = 1; i <= 9; i++) {
        const selectHorse = callbacks[`selectHorse${i}`]
        if (selectHorse) {
          shortcuts.push({
            key: String(i),
            description: `Select horse ${i}`,
            action: selectHorse,
          })
        }
      }
      if (callbacks.cyclePreset) {
        shortcuts.push({
          key: 'p',
          description: 'Cycle strategy preset',
          action: callbacks.cyclePreset,
        })
      }
      if (callbacks.confirmEntry) {
        shortcuts.push({
          key: 'Enter',
          description: 'Confirm entry',
          action: callbacks.confirmEntry,
        })
      }
      break

    case 'betting':
      if (callbacks.betWin) {
        shortcuts.push({
          key: 'w',
          description: 'Win bet',
          action: callbacks.betWin,
        })
      }
      if (callbacks.betPlace) {
        shortcuts.push({
          key: 'p',
          description: 'Place bet',
          action: callbacks.betPlace,
        })
      }
      if (callbacks.betExacta) {
        shortcuts.push({
          key: 'x',
          description: 'Exacta bet',
          action: callbacks.betExacta,
        })
      }
      if (callbacks.increaseBet) {
        shortcuts.push({
          key: '=',
          description: 'Increase bet',
          action: callbacks.increaseBet,
        })
      }
      if (callbacks.decreaseBet) {
        shortcuts.push({
          key: '-',
          description: 'Decrease bet',
          action: callbacks.decreaseBet,
        })
      }
      // Entry selection (1-9)
      for (let i = 1; i <= 9; i++) {
        const selectEntry = callbacks[`selectEntry${i}`]
        if (selectEntry) {
          shortcuts.push({
            key: String(i),
            description: `Select entry ${i}`,
            action: selectEntry,
          })
        }
      }
      if (callbacks.placeBet) {
        shortcuts.push({
          key: 'Enter',
          description: 'Place bet',
          action: callbacks.placeBet,
        })
      }
      if (callbacks.skipBetting) {
        shortcuts.push({
          key: 'k',
          description: 'Skip betting',
          action: callbacks.skipBetting,
        })
      }
      break

    case 'racing':
      if (callbacks.toggleSpeed) {
        shortcuts.push({
          key: ' ',
          description: 'Toggle speed',
          action: callbacks.toggleSpeed,
        })
      }
      if (callbacks.toggleLog) {
        shortcuts.push({
          key: 'l',
          description: 'Toggle race log',
          action: callbacks.toggleLog,
        })
      }
      break

    case 'results':
      if (callbacks.ready) {
        shortcuts.push({
          key: 'Enter',
          description: 'Ready for next',
          action: callbacks.ready,
        })
      }
      break
  }

  return shortcuts
}

// Hook to get active shortcuts for UI display
export function useActiveShortcuts(): Map<string, string> {
  const currentPhase = useGameStore((state) => state.currentPhase)

  const phaseShortcuts: Record<string, Record<string, string>> = {
    lobby: {
      Enter: 'Ready/Unready',
      C: 'Copy code',
    },
    shop: {
      '1': 'Shop',
      '2': 'Inventory',
      E: 'Reroll',
      X: 'Expand',
    },
    preparation: {
      '1-9': 'Select horse',
      P: 'Cycle preset',
      Enter: 'Confirm',
    },
    betting: {
      W: 'Win',
      P: 'Place',
      X: 'Exacta',
      '1-9': 'Select entry',
      '+/-': 'Bet amount',
      Enter: 'Place bet',
      K: 'Skip',
    },
    racing: {
      Space: 'Speed',
      L: 'Log',
    },
    results: {
      Enter: 'Ready',
    },
  }

  return new Map(
    Object.entries(phaseShortcuts[currentPhase] || {})
  )
}
