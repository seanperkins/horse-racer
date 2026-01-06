# AI Player Testing Skill

Test multiplayer game scenarios with AI players.

## Usage

```bash
/ai-player
```

## What This Skill Does

Spawns AI players in game rooms to test multiplayer functionality, stress test the server, and validate game flow with various player counts.

## Options

When invoked, you can:
1. **Quick Test**: Add 1 AI player to current room
2. **Fill Room**: Add AI players until room is full (8 players)
3. **Custom Count**: Specify exact number of AI players (1-7)
4. **Stress Test**: Create multiple rooms with full AI players
5. **Behavior Config**: Set AI decision patterns

## AI Player Behaviors

### Random (Default)
- Makes random valid purchases in shop
- Picks random jockey/horse assignments
- Places random bets or skips

### Optimal
- Buys best value items based on stats
- Optimizes jockey-horse pairings
- Makes educated betting decisions

### Aggressive
- Spends all gold immediately
- Always uses burst/sprint strategies
- Places maximum bets

### Conservative
- Saves gold, minimal purchases
- Uses conserve strategy
- Skips betting often

### Chaos
- Makes intentionally bad decisions
- Tests edge cases and validation
- Rapid action spam

## Commands

### Add AI Players to Room
```typescript
// In GameRoom.ts
gameRoom.addAIPlayers(count: number, behavior: AIBehavior)
```

### Create Test Room with AI
```typescript
// Create room with 4 AI players
const room = new GameRoom({ maxPlayers: 8 })
room.addAIPlayers(4, 'random')
```

### Run AI Stress Test
```bash
npm run test:ai-stress -- --rooms=5 --players=8
```

## Test Scenarios

### Scenario 1: Solo Play
- 1 human + 7 AI players
- Verify all phases work correctly
- Check race simulation with full field

### Scenario 2: Mixed Room
- 4 humans + 4 AI players
- Test synchronization between human and AI actions
- Verify ready-up system works

### Scenario 3: Full AI Room
- 8 AI players, no humans
- Automated game loop testing
- Performance and memory monitoring

### Scenario 4: Edge Cases
- AI joins mid-game
- AI disconnects during race
- AI with invalid inputs (should be rejected)

## Output Format

```
🤖 AI Player Testing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Room: XYZW
Current Players: 2/8 (1 human, 1 AI)

Adding 5 AI players...
  ✓ AI_Player_1 joined (random behavior)
  ✓ AI_Player_2 joined (random behavior)
  ✓ AI_Player_3 joined (optimal behavior)
  ✓ AI_Player_4 joined (aggressive behavior)
  ✓ AI_Player_5 joined (conservative behavior)

Room Status: 7/8 (1 human, 6 AI)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AI Activity Log:
─────────────────────────────────────────────
[SHOP] AI_Player_1 purchased "Thunderbolt" (150g)
[SHOP] AI_Player_2 purchased "Steel Rider" (100g)
[SHOP] AI_Player_3 rerolled shop (-25g)
[PREP] AI_Player_1 assigned jockey to horse
[BET]  AI_Player_4 placed Win bet on #3 (50g)
[BET]  AI_Player_5 skipped betting
─────────────────────────────────────────────

Game Progress:
  Current Phase: BETTING (15s remaining)
  Ready Status: 5/7 ready

Performance:
  Memory: 145 MB
  Messages/sec: 23
  Avg Response: 12ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Stress Test Output

```
🔥 AI Stress Test Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Configuration:
  Rooms: 5
  Players per room: 8 (all AI)
  Races per room: 3
  Total simulated players: 40

Results:
  ✓ All rooms completed successfully
  ✓ No memory leaks detected
  ✓ All races deterministic

Performance Metrics:
  Peak memory: 512 MB
  Avg race simulation: 234ms
  WebSocket messages: 15,420
  Message failures: 0

Warnings:
  ⚠️  Room ABCD had 150ms lag spike at race start

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Implementation

The skill will:
1. Connect to existing room or create new one
2. Spawn requested number of AI players
3. Configure AI behavior patterns
4. Monitor AI actions and game state
5. Log all AI decisions for debugging
6. Track performance metrics
7. Report any errors or anomalies
8. Clean up AI players on completion
