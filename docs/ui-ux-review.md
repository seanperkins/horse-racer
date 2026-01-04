# UI/UX Review: Autobattler Horse Racing

This write-up summarizes the current UI review against autobattler best practices and the design report’s goals, with concrete improvement suggestions. It focuses on flow clarity, player agency, readability of synergies, and consistency between UI state and server state.

## Key Findings (Ordered by Severity)

1) **Betting skip creates a UI state mismatch (high).**  
   Skipping via the header sends `ready_up` but does not mark the betting UI as “placed,” leaving actionable controls on screen. This can lead to accidental double-submissions, confusion about whether a bet can still be placed, or server rejections.

   **Suggestion:**  
   - When “Skip Betting” is used, immediately lock the betting UI and show a “Bet Skipped” confirmation state.  
   - Centralize the “ready/bet state” in the game store so both the header and betting screen stay in sync.  
   - **Concrete approach:** introduce `bettingStatus: 'open' | 'submitted' | 'skipped'` in the store; set it on `place_bet`, `ready_up` in betting, and on server `betting_open`/`betting_closed` events.  
   - **UI changes:**  
     - Betting screen shows a single “Waiting for race…” panel when status is not `open`.  
     - Header “Skip Betting” toggles store state and disables the betting CTA.  
   - **Guardrails:** disable `place_bet` action when `bettingStatus !== 'open'`.

2) **Debug hotkey is player‑visible and potentially abusable (medium).**  
   The `Ctrl+D` quick-start appears in the UI and triggers auto-buy + auto-ready. This is useful for dev/test, but can confuse players or be exploited.

   **Suggestion:**  
   - Gate quick-start behavior behind a dev flag (e.g., `NODE_ENV !== 'production'` or a feature flag).  
   - Move the hint to a debug-only overlay or remove in production.  
   - Replace it with a broader keyboard shortcut system (see “Keyboard Shortcuts” below).
   - **Concrete approach:**  
     - `const enableDebugHotkeys = process.env.NODE_ENV !== 'production' && flags.enableDebugHotkeys`  
     - Wrap listener registration and the hint in that condition.

3) **Preparation phase has duplicate “confirm” actions (medium).**  
   There are two buttons that perform the same action and neither visibly locks the state after submission. This invites double‑submit and weakens the “commit” moment.

   **Suggestion:**  
   - Keep one primary “Confirm Entry” action, and disable it once submitted (show “Entry Locked”).  
   - Provide a short, visible confirmation (“Entry locked for this round”) to reduce uncertainty.
   - **Concrete approach:**  
     - Add `entryStatus: 'open' | 'submitted'` to the store.  
     - After sending `setup_race_entry`, set status to `submitted` locally until server confirms phase change.  
     - Gate the button `disabled` state on `entryStatus === 'submitted'`.
   - **UI changes:**  
     - Replace the top header button or the bottom button (choose one) with a single “Confirm Entry” CTA.  
     - Show a compact “Locked” chip near the strategy panel.

4) **Strategy choices aren’t grounded in expected outcomes (medium).**  
   Presets list modifiers but don’t show how they interact with the selected horse, jockey, or track. This reduces player agency and learnability.

   **Suggestion:**  
   - Add a small “Strategy Impact” panel that shows the expected effect on speed/stamina or predicted finish time.  
   - Surface track-specific guidance (e.g., “Mud favors grit/stamina; hang-back more viable”).
   - **Concrete approach:**  
     - Use a lightweight “expected pace” model in the client (does not need to be authoritative):  
       - Compute base pace from horse speed/stamina + jockey skill/timing.  
       - Apply strategy modifiers to show **relative** deltas (e.g., “+8% early pace, -12% stamina reserve”).  
     - Provide a tooltip for each strategy preset that explains typical use cases.
   - **UI changes:**  
     - Add a “Strategy Impact” card under the preset grid with 2–3 key metrics.  
     - Add a “Track Tip” line under the track summary (single sentence).

5) **Synergy/trait visibility is too low during shop/prep (low).**  
   Autobattlers rely on strong synergy visibility, but there’s no persistent tracker for bloodline/jockey/equipment sets or breakpoints.

   **Suggestion:**  
   - Add a compact synergy tracker panel (counts, breakpoints, and active bonuses).  
   - Surface “next breakpoint” hints to guide decisions and reduce cognitive load.
   - **Concrete approach:**  
     - Build a small derived selector in the store that returns counts per trait and next breakpoint.  
     - Use the same data for both Shop and Preparation so it’s always visible.
   - **UI changes:**  
     - A right-rail panel with sections: Bloodlines, Jockey Traits, Equipment Sets.  
     - Each row shows current count, next threshold, and active bonus in 1 line.

## Flow Review vs. Autobattler Best Practices

- **Preparation → Resolution rhythm** is present and aligns with autobattler norms.  
- **Agency vs. randomness** is mostly good but needs UI reinforcement (strategy clarity, synergy visibility, odds interpretation).  
- **Reward loop** is clear in results, but “commit moments” (entry lock, bet lock) need clearer confirmation.  
- **Readability of choices** should be enhanced by surfacing how choices affect outcomes.

## Keyboard Shortcuts (Proposed System)

Replace the single debug hotkey with a consistent, discoverable shortcut system that improves speed without breaking fairness. Keep shortcuts optional and avoid conflicts with browser/system shortcuts.

### Principles

- **No hidden power:** shortcuts should do the same actions as visible UI.  
- **Phase‑aware:** shortcuts only active in the relevant phase.  
- **Discoverable:** show a help overlay and inline hints.  
- **Avoid conflicts:** don’t use `Ctrl+D`, `Cmd+D`, `Cmd+Q`, or `Cmd+R`.
 - **Repeatable:** when a shortcut is blocked (e.g., insufficient gold), surface the same toast or inline error as the UI button.

### Suggested Defaults (Phase‑Aware)

**Global**
- `?` or `H`: Toggle shortcut help overlay.
- `Esc`: Close modals/tooltips.
- `R`: Ready/Unready (where applicable).

**Lobby**
- `Enter`: Ready/Unready.
- `C`: Copy room code URL (if available).

**Shop**
- `1/2`: Toggle Shop / Inventory tabs.
- `E`: Reroll.
- `F`: Toggle filter panel (if added).
- `B`: Buy selected item (if a card is focused).
- `S`: Sell focused inventory item.

**Preparation**
- `1–9`: Select horse by list index.
- `J`: Focus jockey panel (or open jockey selection if applicable).
- `E`: Focus equipment panel.
- `P`: Cycle strategy preset.
- `Enter`: Confirm entry.

**Betting**
- `W/P/X`: Switch bet type (Win/Place/Exacta).
- `+/-`: Increase/decrease bet amount.
- `1–9`: Select entry by list index.
- `Enter`: Place bet.
- `K`: Skip betting.

**Race**
- `Space`: Toggle race speed (if supported).
- `L`: Toggle race log/commentary (if visible).

**Results**
- `Enter`: Ready for next round.

### Implementation Notes

- Use a single `useKeyboardShortcuts` hook that reads `currentPhase` from the store.  
- Use a `ShortcutHelp` component that lists active shortcuts for the current phase.  
- Prefer visible focus state on cards for “selected” items so keyboard interactions are predictable.  
- Provide a “focus ring” on cards so users know which item keyboard actions affect.  
- Add a small “?” hint near the header to discover the shortcuts overlay.

## Recommended Next Steps

1) Fix betting skip state sync (header and betting screen share a single “bet/ready state”).  
2) Gate debug shortcuts and replace with the shortcut system above.  
3) Add “entry locked” state in preparation, plus a single confirm button.  
4) Add a synergy tracker and strategy impact panel to reinforce agency.  
