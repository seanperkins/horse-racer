# Neighs of Thunder - Remaining Tasks

## ✅ Recently Completed

### Authentication Integration (2026-01-04)

- ✅ WebSocket requires authentication - rejects unauthenticated connections
- ✅ Session user ID passed from NextAuth to WebSocket handler
- ✅ User session validated on connection
- ✅ Fixed client userId mismatch (prioritize session ID over localStorage)

### Sound Effects & Music (2026-01-03)

- ✅ Background music for lobby/shop/race phases
- ✅ Sound effects for: button clicks, purchase/sell, bet placement, race start/finish, stumbles/surges, victory/defeat, ready up
- ✅ Volume controls and mute toggle in AudioSettings component
- ✅ Audio store with sfx/music management

### Error Handling Improvements (2026-01-03)

- ✅ Toast notifications replace alerts (react-hot-toast)
- ✅ WebSocket reconnection handling with session persistence
- ✅ User-friendly error messages

### WebSocket Room Join Fixes (2026-01-02)

- ✅ Reconnects bypass `canJoin()` when `room.players.has(userId)`
- ✅ Join-by-code is now join-only (doesn't create new rooms)
- ✅ `ready_up` enforces sender identity using connection-bound `playerId`
- ✅ All message handlers restore `currentRoom` via `findRoomByPlayerId()`
- ✅ Reconnection closes prior socket for same `userId`

### URL State Management & Reconnection (2026-01-02)

- ✅ URL updates with room code when joining private rooms
- ✅ Auto-join from URL (`/game?room=ABCD`)
- ✅ Copy Room URL button in lobby
- ✅ Persistent player ID in localStorage for reconnection
- ✅ Full game state sync on reconnection

### Ready-Up System for Results Phase (2026-01-02)

- ✅ Players can ready up after viewing race results
- ✅ Shows which players are ready/not ready
- ✅ Game advances when all ready or after timeout

### Race Duration Fix (2026-01-02)

- ✅ Races run until all horses complete (no fixed timeout)

### Tutorial Page (2026-01-03)

- ✅ Basic tutorial page exists at `/tutorial`

---

## 🔴 High Priority Tasks

### 1. Implement Race Commentary/Events UI

**Status:** Not Started
**Files:** `components/game/PixiRaceRenderer.tsx`, `components/game/RaceLog.tsx`

**Requirements:**

- Display event log during race (stumbles, surges, position changes)
- Show ability triggers and strategy changes
- Add dramatic moment callouts

---

### 2. Improve Pixi.js Race Visualization

**Status:** In Progress
**Priority:** High (visual experience)
**File:** `components/game/PixiRaceRenderer.tsx`

**Missing Features:**

- Stumble animations
- Surge/speed boost visual effects
- Particle effects (dust, mud splashes)
- Strategy change indicators
- Commentary callouts overlaid on race
- Track obstacles visualization
- Parallax background layers

**Already Working:**

- Real-time position updates during race
- Smooth interpolation between positions
- Horse/jockey sprite rendering with bloodline tints

---

### 3. Link Game Results to Database

**Status:** Not Started
**Priority:** Medium
**Files:** `server/GameRoom.ts`, `server/websocket-handler.ts`

**Requirements:**

- Update user stats (XP, level, totalMatches, totalWins) after matches
- Save match history to Match and MatchPlayer tables
- Track player progression

---

### 4. Add Error Boundaries

**Status:** Not Started
**Priority:** Medium

**Requirements:**

- Add React error boundaries to handle component crashes
- Show friendly error messages to users
- Prevent full page crashes

---

## 🟡 Medium Priority Tasks

### 5. Implement Race Replay System

**Status:** Not Started
**Files:** `server/GameRoom.ts`, `app/replay/[id]/page.tsx`

**Requirements:**

- Save race input packets to Replay table after each race
- Create replay viewer page
- Re-run simulation with same seed
- Add replay UI controls (play/pause, speed)

**Database:** Replay model already exists in Prisma schema

---

### 6. Add Match History & User Profile

**Status:** Not Started
**Files:** `app/profile/page.tsx`, `app/api/matches/route.ts`

**Requirements:**

- Display user stats (level, XP, win rate)
- Show match history with placements
- Pagination for match history

**Database:** Match and MatchPlayer models already exist

---

### 7. Rate Limiting

**Status:** Not Started
**Priority:** Medium

**Requirements:**

- Add rate limiting to registration
- Add rate limiting to login attempts
- Prevent abuse of API endpoints

---

## 🟢 Low Priority / Polish Tasks

### 8. Implement Cosmetics System

**Status:** Database schema exists
**Priority:** Low (future feature)

**Requirements:**

- Unlock system based on level/achievements
- Horse skins, jockey outfits, emotes, badges
- Apply cosmetics in race visualization

**Database:** Cosmetic and UserCosmetic models already exist

---

### 9. Expand E2E Testing

**Status:** One test exists (`tests/e2e/race-sync.spec.js`)
**Priority:** Low
**Directory:** `tests/e2e/`

**Requirements:**

- Test full match flow (2 players)
- Test shop purchases
- Test betting
- Test authentication flow
- Test WebSocket reconnection

---

### 10. Add Admin Panel

**Status:** Not Started
**Priority:** Low
**File:** `app/admin/page.tsx`

**Requirements:**

- View active games
- Monitor server health
- Manage users
- View game statistics

---

## 📝 Known Issues to Fix

1. **Server startup requires manual database start**
   - Consider adding script to auto-start Docker containers

2. ✅ **FIXED: Bloodline bonuses not applied during race ticks** (2026-01-03)

3. ✅ **FIXED: Shop purchases duplication** (2026-01-03)

4. ✅ **FIXED: Purchase handler gold corruption** (2026-01-03)

5. ✅ **FIXED: Shop actions allowed outside shop phase** (2026-01-03)

6. ✅ **FIXED: Invalid sender identity on ready_up** (2026-01-04)
   - Client was using localStorage UUID instead of session ID

---

## 🎯 Next Recommended Steps

**Focus on high-impact remaining work:**

### Option A: Race Experience Polish

1. Implement race commentary/events UI
2. Add stumble/surge animations
3. Add particle effects

### Option B: Persistence & Progression

1. Link game results to database
2. Add match history page
3. Implement user profile with stats

### Option C: Stability

1. Add React error boundaries
2. Add rate limiting
3. Expand E2E test coverage
