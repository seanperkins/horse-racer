# Performance Audit Skill

Profile and optimize game performance across rendering, networking, and server.

## Usage

```bash
/perf-audit
```

## What This Skill Does

Runs comprehensive performance analysis on the Thunder Hooves game, identifying bottlenecks in Pixi.js rendering, WebSocket communication, and server-side game logic.

## Options

When invoked, you can:
1. **Full Audit**: Run all performance checks
2. **Render Performance**: Focus on Pixi.js and FPS
3. **Network Performance**: WebSocket latency and throughput
4. **Server Performance**: Game room and simulation metrics
5. **Memory Analysis**: Check for leaks and bloat
6. **Lighthouse Audit**: Web vitals for pages

## Checks Performed

### 1. Pixi.js Rendering Performance
```
- FPS during race animation
- Sprite batch efficiency
- Texture memory usage
- Draw call count
- Frame time consistency
```

### 2. WebSocket Performance
```
- Message round-trip latency
- Messages per second capacity
- Connection stability
- Reconnection handling
- Message queue depth
```

### 3. Server Performance
```
- Race simulation time
- Room state update frequency
- Player action processing time
- Concurrent room capacity
- CPU/memory per room
```

### 4. Memory Analysis
```
- Heap size over time
- Garbage collection frequency
- Memory leak detection
- Component unmount cleanup
- WebSocket cleanup on disconnect
```

### 5. Page Load Performance
```
- Lighthouse scores (Performance, Accessibility, SEO)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Bundle size analysis
```

## Commands

### Run Full Performance Audit
```bash
npm run perf:audit
```

### Profile Race Rendering
```bash
npm run perf:render -- --duration=30
```

### WebSocket Load Test
```bash
npm run perf:websocket -- --connections=100 --messages=1000
```

### Memory Leak Detection
```bash
npm run perf:memory -- --iterations=10
```

### Lighthouse Audit
```bash
npx lighthouse http://localhost:3000 --output=html
```

## Output Format

```
⚡ Performance Audit Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎮 RENDERING PERFORMANCE
─────────────────────────────────────────────
  Average FPS:        58.2 fps     ✓ Good
  Min FPS:            42 fps       ⚠️ Dips below 60
  Frame Time:         17.1ms avg   ✓ Good
  Draw Calls:         24/frame     ✓ Efficient
  Texture Memory:     12.4 MB      ✓ Good
  Sprite Count:       156          ✓ Manageable

  Issues Found:
  ⚠️  FPS drops during stumble animations
     Recommendation: Optimize particle effects

📡 NETWORK PERFORMANCE
─────────────────────────────────────────────
  Avg Latency:        23ms         ✓ Excellent
  P99 Latency:        89ms         ✓ Good
  Messages/sec:       145          ✓ Good
  Failed Messages:    0            ✓ Perfect
  Reconnect Time:     1.2s         ✓ Acceptable

🖥️  SERVER PERFORMANCE
─────────────────────────────────────────────
  Race Simulation:    45ms         ✓ Fast
  State Updates:      8ms          ✓ Excellent
  Memory per Room:    2.3 MB       ✓ Efficient
  Max Concurrent:     50 rooms     ✓ Scalable

  Bottlenecks:
  ⚠️  Betting odds calculation: 12ms
     Recommendation: Cache odds until state change

🧠 MEMORY ANALYSIS
─────────────────────────────────────────────
  Initial Heap:       45 MB
  After 5 races:      52 MB
  After 10 races:     54 MB        ✓ No leak
  GC Frequency:       Every 30s    ✓ Normal

📊 PAGE LOAD (Lighthouse)
─────────────────────────────────────────────
  Performance:        89/100       ✓ Good
  Accessibility:      94/100       ✓ Good
  Best Practices:     100/100      ✓ Perfect
  SEO:                91/100       ✓ Good

  Core Web Vitals:
  LCP:  1.8s    ✓ Good (<2.5s)
  FID:  45ms    ✓ Good (<100ms)
  CLS:  0.02    ✓ Good (<0.1)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 SUMMARY
─────────────────────────────────────────────
Overall Score: 87/100 (Good)

Critical Issues: 0
Warnings: 2
Optimizations Available: 3

Priority Fixes:
1. Optimize stumble animation particles
2. Cache betting odds calculations
3. Lazy load non-critical sprites

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Benchmark Comparisons

The audit compares against these targets:
- **FPS**: Target 60fps, acceptable 45fps minimum
- **Latency**: Target <50ms, acceptable <100ms
- **Simulation**: Target <100ms for 8-player race
- **Memory**: No growth >10% after 10 races
- **LCP**: Target <2.5s

## Implementation

The skill will:
1. Start the dev server if not running
2. Connect performance monitoring tools
3. Run each category of tests
4. Collect and aggregate metrics
5. Compare against benchmarks
6. Generate actionable recommendations
7. Save detailed report to `docs/perf-report.md`
8. Optionally open browser DevTools for manual inspection
