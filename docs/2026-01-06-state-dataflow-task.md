# State and Dataflow Tasks

## Context

The current state/dataflow has a few inconsistencies that can cause stale UI, mismatched client/server payloads, and unnecessary re-renders. This document turns the review findings into concrete, actionable tasks.

## Goals

- Keep UI selection state in sync with server/inventory updates.
- Use a single, consistent WebSocket send path and payload shape.
- Preserve server-sent race events and make them available to UI.
- Reduce broad re-renders from unscoped store subscriptions.
- Centralize player state updates to avoid drift.

---

## Task 1: Normalize WebSocket send path

**Problem:** Client messages are sent via two different pathways (`useWebSocket.sendMessage` vs `gameStore.sendMessage`) with different payload shapes.

**Files:** `lib/store/gameStore.ts`, `lib/hooks/useWebSocket.tsx`, `app/game/GamePageClient.tsx`, `components/game/UniversalHeader.tsx`, `components/game/PixiRaceRenderer.tsx`

**Work items:**
- Choose a single send API (prefer the hook sender that adds `timestamp`).
- Update store to either wrap the hook sender or remove store-based sending.
- Update components still calling the store sender to use the unified path.
- Ensure all client messages include `timestamp`.

**Acceptance:**
- All client-to-server messages go through one sender.
- Payload shape is consistent across all components.

---

## Task 2: Keep preparation selection in sync

**Problem:** `PreparationPhase` initializes selection state once and ignores subsequent inventory or `lastSubmittedEntry` changes.

**Files:** `components/game/PreparationPhase.tsx`, `lib/store/gameStore.ts`

**Work items:**
- Rework selection effects to respond to `horses`, `hiredJockey`, `equipment`, and `lastSubmittedEntry` updates.
- Remove `eslint-disable` blocks that hide missing dependencies.
- Consider moving selection defaults into the store for a single source of truth.

**Acceptance:**
- Selection state updates on reconnect or inventory changes.
- `prepSelection` always reflects the latest available items.

---

## Task 3: Preserve race result events

**Problem:** `race_results.events` are dropped when storing results.

**Files:** `app/game/GamePageClient.tsx`, `lib/store/gameStore.ts`, `components/game/ResultsPhase.tsx`

**Work items:**
- Store `events` from the `race_results` message.
- Make events available for results or commentary UI.

**Acceptance:**
- `raceResults.events` is populated when the server provides it.

---

## Task 4: Add scoped store selectors

**Problem:** Several components subscribe to the entire store, causing broad re-renders.

**Files:** `app/game/GamePageClient.tsx`, `components/game/UniversalHeader.tsx`, `components/game/PreparationPhase.tsx`, `components/game/RacePhase.tsx`, `components/game/ResultsPhase.tsx`, `components/game/ShopPhase.tsx`, `components/game/BettingPhase.tsx`, `components/game/Lobby.tsx`

**Work items:**
- Replace `useGameStore()` usage with selectors for needed fields.
- Use `useShallow` when selecting multiple values.

**Acceptance:**
- Components re-render only on relevant state changes.

---

## Task 5: Centralize player_state updates

**Problem:** `setPlayerState` omits `reputation` and `stableSlots`, which are set separately.

**Files:** `lib/store/gameStore.ts`, `app/game/GamePageClient.tsx`

**Work items:**
- Extend `setPlayerState` to include `reputation` and `stableSlots`.
- Update `player_state` handling to call one action.

**Acceptance:**
- Player state updates happen through a single store action.
