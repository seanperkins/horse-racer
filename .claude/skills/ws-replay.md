# WebSocket Session Replay Skill

Record and replay WebSocket sessions for debugging multiplayer issues.

## Usage

```bash
/ws-replay
```

## What This Skill Does

Captures WebSocket message sequences during gameplay, allowing you to replay sessions to reproduce bugs, analyze game state, and debug synchronization issues.

## Options

When invoked, you can:
1. **Start Recording**: Begin capturing messages for a room
2. **Stop Recording**: End capture and save session
3. **Replay Session**: Play back a recorded session
4. **Compare Sessions**: Diff two sessions for discrepancies
5. **List Recordings**: Show all saved session files

## Recording Format

Sessions are saved as JSON files:
```json
{
  "sessionId": "session_20250105_143022",
  "roomCode": "XYZW",
  "startTime": "2025-01-05T14:30:22.000Z",
  "endTime": "2025-01-05T14:45:18.000Z",
  "playerCount": 4,
  "messages": [
    {
      "timestamp": 0,
      "direction": "server->client",
      "playerId": "player_1",
      "type": "room_state",
      "payload": { ... }
    },
    {
      "timestamp": 1523,
      "direction": "client->server",
      "playerId": "player_2",
      "type": "buy",
      "payload": { "itemId": "horse_1", "price": 150 }
    }
  ],
  "stateSnapshots": [
    {
      "timestamp": 0,
      "phase": "SHOP",
      "players": { ... },
      "inventory": { ... }
    }
  ]
}
```

## Commands

### Start Recording
```bash
/ws-replay record --room=XYZW
```

### Stop Recording
```bash
/ws-replay stop
```

### Replay Session
```bash
/ws-replay play session_20250105_143022.json
```

### Replay with Speed Control
```bash
/ws-replay play session.json --speed=2x
/ws-replay play session.json --speed=0.5x
/ws-replay play session.json --pause-on=race_start
```

### Compare Two Sessions
```bash
/ws-replay diff session1.json session2.json
```

### Filter Messages
```bash
/ws-replay play session.json --filter=betting
/ws-replay play session.json --player=player_2
```

## Output Format

### Recording Status
```
🔴 RECORDING WebSocket Session
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Room: XYZW
Duration: 00:05:23
Messages: 247
Players: 4

Recent Activity:
─────────────────────────────────────────────
[00:05:20] → player_1: ready_up
[00:05:21] ← broadcast: phase_change (BETTING → RACE)
[00:05:21] ← broadcast: race_keyframes (1247 frames)
[00:05:22] → player_3: race_action (boost)
[00:05:23] → player_2: race_action (conserve)

Press Ctrl+C to stop recording
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Replay Output
```
▶️  REPLAYING Session: session_20250105_143022
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Original Duration: 15:23
Playback Speed: 1x
Players: player_1, player_2, player_3, player_4

[00:00:00] PHASE: LOBBY
─────────────────────────────────────────────
  → player_1 joined room XYZW
  → player_2 joined room XYZW
  ← room_state broadcast

[00:00:45] PHASE: SHOP
─────────────────────────────────────────────
  → player_1: buy { horse: "Thunderbolt", price: 150 }
  ← player_1: gold_update { gold: 350 }
  → player_2: reroll
  ← player_2: shop_inventory { items: [...] }
  ...

[00:01:30] PHASE: BETTING
─────────────────────────────────────────────
  → player_1: place_bet { type: "win", horse: 3, amount: 50 }
  → player_2: skip_betting
  ...

[00:02:00] PHASE: RACE  ← PAUSED (press Enter to continue)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Session Diff
```
🔍 Session Comparison
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Session A: session_20250105_143022 (working)
Session B: session_20250105_151847 (bugged)

Differences Found: 3
─────────────────────────────────────────────

1. Message Count Mismatch
   Session A: 247 messages
   Session B: 251 messages (+4)

2. State Divergence at 00:02:15
   Session A: player_2.gold = 425
   Session B: player_2.gold = 475  ← Extra 50 gold!

   Cause: Duplicate bet_payout message in Session B

3. Race Result Difference
   Session A: [1,3,2,4,5,6,7,8]
   Session B: [1,2,3,4,5,6,7,8]

   Cause: Different race seed used

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Storage Location

Sessions saved to:
```
/recordings/
├── session_20250105_143022.json
├── session_20250105_151847.json
└── index.json  (session metadata)
```

## Implementation

The skill will:
1. Hook into WebSocket message handlers
2. Capture all incoming/outgoing messages with timestamps
3. Take state snapshots at phase transitions
4. Save sessions to JSON files
5. Provide replay with timing reconstruction
6. Support speed control and pause/resume
7. Enable filtering by message type or player
8. Generate diffs between sessions
9. Identify state divergence points
