# Neighs of Thunder - Claude Code Skills

Custom development skills for accelerating Neighs of Thunder development and testing.

## Available Skills

### 1. `/race-sim` - Race Simulation Tester
**Purpose:** Test race simulation balance and determinism

**Use Cases:**
- Validate stat formulas work correctly
- Test different horse/jockey combinations
- Run Monte Carlo simulations for win rate analysis
- Verify deterministic behavior (same seed = same result)

**Example:**
```bash
/race-sim
# Runs a quick test race with random entries

/race-sim --monte-carlo 100
# Runs 100 races to analyze win rates

/race-sim --determinism-check
# Verifies same seed produces identical results
```

---

### 2. `/balance-check` - Game Balance Analyzer
**Purpose:** Validate game balance against PRD specifications

**Use Cases:**
- Identify overpowered or underpowered horses/jockeys
- Verify stat budgets match tier requirements
- Check equipment costs align with bonuses
- Validate bloodline synergies

**Example:**
```bash
/balance-check
# Analyzes all units and generates balance report

/balance-check --tier 3
# Only check Tier 3 horses

/balance-check --suggest-fixes
# Provides specific stat adjustment recommendations
```

---

### 3. `/pixelart-sprite` - Sprite Configuration Generator
**Purpose:** Generate Pixi.js sprite configurations and placeholder geometry

**Use Cases:**
- Set up sprite sheet configurations
- Generate placeholder shapes for MVP
- List all required animations
- Create TypeScript type definitions

**Example:**
```bash
/pixelart-sprite
# Generates full sprite configuration

/pixelart-sprite --placeholder-only
# Just creates geometric placeholder config

/pixelart-sprite --animation-list
# Lists all required animations with specs
```

---

### 4. `/websocket-debug` - WebSocket Message Inspector
**Purpose:** Debug WebSocket communication with real-time validation

**Use Cases:**
- Monitor messages between client and server
- Validate message schemas
- Debug connection issues
- Track performance metrics

**Example:**
```bash
/websocket-debug
# Monitors all WebSocket traffic

/websocket-debug --filter race_inputs
# Only show race-related messages

/websocket-debug --player user-123
# Monitor specific player's messages

/websocket-debug --no-validate
# Skip schema validation for raw viewing
```

---

### 5. `/deploy-check` - Pre-Deployment Validator
**Purpose:** Comprehensive deployment readiness validation

**Use Cases:**
- Run before deploying to Digital Ocean
- Catch issues before production
- Validate environment configuration
- Ensure all tests pass

**Example:**
```bash
/deploy-check
# Runs full validation suite

/deploy-check --fix
# Auto-fix common issues

/deploy-check --skip-e2e
# Skip E2E tests for faster check
```

---

### 6. `/commit` - Smart Git Commit
**Purpose:** Create well-formatted commits with auto-generated messages

**Use Cases:**
- Quick commits with conventional commit messages
- Analyze changes and generate appropriate message
- Follow repository commit style
- Ensure commit message quality

**Example:**
```bash
/commit
# Create commit with auto-generated message

/commit --all
# Stage all changes and commit

/commit --message "fix: reconnection bug"
# Use custom message

/commit --amend
# Amend last commit (if safe)
```

---

## How Skills Work

These skills are markdown documentation files that Claude Code reads to understand:
1. What the skill does
2. What parameters it accepts
3. What output it should produce
4. How to implement the functionality

When you invoke a skill (e.g., `/race-sim`), Claude Code:
1. Reads the skill documentation
2. Understands the context and requirements
3. Executes the necessary code/commands
4. Formats the output as specified

## Benefits

✅ **Faster Development** - Automate repetitive testing tasks
✅ **Better Testing** - Comprehensive validation of game mechanics
✅ **Early Bug Detection** - Catch issues before they reach production
✅ **Documentation** - Skills serve as living documentation
✅ **Consistency** - Same validation across all environments

## Creating New Skills

To add a new skill:

1. Create a `.md` file in `/skills/` directory
2. Document what the skill does
3. Provide usage examples
4. Specify expected output format
5. Describe implementation details

Claude Code will automatically detect and use the new skill!

---

## Skill Development Workflow

Recommended workflow when building features:

1. **Design Phase**: Use `/balance-check` to validate game data
2. **Implementation**: Write code, run `/race-sim` to test logic
3. **Integration**: Use `/websocket-debug` to verify client/server communication
4. **UI Development**: Use `/pixelart-sprite` for visual asset setup
5. **Deployment**: Run `/deploy-check` before pushing to production

This creates a tight feedback loop and catches issues early!
