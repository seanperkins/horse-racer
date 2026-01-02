# Race Simulation Skill

Test race simulation balance and determinism.

## Usage

```bash
/race-sim
```

## What This Skill Does

This skill runs the Thunder Hooves race simulation engine with test data to validate:
- Balance between horses/jockeys
- Deterministic behavior (same seed = same result)
- Stat formula correctness
- Strategy effectiveness

## Options

When invoked, you can:
1. **Quick Test**: Run a single race with random entries
2. **Custom Race**: Provide specific horse/jockey/equipment combinations
3. **Monte Carlo**: Run 100+ races to analyze win rate distributions
4. **Determinism Check**: Run same race multiple times to verify identical results

## Example Input

```json
{
  "entries": [
    {
      "horse": { "name": "Thunderbolt", "stats": { "speed": 8, "stamina": 3, "grit": 4, "temper": 6 } },
      "jockey": { "name": "Feather Martinez", "stats": { "skill": 6, "timing": 5, "weight": 3 } },
      "strategy": { "start": "burst", "mid": "push", "finish": "sprint" }
    }
  ],
  "track": {
    "name": "Lightning Lane",
    "category": "sprint",
    "surface": "dry_dirt",
    "distance": 6
  },
  "seed": "test-race-123"
}
```

## Output

Provides detailed race logs including:
- Position changes each tick
- Stamina burn rates
- Speed modifiers
- Key events (stumbles, surges, strategy changes)
- Final placements with time gaps
- Win probabilities (Monte Carlo mode)

## Implementation

The skill will:
1. Import the RaceSimulator from `/game/simulation/RaceSimulator.ts`
2. Generate test data if not provided
3. Run the simulation
4. Format and display results
5. Highlight any balance concerns
