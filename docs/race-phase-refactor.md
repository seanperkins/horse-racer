# Race Phase Refactor: Pre-computed Results Architecture

## Overview

This document outlines a refactored approach to handling the race phase that eliminates redundant simulations, ensures client-server consistency, and provides a cleaner separation of concerns.

## Current Architecture Problems

### Redundant Simulations

The current implementation runs the race simulation **three times**:

1. **Server `runRace()`** - Runs simulation to calculate race duration for timeout
2. **Server `processRaceResults()`** - Runs simulation again to get actual results
3. **Client `PixiRaceRenderer`** - Runs its own simulation for animation

```
┌─────────────────────────────────────────────────────────────────┐
│ CURRENT FLOW                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Server                          Client                         │
│  ──────                          ──────                         │
│  runRace()                                                      │
│    ├─ simulate() ─────────────► race_inputs                     │
│    ├─ get duration                 │                            │
│    └─ setTimeout(duration)         ▼                            │
│         │                       simulate() ◄── 3rd simulation   │
│         │                          │                            │
│         │                       animate ticks                   │
│         ▼                          │                            │
│  processRaceResults()              │                            │
│    ├─ simulate() ◄── 2nd sim       │                            │
│    ├─ apply rewards                │                            │
│    └─ broadcast ───────────────► race_results                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Issues

| Issue | Impact |
|-------|--------|
| **3x CPU usage** | Wasteful computation for deterministic result |
| **Timeout-based coordination** | Race condition if animation takes longer/shorter than expected |
| **Divergence risk** | Floating point differences could cause client/server mismatch |
| **No late-joiner support** | Players connecting mid-race can't sync |
| **Results computed twice** | Server throws away first simulation results |

## Proposed Architecture

### Core Principle

> Since the race is **deterministic**, compute results **once** at race start and treat the client animation as pure **playback**.

### New Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ PROPOSED FLOW                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Server                          Client                         │
│  ──────                          ──────                         │
│  startRacePhase()                                               │
│    ├─ simulate() ◄── ONLY sim                                   │
│    ├─ cache results                                             │
│    ├─ cache key events                                          │
│    └─ broadcast ───────────────► race_start                     │
│                                    │  {inputs, results, events} │
│                                    ▼                            │
│                                 animate using events            │
│                                 (no simulation)                 │
│                                    │                            │
│         ◄──────────────────────── animation_complete            │
│  wait for all clients              │                            │
│  OR timeout (safety)               │                            │
│         │                          │                            │
│         ▼                          │                            │
│  applyResults() ◄── use cache      │                            │
│    └─ broadcast ───────────────► race_results                   │
│                                 (reveal results UI)             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Structures

### Race Start Message

```typescript
interface RaceStartMessage {
  type: 'race_start'

  // Existing fields
  entries: RaceEntry[]
  track: Track
  seed: string

  // New fields
  precomputed: {
    // Final placements (hidden until results phase)
    placements: Array<{
      playerId: string
      position: number      // 1st, 2nd, 3rd...
      finishTime: number    // ms
    }>

    // Keyframe positions for animation (every 0.5s = every 5 ticks)
    keyframes: Array<{
      tick: number
      positions: Record<string, {
        distance: number      // meters from start
        speed: number         // current speed
        stamina: number       // remaining stamina %
        isStumbled: boolean
      }>
    }>

    // Dramatic events for commentary/effects
    events: Array<{
      tick: number
      playerId: string
      type: 'stumble' | 'recovery' | 'surge' | 'ability' | 'trait'
      description: string
    }>

    // Total duration for progress bar
    totalTicks: number
  }
}
```

### Data Size Estimate

| Component | Size |
|-----------|------|
| entries + track + seed | ~6 KB (unchanged) |
| placements (8 players) | ~0.5 KB |
| keyframes (140 frames × 8 players) | ~25 KB |
| events (~50 events) | ~3 KB |
| **Total** | **~35 KB** |

This is larger than current (~6 KB) but:
- Eliminates client-side simulation entirely
- Guarantees perfect sync
- Enables scrubbing/replay features
- Supports late joiners

### Alternative: Minimal Data Approach

If 35 KB is too large, use a hybrid approach:

```typescript
interface RaceStartMessageMinimal {
  type: 'race_start'

  // Existing fields (client still simulates for visuals)
  entries: RaceEntry[]
  track: Track
  seed: string

  // Authoritative results (hidden until phase end)
  results: {
    placements: Placement[]

    // Sync checkpoints - client can verify simulation matches
    checkpoints: Array<{
      tick: number
      leaderPlayerId: string
      leaderDistance: number
    }>
  }
}
```

**Size**: ~8 KB total (minimal increase)

Client runs its own simulation but:
- Uses `results.placements` as authoritative outcome
- Verifies against `checkpoints` to detect divergence
- If divergence detected, can request full keyframes

## Server Implementation

### GameRoom.ts Changes

```typescript
class GameRoom {
  // Cache for race data
  private cachedRaceResults: RaceOutcome | null = null
  private cachedKeyframes: Keyframe[] | null = null

  runRace(): void {
    const entries = this.getRaceEntries()
    const seed = `race-${this.roomId}-${this.currentRound}`
    const track = this.currentTrack!

    // Single simulation - capture everything
    const simulator = new RaceSimulator({ track, participants: entries, seed })
    const outcome = simulator.simulate()

    // Cache results for later use
    this.cachedRaceResults = outcome
    this.cachedKeyframes = simulator.getKeyframes() // New method

    // Broadcast with pre-computed data
    this.broadcast({
      type: 'race_start',
      entries,
      track,
      seed,
      precomputed: {
        placements: outcome.placements,
        keyframes: this.cachedKeyframes,
        events: outcome.events,
        totalTicks: simulator.getTotalTicks(),
      }
    })

    // Wait for client signals OR timeout
    this.awaitAnimationComplete(outcome)
  }

  private awaitAnimationComplete(outcome: RaceOutcome): void {
    const maxDuration = outcome.placements[outcome.placements.length - 1].finishTime + 5000

    // Set safety timeout
    this.phaseTimer = setTimeout(() => {
      this.transitionToResults()
    }, maxDuration)
  }

  handleAnimationComplete(playerId: string): void {
    const player = this.players.get(playerId)
    if (player) {
      player.animationComplete = true
    }

    // Check if all non-eliminated players are done
    const activePlayers = Array.from(this.players.values())
      .filter(p => !p.eliminated && !p.isAI)

    if (activePlayers.every(p => p.animationComplete)) {
      clearTimeout(this.phaseTimer!)
      this.transitionToResults()
    }
  }

  private transitionToResults(): void {
    // Use cached results - no re-simulation needed
    const outcome = this.cachedRaceResults!

    // Apply rewards
    for (const placement of outcome.placements) {
      const player = this.players.get(placement.playerId)
      if (!player) continue

      player.gold += this.calculateGoldReward(placement.position)
      player.hearts -= this.calculateHeartsDamage(placement.position)
      // ... rest of reward logic
    }

    // Broadcast results
    this.broadcast({
      type: 'race_results',
      placements: outcome.placements,
      betResults: this.calculateBetResults(outcome.placements),
      // ...
    })

    // Clear cache
    this.cachedRaceResults = null
    this.cachedKeyframes = null

    this.startPhase('results')
  }
}
```

### RaceSimulator.ts Additions

```typescript
class RaceSimulator {
  private keyframes: Keyframe[] = []
  private readonly KEYFRAME_INTERVAL = 5 // Every 5 ticks (0.5s)

  private tick(): void {
    // ... existing tick logic ...

    // Capture keyframe
    if (this.currentTick % this.KEYFRAME_INTERVAL === 0) {
      this.captureKeyframe()
    }
  }

  private captureKeyframe(): void {
    const positions: Record<string, KeyframePosition> = {}

    for (const [playerId, state] of this.states) {
      positions[playerId] = {
        distance: state.position,
        speed: state.currentSpeed,
        stamina: state.stamina / state.maxStamina,
        isStumbled: state.isStumbled,
      }
    }

    this.keyframes.push({
      tick: this.currentTick,
      positions,
    })
  }

  public getKeyframes(): Keyframe[] {
    return this.keyframes
  }

  public getTotalTicks(): number {
    return this.currentTick
  }
}
```

## Client Implementation

### PixiRaceRenderer.tsx Changes

```typescript
function PixiRaceRenderer({ raceData, onAnimationComplete }) {
  // No more RaceSimulator - just playback
  const keyframeIndex = useRef(0)

  const animate = () => {
    const { keyframes, events, totalTicks } = raceData.precomputed

    const tickInterval = setInterval(() => {
      currentTick++

      // Find current keyframe
      while (
        keyframeIndex.current < keyframes.length - 1 &&
        keyframes[keyframeIndex.current + 1].tick <= currentTick
      ) {
        keyframeIndex.current++
      }

      const currentKeyframe = keyframes[keyframeIndex.current]
      const nextKeyframe = keyframes[keyframeIndex.current + 1]

      // Interpolate positions between keyframes
      for (const [playerId, horse] of horses) {
        const current = currentKeyframe.positions[playerId]
        const next = nextKeyframe?.positions[playerId]

        if (next) {
          const t = (currentTick - currentKeyframe.tick) /
                    (nextKeyframe.tick - currentKeyframe.tick)
          horse.position = lerp(current.distance, next.distance, t)
          horse.isStumbled = current.isStumbled
        } else {
          horse.position = current.distance
        }
      }

      // Trigger events at their tick
      const tickEvents = events.filter(e => e.tick === currentTick)
      for (const event of tickEvents) {
        triggerVisualEffect(event)
      }

      // Check completion
      if (currentTick >= totalTicks) {
        clearInterval(tickInterval)
        onAnimationComplete()
      }
    }, 100) // 10 ticks/second = 100ms per tick
  }
}
```

## Migration Path

### Phase 1: Cache Results (Low Risk)
- Add result caching in `runRace()`
- Use cached results in `processRaceResults()` instead of re-simulating
- No client changes needed

### Phase 2: Add Keyframes (Medium Risk)
- Add keyframe capture to `RaceSimulator`
- Include keyframes in `race_inputs` message
- Client ignores keyframes initially (still simulates)

### Phase 3: Client Playback (Higher Risk)
- Replace client `RaceSimulator` with keyframe interpolation
- Add `animation_complete` message handling
- Remove client simulation code

### Phase 4: Cleanup
- Remove duplicate simulation code
- Remove timeout-based phase transitions
- Add late-joiner support using keyframes

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| Simulations per race | 3 | 1 |
| Client CPU usage | High (simulation) | Low (interpolation) |
| Data consistency | Risk of divergence | Guaranteed |
| Late joiner support | None | Full (scrub to current) |
| Replay capability | None | Built-in |
| Phase transition | Timeout-based | Event-driven |
| Code complexity | Duplicated logic | Single source of truth |

## Open Questions

1. **Keyframe granularity**: Every 5 ticks (0.5s) vs every 10 ticks (1s)? Smaller = smoother but more data.

2. **Compression**: Should keyframes use delta encoding for smaller payloads?

3. **Streaming**: For very long races, should keyframes stream during the race rather than all upfront?

4. **Verification**: Should client still simulate in background to verify server results (cheat detection)?
