# Neighs of Thunder - Remaining Tasks

## 🛠 WebSocket Room Join Fixes (Proposed)

- Allow reconnects to bypass `canJoin()` when `room.players.has(userId)`; for join-by-code, prefer rejoining by `userId` over creating a new room.
- Enforce `ready_up` sender identity: use connection-bound `playerId` and reject mismatched `validatedMessage.userId`.
- Restore `currentRoom` for all message types when missing (lookup by `playerId`), or return a clear error if not in a room.
- Decide join-by-code behavior: "join-only" vs "create-or-join"; update server/client flow and UI feedback accordingly.
- On reconnect, close any prior socket for the same `userId` and clean up stale `playerSockets` entries.

## ✅ Recently Completed

### URL State Management & Reconnection (2026-01-02)

- ✅ URL updates with room code when joining private rooms (`/game?room=ABCD`)
- ✅ Auto-join from URL - visiting `/game?room=ABCD` automatically joins that room
- ✅ Copy Room URL button in lobby for easy sharing
- ✅ Reconnection support - reload page to rejoin after disconnect
- ✅ Deep linking support for direct links to specific game rooms
- ✅ Persistent player ID in localStorage for reconnection
- ✅ Full game state sync on reconnection (phase, inventory, shop, track, betting, race)
- ✅ Server recognizes returning players and syncs their current game state

### Ready-Up System for Results Phase (2026-01-02)

- ✅ Players can ready up after viewing race results
- ✅ Shows which players are ready/not ready
- ✅ Game advances to next round when all players ready (or after 60s timeout)
- ✅ Eliminated players don't see ready button

### Race Duration Fix (2026-01-02)

- ✅ Races now run until all horses complete instead of fixed 60s timeout
- ✅ Race phase duration adjusted to 70s to accommodate variable race lengths
- ✅ Server calculates actual race duration based on simulation

---

## 🔴 High Priority Tasks

### 1. Digital Ocean Deployment

**Status:** Not Started
**Priority:** Low (can develop locally)
**Files:** `deploy.sh`, `ecosystem.config.js`, `nginx.conf`

**Requirements:**

- Set up Digital Ocean droplet
- Configure PM2 for Node.js process management
- Set up Nginx reverse proxy
- Configure SSL with Let's Encrypt
- Set up managed PostgreSQL database
- Create deployment script
- Configure environment variables
- Set up health check endpoint
- Set up PM2 log rotation

**Reference:** Plan has detailed deployment steps in Phase 7

---

### 2. Implement Race Commentary/Events UI

**Status:** Not Started
**Files:** `components/game/PixiRaceRenderer.tsx`, `components/game/RaceLog.tsx` (new or existing)

**Requirements:**

- Display event log during race (stumbles, surges, position changes)
- Show ability triggers and strategy changes
- Add dramatic moment callouts

---

### 3. Improve Pixi.js Race Visualization

**Status:** In Progress
**Priority:** High (visual experience)
**File:** `components/game/PixiRaceRenderer.tsx`

**Missing Features:**

- Real-time position updates during race simulation
- Smooth interpolation between positions
- Stumble animations
- Surge/speed boost visual effects
- Particle effects (dust, mud splashes)
- Strategy change indicators
- Commentary callouts overlaid on race
- Better horse/jockey sprite rendering
- Track obstacles visualization
- Parallax background layers

---

### 4. Add Sound Effects & Music

**Status:** Not Started
**Priority:** Medium (polish)
**Directory:** `public/audio/`

**Requirements:**

- Background music for lobby/shop/race
- Sound effects for:
  - Button clicks
  - Purchase/sell
  - Bet placement
  - Race start/finish
  - Stumbles/surges
  - Victory/defeat
- Volume controls
- Mute toggle

---

### 5. Integrate Authentication with WebSocket

**Status:** Not Started
**Priority:** Medium
**Files:** `server/websocket-handler.ts`, `components/game/Lobby.tsx`

**Requirements:**

- Require session authentication before WebSocket connection
- Pass user ID from NextAuth session to WebSocket
- Validate user session on connection
- Link game results to User database records
- Update user stats (XP, level, totalMatches, totalWins) after matches
- Save match history to Match and MatchPlayer tables
- Protect `/game` route - redirect to `/login` if not authenticated

**Implementation:**

- Use `getServerSession()` in game page
- Pass session token to WebSocket handshake
- Verify token in WebSocket handler

---

### 6. Improve Error Handling

**Status:** Basic error handling exists
**Priority:** Medium

**Requirements:**

- Replace `alert()` calls with toast notifications
- Add error boundaries to React components
- Better WebSocket disconnection handling
- Reconnection logic with session persistence
- User-friendly error messages
- Retry mechanisms for failed actions

---

## 🟡 Medium Priority Tasks

### 7. Implement Race Replay System

**Status:** Not Started
**Priority:** Medium
**Files:** `server/GameRoom.ts`, `app/replay/[id]/page.tsx`

**Requirements:**

- Save race input packets to Replay table after each race
- Store: track, all participants, equipment, strategies, seed
- Create replay viewer page
- Load replay data and re-run simulation with same seed
- Display race using Pixi.js visualization
- Add replay UI controls (play/pause, speed control)

**Database:** Replay model already exists in Prisma schema

---

### 8. Add Match History & User Profile

**Status:** Not Started
**Priority:** Medium
**Files:** `app/profile/page.tsx`, `app/api/matches/route.ts`

**Requirements:**

- Display user stats (level, XP, win rate)
- Show match history with placements
- Display cosmetics/achievements (future)
- Create API endpoints for fetching match data
- Pagination for match history

**Database:** Match and MatchPlayer models already exist

---

## 🟢 Low Priority / Polish Tasks

### 9. Implement Cosmetics System

**Status:** Database schema exists
**Priority:** Low (future feature)
**Files:** `app/cosmetics/page.tsx`

**Requirements:**

- Unlock system based on level/achievements
- Horse skins, jockey outfits, emotes, badges
- Cosmetic shop (separate from game shop)
- Apply cosmetics in race visualization

**Database:** Cosmetic and UserCosmetic models already exist

---

### 10. Add Tutorial/How to Play

**Status:** Not Started
**Priority:** Low
**File:** `app/tutorial/page.tsx`

**Requirements:**

- Interactive tutorial for new players
- Explain game phases
- Explain stats and mechanics
- Strategy tips
- Link from home page

---

### 11. E2E Testing with Playwright

**Status:** Setup complete, no tests written
**Priority:** Low
**Directory:** `tests/e2e/`

**Requirements:**

- Test full match flow (2 players)
- Test shop purchases
- Test race visualization rendering
- Test betting
- Test authentication flow
- Test WebSocket connection/reconnection

---

### 12. Add Admin Panel

**Status:** Not Started
**Priority:** Low
**File:** `app/admin/page.tsx`

**Requirements:**

- View active games
- Monitor server health
- Manage users (ban, reset)
- View game statistics
- Manual game room management

---

## 📝 Known Issues to Fix

1. **Server startup requires manual database start**
   - Consider adding script to auto-start Docker containers
   - Or add check in server.ts to verify DB connection

2. **No graceful WebSocket disconnection handling**
   - Players should be able to reconnect if disconnected
   - Implement reconnection token system

3. **No rate limiting on API endpoints**
   - Add rate limiting to registration
   - Add rate limiting to login attempts

4. **No error boundaries in React components**
   - Add error boundaries to handle component crashes
   - Show friendly error messages to users

5. **Bloodline bonuses not applied during race ticks**
   - `RaceSimulator.tick()` recalculates derived stats without `participant.bloodlineBonuses`
   - Causes speed/terrain/stamina bonuses to only affect initial variance, not live simulation
   - Pass bonuses into `calculateDerivedStats()` each tick

6. **Shop purchases can be duplicated server-side**
   - `GameRoom.handlePurchase()` does not remove purchased units from `player.shopInventory`
   - Allows repeated purchases of the same unit by resending messages

7. **Purchase handler can corrupt gold on jockey purchases**
   - `GameRoom.handlePurchase()` uses `unit.cost`, but jockeys only have `hireCost`
   - A malformed `purchase_unit` for `jockey` can set `player.gold` to `NaN`
   - Block `jockey` in `purchase_unit` or normalize cost handling

8. **Shop actions allowed outside shop phase**
   - No phase checks in `handlePurchase`, `handleSell`, `handleTrain`, `handleHireJockey`, `handleFireJockey`
   - Players can mutate inventory during betting/race/results

---

## 🎯 Next Recommended Steps

**Focus on high-impact remaining work:**

### Option A: Race Experience Polish

1. Implement race commentary/events UI
2. Improve Pixi.js race visuals and animations

### Option B: Core Stability & Security

1. Integrate authentication with WebSocket
2. Fix shop duplication/gold corruption issues
3. Add phase checks and reconnection handling

### Option C: Quality of Life

1. Replace alerts with toast notifications
2. Add error boundaries and retry flows
3. Add basic sound effects
