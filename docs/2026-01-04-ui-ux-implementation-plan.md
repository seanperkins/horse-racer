# UI/UX Improvements Implementation Plan

Based on [docs/ui-ux-review.md](ui-ux-review.md) - addressing all 5 issues plus comprehensive keyboard shortcuts.

## Summary of Changes

| Issue | Severity | Summary |
|-------|----------|---------|
| #1 Betting Skip State | HIGH | Sync header "Skip Betting" with betting UI via store |
| #2 Debug Hotkey | MEDIUM | Gate Ctrl+D behind NODE_ENV, replace with shortcut system |
| #3 Duplicate Confirm | MEDIUM | Single button, entry lock state, "Entry Locked" summary |
| #4 Strategy Impact | MEDIUM | Full stat breakdown panel with terrain alignment |
| #5 Synergy Tracker | LOW | Collapsible bloodline panel with breakpoints |
| Keyboard Shortcuts | - | Phase-aware shortcuts with inline button hints |

---

## Phase 1: Store Changes

**File:** `lib/store/gameStore.ts`

Add to interface (after line 64):
```typescript
bettingStatus: 'open' | 'submitted' | 'skipped'
entryStatus: 'open' | 'submitted'
lastSubmittedEntry: SubmittedEntry | null
setBettingStatus: (status: 'open' | 'submitted' | 'skipped') => void
setEntryStatus: (status: 'open' | 'submitted', entry?: SubmittedEntry) => void
```

Add a type (near other types/interfaces):
```typescript
type SubmittedEntry = {
  horse: Horse | null
  jockey: Jockey | null
  equipment: {
    // match current entry payload shape for equipment slots
  }
  strategy: RaceStrategy
}
```

Add to initialState (after line 122):
```typescript
bettingStatus: 'open',
entryStatus: 'open',
lastSubmittedEntry: null,
```

Modify `setGamePhase` (line 140) to reset statuses:
- When entering `betting` phase: reset `bettingStatus: 'open'`
- When entering `preparation` phase: reset `entryStatus: 'open'`, `lastSubmittedEntry: null`

---

## Phase 2: New Hooks

### 2.1 useKeyboardShortcuts
**New file:** `lib/hooks/useKeyboardShortcuts.ts`

- Reads `currentPhase` from store
- Registers phase-specific keyboard listeners
- Gates debug shortcuts behind `process.env.NODE_ENV !== 'production'`
- Ignores shortcuts when focus is in input/textarea/select
- Returns `activeShortcuts: Map<string, string>` for UI hints
- Single owner: mount once in the main game container (do not mount per-phase) to avoid duplicate listeners

### 2.2 useSynergyTracker
**New file:** `lib/hooks/useSynergyTracker.ts`

- Uses `horses` from store
- Counts bloodlines, calculates breakpoints from `calculateBloodlineBonuses` or a config (avoid hardcoding 2+/3+)
- References `calculateBloodlineBonuses` from `game/stats.ts` (line 415)
- Returns: bloodline counts, active bonuses, next breakpoint hints

### 2.3 useStrategyImpact
**New file:** `lib/hooks/useStrategyImpact.ts`

- Takes horse, jockey, equipment, strategy, track, playerHorses
- Uses `calculateDerivedStats` and `calculateBloodlineBonuses` from `game/stats.ts`
- Returns: base stats, modifier breakdown, effective stats, terrain alignment, strategy impact per phase

---

## Phase 3: New Components

### 3.1 KeyboardHint
**New file:** `components/game/KeyboardHint.tsx`

Small inline kbd element for buttons: `<button>Confirm Entry <KeyboardHint shortcut="Enter" /></button>`

### 3.2 SynergyTracker
**New file:** `components/game/SynergyTracker.tsx`

Collapsible panel showing:
- Bloodline counts with progress indicators (●●○)
- Active breakpoint bonuses (checkmark)
- Next breakpoint hints ("1 more for +1 Stamina")

### 3.3 StrategyImpactPanel
**New file:** `components/game/StrategyImpactPanel.tsx`

Full breakdown panel:
- Base stats → equipment mods → bloodline bonuses → final stats
- Terrain alignment indicator (bonus/neutral/penalty)
- Strategy impact per phase (start/mid/finish speed% and drain%)

---

## Phase 4: Component Modifications

### 4.1 BettingPhase.tsx (Issue #1)
**File:** `components/game/BettingPhase.tsx`

1. Import `bettingStatus, setBettingStatus` from store
2. Remove local `betPlaced` state (line 35), use `bettingStatus !== 'open'`
3. Update `handlePlaceBet` to call `setBettingStatus('submitted')`
4. Update `handleSkip` to call `setBettingStatus('skipped')` (no bet sent)
5. Show "Bet Placed" or "Betting Skipped" state when locked
6. Add keyboard shortcuts: W/P/X (bet type), +/- (amount), Enter (place), K (skip)

### 4.2 UniversalHeader.tsx (Issue #1)
**File:** `components/game/UniversalHeader.tsx`

1. Import `bettingStatus, setBettingStatus` from store
2. In `handleToggleReady` for betting phase (line 73): call `setBettingStatus('skipped')` before `sendMessage` only when `bettingStatus === 'open'`
3. Disable button when `bettingStatus !== 'open'`

### 4.3 PreparationPhase.tsx (Issues #3, #4, #5)
**File:** `components/game/PreparationPhase.tsx`

1. Import `entryStatus, setEntryStatus, lastSubmittedEntry` from store
2. **Remove** duplicate "Confirm Entry" button at top (lines 111-118)
3. Update `handleSubmit` to call `setEntryStatus('submitted', {...})` and store entry
4. When `entryStatus === 'submitted'`: hide controls, show "Entry Locked" summary card
5. Disable prep shortcuts when `entryStatus === 'submitted'` (avoid accidental changes)
6. Add `SynergyTracker` component above horse selection
7. Add `StrategyImpactPanel` in strategy column (right side)
8. Add keyboard shortcuts: 1-9 (select horse), P (cycle preset), Enter (confirm)

### 4.4 ShopPhase.tsx (Issues #2, #5)
**File:** `components/game/ShopPhase.tsx`

1. Gate Ctrl+D handler (lines 111-155) with `if (process.env.NODE_ENV === 'production') return`
2. Remove debug hint from UI (lines 161-163)
3. Add `SynergyTracker` component above shop content
4. Add keyboard shortcuts: 1/2 (tabs), E (reroll)

### 4.5 Other Phase Components

**Lobby.tsx:** Add shortcuts - Enter (ready), C (copy code)
**RacePhase.tsx:** Add shortcuts - Space (toggle speed), L (toggle log)
**ResultsPhase.tsx:** Add shortcuts - Enter (ready)

---

## Implementation Order

1. **gameStore.ts** - Add new state fields and reset logic
2. **useKeyboardShortcuts.ts** - Create hook
3. **KeyboardHint.tsx** - Create component
4. **BettingPhase.tsx + UniversalHeader.tsx** - Fix betting state sync (Issue #1)
5. **useSynergyTracker.ts** - Create hook
6. **SynergyTracker.tsx** - Create component
7. **ShopPhase.tsx** - Gate debug hotkey, add synergy tracker (Issues #2, #5)
8. **useStrategyImpact.ts** - Create hook
9. **StrategyImpactPanel.tsx** - Create component
10. **PreparationPhase.tsx** - Entry lock, synergy tracker, strategy panel (Issues #3, #4, #5)
11. **Remaining shortcuts** - Lobby, Race, Results phases

---

## Keyboard Shortcuts Reference

| Phase | Key | Action |
|-------|-----|--------|
| Global | `Esc` | Close modals |
| Lobby | `Enter` | Ready/unready |
| Lobby | `C` | Copy room code |
| Shop | `1` / `2` | Shop/Inventory tabs |
| Shop | `E` | Reroll |
| Prep | `1-9` | Select horse |
| Prep | `P` | Cycle preset |
| Prep | `Enter` | Confirm entry |
| Betting | `W` / `P` / `X` | Win/Place/Exacta |
| Betting | `+` / `-` | Bet amount |
| Betting | `1-9` | Select entry |
| Betting | `Enter` | Place bet |
| Betting | `K` | Skip betting |
| Race | `Space` | Toggle speed |
| Race | `L` | Toggle log |
| Results | `Enter` | Ready |

---

## Shortcut UI Behavior

- Keyboard shortcuts should be inline hints only (no global help overlay)
- Use `KeyboardHint` in buttons/labels for discoverability, showing only shortcuts relevant to the current phase

---

## Critical Files

- `lib/store/gameStore.ts` - Core state
- `game/stats.ts` - `calculateBloodlineBonuses`, `calculateDerivedStats`
- `components/game/BettingPhase.tsx` - Betting UI
- `components/game/UniversalHeader.tsx` - Header sync
- `components/game/PreparationPhase.tsx` - Entry + panels
- `components/game/ShopPhase.tsx` - Debug hotkey + synergy
