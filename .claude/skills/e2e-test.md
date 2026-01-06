# End-to-End Test Runner Skill

Run Playwright E2E tests with smart options and debugging support.

## Usage

```bash
/e2e-test
```

## What This Skill Does

Executes Playwright end-to-end tests with various modes for development, debugging, and CI environments.

## Options

When invoked, you can:
1. **Run All Tests**: Execute the full E2E test suite
2. **Run Specific File**: Target a single test file (e.g., `tests/e2e/auth.spec.ts`)
3. **Run by Pattern**: Match test names or file patterns
4. **Debug Mode**: Run in headed browser with slow motion
5. **Update Snapshots**: Regenerate visual regression baselines

## Commands

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/game-flow.spec.ts
```

### Run Tests Matching Pattern
```bash
npx playwright test --grep "betting"
```

### Debug Mode (Headed + Slow)
```bash
npx playwright test --headed --slowmo=500
```

### Run with UI Mode
```bash
npx playwright test --ui
```

### Update Visual Snapshots
```bash
npx playwright test --update-snapshots
```

### Generate HTML Report
```bash
npx playwright test --reporter=html
npx playwright show-report
```

## Test Categories

The E2E tests cover:

### Authentication Flow
- User registration
- Login/logout
- Session persistence
- Protected routes

### Game Flow
- Room creation and joining
- Friend code sharing
- Phase transitions
- Player ready-up system

### Shop Phase
- Purchasing horses/jockeys/equipment
- Rerolling inventory
- Gold management
- Inventory limits

### Betting Phase
- Placing bets (Win/Place/Exacta)
- Odds display
- Skip betting functionality

### Race Phase
- Race visualization loads
- Results display correctly
- Payouts calculated

## Output Format

```
🎭 Playwright E2E Test Runner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running: tests/e2e/game-flow.spec.ts

✓ should create a new game room (2.3s)
✓ should allow player to join with friend code (1.8s)
✓ should transition through all game phases (12.4s)
✗ should display race results correctly (3.2s)
  └─ Expected: "1st Place: Thunderbolt"
     Received: element not found
     Screenshot: test-results/race-results-failure.png

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Results: 3/4 passed (75%)
⏱️  Duration: 19.7s

📸 Screenshots saved to: test-results/
📋 HTML Report: npx playwright show-report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Failure Analysis

When tests fail, the skill will:
1. Display the exact assertion that failed
2. Show screenshot path for visual debugging
3. Provide trace file location for step-by-step replay
4. Suggest potential fixes based on error type

## CI Integration

For CI environments, use:
```bash
npx playwright test --reporter=github --retries=2
```

## Implementation

The skill will:
1. Check if Playwright is installed and configured
2. Ensure the dev server is running (or start it)
3. Run tests with requested options
4. Collect and format results
5. Save screenshots and traces on failure
6. Generate summary report
7. Return appropriate exit code for CI
