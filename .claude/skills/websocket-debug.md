# WebSocket Debug Skill

Debug WebSocket messages between client and server with real-time validation.

## Usage

```bash
/websocket-debug [options]
```

## What This Skill Does

Connects to the local WebSocket server and monitors all messages, validating them against Zod schemas and highlighting issues.

## Options

- `--filter <type>`: Only show messages of specific type (e.g., `--filter shop_state`)
- `--player <id>`: Only show messages for specific player
- `--no-validate`: Skip Zod schema validation

## Output Format

```
🔵 [14:32:45.123] Client → Server
┌─────────────────────────────────────────────────────────────
│ Type: join_lobby
│ Size: 124 bytes
│ Player: user-123 (Alice)
│
│ {
│   "type": "join_lobby",
│   "playerName": "Alice",
│   "userId": "user-123",
│   "createPrivate": true,
│   "timestamp": 1704123165123
│ }
│
│ ✅ Schema: Valid
└─────────────────────────────────────────────────────────────

🟢 [14:32:45.156] Server → Client
┌─────────────────────────────────────────────────────────────
│ Type: lobby_state
│ Size: 342 bytes
│ Recipients: All (1 players)
│
│ {
│   "type": "lobby_state",
│   "players": [
│     { "id": "user-123", "name": "Alice", "ready": false }
│   ],
│   "requiredPlayers": 8,
│   "friendCode": "BAKE",
│   "isPrivate": true,
│   "timestamp": 1704123165156
│ }
│
│ ✅ Schema: Valid
└─────────────────────────────────────────────────────────────

🔴 [14:32:50.789] Client → Server
┌─────────────────────────────────────────────────────────────
│ Type: purchase_unit
│ Size: 98 bytes
│ Player: user-123 (Alice)
│
│ {
│   "type": "purchase_unit",
│   "unitId": "horse-thunderbolt",
│   "unitType": "horse"
│ }
│
│ ❌ Schema: INVALID
│ └─ Missing required field: timestamp
│
│ Expected:
│ {
│   type: 'purchase_unit',
│   unitId: string,
│   unitType: 'horse' | 'jockey' | 'equipment',
│   timestamp?: number  // ← Missing
│ }
└─────────────────────────────────────────────────────────────
```

## Features

### 1. Color-Coded Messages
- 🔵 Blue: Client → Server
- 🟢 Green: Server → Client
- 🔴 Red: Messages with validation errors

### 2. Schema Validation
Validates every message against Zod schemas from `/types/messages.ts`:
- Shows validation errors in detail
- Highlights missing/invalid fields
- Suggests correct format

### 3. Message Filtering
```bash
# Only show race-related messages
/websocket-debug --filter race_inputs --filter race_results

# Monitor specific player
/websocket-debug --player user-123

# All messages, no validation
/websocket-debug --no-validate
```

### 4. Performance Stats
```
📊 WebSocket Statistics (Last 60s)
─────────────────────────────────────────
Messages Sent:     147
Messages Received: 203
Total Bandwidth:   45.2 KB
Avg Latency:       12ms
Validation Errors: 3
─────────────────────────────────────────
```

## Implementation

The skill will:
1. Connect to `ws://localhost:3000/ws`
2. Listen to all messages on the connection
3. Parse JSON and attempt schema validation
4. Pretty-print with syntax highlighting
5. Track statistics (message count, bandwidth, latency)
6. Support real-time filtering
7. Gracefully handle malformed messages
8. Auto-reconnect on connection loss

## Use Cases

- **Debug connection issues**: See exactly what's being sent/received
- **Validate message format**: Catch schema errors before they cause bugs
- **Monitor game flow**: Watch phase transitions and state updates
- **Performance testing**: Track message size and frequency
- **Development**: Real-time feedback during feature development
