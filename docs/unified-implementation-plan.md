# Unified Implementation Plan

Combines UI/UX improvements from [ui-ux-review.md](ui-ux-review.md) with economy redesign from [economy-redesign-exploration.md](economy-redesign-exploration.md).

---

## Summary of All Changes

### UI/UX Issues
| Issue | Severity | Summary |
|-------|----------|---------|
| #1 Betting Skip State | HIGH | Sync header "Skip Betting" with betting UI via store |
| #2 Debug Hotkey | MEDIUM | Gate Ctrl+D behind NODE_ENV |
| #3 Duplicate Confirm | MEDIUM | Single button, entry lock state |
| #4 Strategy Impact | MEDIUM | Full stat breakdown panel |
| #5 Synergy Tracker | LOW | Bloodline panel with breakpoints |
| Keyboard Shortcuts | - | Phase-aware shortcuts with inline hints |

### Economy Changes
| Change | Summary |
|--------|---------|
| Prestige currency | Earned from betting wins, spent on progression |
| Stable slots | Start with 1, expand to max 3 using Prestige |
| Betting payout | Pays Prestige instead of gold |
| Catch-up mechanic | Lose heart = gain 1 Prestige |
| Participation penalty | Must submit race entry or lose 1 heart |

---

## Phase 1: Foundation (Store + Types)

### 1.1 Type Definitions
**File:** `types/game.ts`

Add new types:
```typescript
// Submitted race entry for tracking
type SubmittedEntry = {
  horse: Horse | null
  jockey: Jockey | null
  equipment: { saddle?: Equipment; horseshoes?: Equipment; blinders?: Equipment }
  strategy: RaceStrategy
}
```

### 1.2 Game Store Changes
**File:** `lib/store/gameStore.ts`

Add to interface:
```typescript
// UI/UX state
bettingStatus: 'open' | 'submitted' | 'skipped'
entryStatus: 'open' | 'submitted'
lastSubmittedEntry: SubmittedEntry | null

// Economy state
prestige: number
stableSlots: number
maxStableSlots: number  // Cap at 3

// Actions
setBettingStatus: (status: 'open' | 'submitted' | 'skipped') => void
setEntryStatus: (status: 'open' | 'submitted', entry?: SubmittedEntry) => void
setPrestige: (prestige: number) => void
addPrestige: (amount: number) => void
setStableSlots: (slots: number) => void
```

Add to initialState:
```typescript
bettingStatus: 'open',
entryStatus: 'open',
lastSubmittedEntry: null,
prestige: 0,
stableSlots: 1,
maxStableSlots: 3,
```

Modify `setGamePhase`:
- `betting` phase: reset `bettingStatus: 'open'`
- `preparation` phase: reset `entryStatus: 'open'`, `lastSubmittedEntry: null`

### 1.3 Server-Side Economy
**File:** `server/GameRoom.ts`

Add to player state:
```typescript
prestige: number
stableSlots: number
```

Modify `calculateBetResults`:
- Instead of adding gold on win, calculate Prestige: `Math.floor(bet.amount / 2.5)` (1 Prestige per ~2.5 gold wagered)
- Losing bets still lose gold, gain nothing

Add heart loss → Prestige gain:
- In `applyHeartDamage`, when player loses hearts: `player.prestige += heartsLost`

Add participation check:
- After preparation phase, track who submitted entries
- In results phase, players without entries lose 1 heart (and gain 1 Prestige from catch-up)

Add stable slot enforcement:
- In `handlePurchaseUnit` for horses: reject if `player.horses.length >= player.stableSlots`

Add stable expansion:
- New message type: `expand_stable`
- Cost: 2 Prestige for slot 2, 3 Prestige for slot 3

---

## Phase 2: New Hooks

### 2.1 useKeyboardShortcuts
**New file:** `lib/hooks/useKeyboardShortcuts.ts`

- Reads `currentPhase` from store
- Phase-specific keyboard listeners
- Gates debug shortcuts behind `process.env.NODE_ENV !== 'production'`
- Ignores shortcuts when focus is in input/textarea/select
- Returns `activeShortcuts: Map<string, string>` for UI hints
- Mount once in main game container

### 2.2 useSynergyTracker
**New file:** `lib/hooks/useSynergyTracker.ts`

- Uses `horses` from store
- Counts bloodlines, calculates breakpoints (2+, 3+)
- Now critical with limited stable slots
- Returns: bloodline counts, active bonuses, next breakpoint hints

### 2.3 useStrategyImpact
**New file:** `lib/hooks/useStrategyImpact.ts`

- Uses `calculateDerivedStats` and `calculateBloodlineBonuses`
- Returns: base stats, modifier breakdown, effective stats, terrain alignment, strategy impact

---

## Phase 3: New Components

### 3.1 KeyboardHint
**New file:** `components/game/KeyboardHint.tsx`

Small inline kbd element for buttons.

### 3.2 SynergyTracker
**New file:** `components/game/SynergyTracker.tsx`

Collapsible panel:
- Bloodline counts with progress indicators (●●○)
- Active breakpoint bonuses
- Next breakpoint hints
- **New:** Shows stable capacity context ("2/3 slots used")

### 3.3 StrategyImpactPanel
**New file:** `components/game/StrategyImpactPanel.tsx`

Full stat breakdown panel.

### 3.4 StableCapacityBar
**New file:** `components/game/StableCapacityBar.tsx`

Inline component for top of horse purchase section in Shop:
- Shows current capacity: "Stable: 1/3 horses"
- Progress bar visual
- "Expand (⭐2)" button when slots < max and can afford
- Disabled state with cost shown when can't afford
- Tooltip explaining Prestige earning

---

## Phase 4: Component Modifications

### 4.1 UniversalHeader.tsx
**File:** `components/game/UniversalHeader.tsx`

1. Add Prestige display: `⭐ {prestige}` next to gold/hearts
2. Import `bettingStatus, setBettingStatus` from store
3. Sync header skip with store status
4. Disable button when `bettingStatus !== 'open'`

### 4.2 BettingPhase.tsx
**File:** `components/game/BettingPhase.tsx`

1. Replace local `betPlaced` with store `bettingStatus`
2. **Update payout display:** Show Prestige earned instead of gold
   - "Potential reward: ⭐ 2 Prestige" instead of "Potential Payout: 6g"
3. Update messaging: "Betting costs gold but wins earn Prestige"
4. Add keyboard shortcuts

### 4.3 PreparationPhase.tsx
**File:** `components/game/PreparationPhase.tsx`

1. Remove duplicate confirm button
2. Add entry status tracking with store
3. Show "Entry Locked" summary when submitted
4. **Add participation warning:** If timer < 15s and `entryStatus === 'open'`, show warning
5. Add SynergyTracker component
6. Add StrategyImpactPanel component
7. Add keyboard shortcuts

### 4.4 ShopPhase.tsx
**File:** `components/game/ShopPhase.tsx`

1. Gate Ctrl+D behind NODE_ENV
2. Remove debug hint
3. Add SynergyTracker
4. **Enforce stable slots:** Disable horse purchase if at capacity
5. Show "Stable Full" message with expansion prompt
6. Add keyboard shortcuts

### 4.5 GamePageClient.tsx (or layout)
**File:** `app/game/GamePageClient.tsx`

1. Mount useKeyboardShortcuts once here (single listener owner)

### 4.6 ResultsPhase.tsx
**File:** `components/game/ResultsPhase.tsx`

1. Show Prestige earned from bets (if any)
2. Show Prestige earned from heart loss (catch-up)
3. **Show participation penalty:** If player didn't race, show "-1 ❤️ (No entry submitted)"
4. Add keyboard shortcuts

---

## Phase 5: Server Protocol Changes

### 5.1 New Message Types
**File:** `types/messages.ts`

```typescript
// Client → Server
type ExpandStableMessage = {
  type: 'expand_stable'
}

// Server → Client (update player_state to include)
type PlayerStateMessage = {
  type: 'player_state'
  gold: number
  hearts: number
  prestige: number        // NEW
  stableSlots: number     // NEW
  inventory: {...}
}

// Server → Client (update bet_results)
type BetResultMessage = {
  type: 'bet_result'
  won: boolean
  prestigeEarned: number  // NEW (replaces gold payout)
  goldLost: number        // Amount wagered (lost either way)
}
```

### 5.2 Server Handler Updates
**File:** `server/websocket-handler.ts`

Add handler for `expand_stable` message.

---

## Implementation Order

### Milestone 1: Core Infrastructure
- [x] 1. ✅ `types/game.ts` - Add SubmittedEntry type
- [x] 2. ✅ `lib/store/gameStore.ts` - Add all new state fields
- [x] 3. ✅ `server/GameRoom.ts` - Add prestige, stableSlots to player state
- [x] 4. ✅ `types/messages.ts` - Update message types

### Milestone 2: UI State Sync (Issue #1)
- [ ] 5. `BettingPhase.tsx` - Replace local state with store
- [ ] 6. `UniversalHeader.tsx` - Sync skip action with store

### Milestone 3: Economy Display
- [ ] 7. `UniversalHeader.tsx` - Add Prestige display
- [ ] 8. `StableCapacityBar.tsx` - Create inline expansion component
- [ ] 9. `GamePageClient.tsx` - Integration

### Milestone 4: Betting Changes
- [ ] 10. `server/GameRoom.ts` - Betting pays Prestige not gold
- [ ] 11. `BettingPhase.tsx` - Update payout display to show Prestige

### Milestone 5: Stable System
- [ ] 12. `server/GameRoom.ts` - Enforce stable slot limits
- [ ] 13. `server/websocket-handler.ts` - Handle expand_stable
- [ ] 14. `StableCapacityBar.tsx` - Wire up to server
- [ ] 15. `ShopPhase.tsx` - Add StableCapacityBar above horse section, enforce slots

### Milestone 6: Participation & Catch-up
- [ ] 16. `server/GameRoom.ts` - Track entry submission, apply penalty
- [ ] 17. `server/GameRoom.ts` - Heart loss → Prestige gain
- [ ] 18. `ResultsPhase.tsx` - Show participation penalty and Prestige gains

### Milestone 7: Synergy & Strategy Panels
- [ ] 19. `useSynergyTracker.ts` - Create hook
- [ ] 20. `SynergyTracker.tsx` - Create component
- [ ] 21. `useStrategyImpact.ts` - Create hook
- [ ] 22. `StrategyImpactPanel.tsx` - Create component
- [ ] 23. `ShopPhase.tsx` - Add SynergyTracker
- [ ] 24. `PreparationPhase.tsx` - Add both panels, entry lock UI

### Milestone 8: Keyboard Shortcuts
- [ ] 25. `useKeyboardShortcuts.ts` - Create hook
- [ ] 26. `KeyboardHint.tsx` - Create component
- [ ] 27. All phase components - Add shortcuts and hints

### Milestone 9: Polish
- [ ] 28. `ShopPhase.tsx` - Gate debug hotkey
- [ ] 29. `PreparationPhase.tsx` - Remove duplicate button, add warning
- [ ] 30. Testing and balance tuning

---

## Keyboard Shortcuts Reference

| Phase | Key | Action |
|-------|-----|--------|
| Global | `Esc` | Close modals |
| Lobby | `Enter` | Ready/unready |
| Lobby | `C` | Copy room code |
| Shop | `1` / `2` | Shop/Inventory tabs |
| Shop | `E` | Reroll |
| Shop | `X` | Expand stable (if affordable) |
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

## Economy Balance Reference

### Prestige Earning
| Source | Amount |
|--------|--------|
| Winning bet | 1 Prestige per 2-3 gold wagered |
| Losing heart | 1 Prestige per heart lost |

### Prestige Spending
| Action | Cost |
|--------|------|
| Slot 1 → 2 | 2 Prestige |
| Slot 2 → 3 | 3 Prestige |
| *Future: combining* | TBD |
| *Future: breeding* | TBD |

### Stable Progression
| Slots | Bloodline Synergies |
|-------|---------------------|
| 1 | None possible |
| 2 | 2+ breakpoints possible |
| 3 | 3+ breakpoints possible |

---

## Critical Files

**Store & Types:**
- `lib/store/gameStore.ts`
- `types/game.ts`
- `types/messages.ts`

**Server:**
- `server/GameRoom.ts`
- `server/websocket-handler.ts`

**Components:**
- `components/game/UniversalHeader.tsx`
- `components/game/BettingPhase.tsx`
- `components/game/PreparationPhase.tsx`
- `components/game/ShopPhase.tsx`
- `components/game/ResultsPhase.tsx`
- `components/game/StableCapacityBar.tsx` (new)
- `components/game/SynergyTracker.tsx` (new)
- `components/game/StrategyImpactPanel.tsx` (new)

**Hooks:**
- `lib/hooks/useKeyboardShortcuts.ts` (new)
- `lib/hooks/useSynergyTracker.ts` (new)
- `lib/hooks/useStrategyImpact.ts` (new)

**Reference:**
- `game/stats.ts` - calculateBloodlineBonuses, calculateDerivedStats
