# Test Balance

**Description:** Run race simulations to test game balance and verify stats changes.

**When to use:** After modifying horse stats, bloodlines, equipment, jockey traits, or race simulation logic.

## Instructions

You are responsible for testing game balance through automated race simulations. Your job is to ensure that stats changes don't break game balance or create dominant strategies.

### Steps:

1. **Understand What Changed**
   - Review recent commits or user description
   - Identify which stats, mechanics, or formulas were modified
   - Note expected impact of changes

2. **Create Test Script**
   - Write a TypeScript/JavaScript script to run simulations
   - Use existing race simulation code from `server/raceSimulation.ts`
   - Import types from `types/units.ts`
   - Generate diverse test scenarios

3. **Run Simulations**
   - Create horses with varied stats and bloodlines
   - Test different track conditions (distance, surface, category)
   - Run 100-1000+ races to get statistical significance
   - Vary equipment and jockey combinations

4. **Analyze Results**
   - Calculate win rates by bloodline
   - Measure average race times
   - Check stat correlation with performance
   - Identify outliers or dominant strategies
   - Look for stats that have no effect

5. **Generate Report**
   - Present findings in clear, actionable format
   - Flag balance issues (>60% win rate for one bloodline, etc.)
   - Show before/after comparisons if testing changes
   - Recommend adjustments if needed

6. **Create Test File**
   - Save simulation script to `scripts/balance-test.ts`
   - Make it runnable with `npx tsx scripts/balance-test.ts`
   - Include documentation in comments

### Test Scenarios

Include these scenarios:

- **Bloodline Balance**: Each bloodline should win ~25% (4 bloodlines)
- **Stat Effectiveness**: Each stat should meaningfully affect outcomes
- **Track Variety**: Different tracks should favor different horse types
- **Equipment Impact**: Equipment should provide measurable benefits
- **Jockey Impact**: Jockeys should influence race outcomes
- **Consistency**: Similar horses should have similar results
- **Variance**: Races shouldn't be completely predictable

### Metrics to Track

- Win rate by bloodline
- Average finish time by stat ranges
- Standard deviation of results
- Equipment effectiveness (win % with vs without)
- Jockey trait impact on placement
- Track surface preferences
- Distance specialization

### Balance Thresholds

Flag issues if:
- Any bloodline wins >40% or <15% (expect ~25%)
- Any stat shows <5% correlation with performance
- Equipment provides >50% win rate boost
- Jockey traits have no measurable impact
- One track type heavily dominates
- Results are too predictable (low variance)

## Example Output

```
🏁 Balance Test Results (1000 races)

Bloodline Win Rates:
✅ Thoroughbred: 26.3% (Expected: ~25%)
✅ Arabian: 24.1% (Expected: ~25%)
✅ Quarter Horse: 27.8% (Expected: ~25%)
✅ Andalusian: 21.8% (Expected: ~25%)

Stat Correlations:
✅ Speed: 0.72 (strong positive)
✅ Stamina: 0.58 (moderate positive)
⚠️  Consistency: 0.12 (weak - investigate!)

Equipment Impact:
✅ Racing Saddle: +8.3% win rate
✅ Endurance Shoes: +6.1% win rate
✅ Training Bridle: +4.2% win rate

Issues Found:
⚠️  Consistency stat has minimal impact on race outcomes
⚠️  Sprint races (<1200m) heavily favor Quarter Horses (45% win rate)

Recommendations:
1. Increase consistency impact on stumble/surge probability
2. Add stamina penalty for Quarter Horses in short races
3. Retest after changes
```

## Script Template

```typescript
// scripts/balance-test.ts
import { simulateRace } from '../server/raceSimulation';
import type { Horse, Track } from '../types/units';

interface BalanceTestResults {
  bloodlineWins: Record<string, number>;
  totalRaces: number;
  avgTimeByBloodline: Record<string, number[]>;
}

async function runBalanceTest(numRaces: number = 1000) {
  console.log(`🏁 Running ${numRaces} race simulations...\n`);

  const results: BalanceTestResults = {
    bloodlineWins: {},
    totalRaces: numRaces,
    avgTimeByBloodline: {},
  };

  // Generate test horses and tracks
  // Run simulations
  // Collect statistics
  // Generate report

  return results;
}

runBalanceTest().then(results => {
  console.log('📊 Test Complete!');
  // Print formatted results
});
```

## Notes

- Always run a baseline before making changes
- Save results for comparison
- Focus on statistical significance (100+ races minimum)
- Consider edge cases and extreme values
- Balance is subjective - some variance is good!
- Document findings in commit messages
