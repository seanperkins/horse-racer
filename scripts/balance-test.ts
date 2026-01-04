/**
 * Balance Testing Script
 *
 * Run simulations to test game balance after stats changes.
 * Usage: npx tsx scripts/balance-test.ts
 */

import { RaceSimulator } from '../game/simulation/RaceSimulator';
import type { RaceParticipant, Track, Bloodline, Horse, Jockey } from '../types/game';

// Configuration
const NUM_RACES = 100; // Reduced for faster testing
const HORSES_PER_RACE = 8;

// Test results storage
interface TestResults {
  bloodlineWins: Record<string, number>;
  bloodlineFinishes: Record<string, number[]>;
  totalRaces: number;
  raceTimes: number[];
}

// Bloodline stat profiles (based on PRD)
const BLOODLINE_PROFILES: Record<Bloodline, { speed: number; stamina: number; grit: number; temper: number }> = {
  'Northern Storm': { speed: 8, stamina: 6, grit: 7, temper: 5 },
  'Desert Wind': { speed: 7, stamina: 8, grit: 5, temper: 6 },
  'Iron Heart': { speed: 6, stamina: 7, grit: 9, temper: 4 },
  'Wild Card': { speed: 7, stamina: 7, grit: 6, temper: 8 },
  'Mudblood': { speed: 5, stamina: 8, grit: 7, temper: 6 },
  'Royal Line': { speed: 9, stamina: 5, grit: 6, temper: 7 },
};

// Generate test horse
function generateTestHorse(bloodline: Bloodline, index: number): Horse {
  const profile = BLOODLINE_PROFILES[bloodline];
  const variance = () => Math.floor(Math.random() * 3 - 1); // -1, 0, or 1

  const stats = {
    speed: Math.max(1, Math.min(10, profile.speed + variance())),
    stamina: Math.max(1, Math.min(10, profile.stamina + variance())),
    grit: Math.max(1, Math.min(10, profile.grit + variance())),
    temper: Math.max(1, Math.min(10, profile.temper + variance())),
  };

  return {
    id: `test-horse-${bloodline}-${index}`,
    name: `${bloodline} #${index}`,
    tier: 2,
    bloodline,
    stats,
    potential: {
      speed: Math.min(10, stats.speed + 2),
      stamina: Math.min(10, stats.stamina + 2),
      grit: Math.min(10, stats.grit + 2),
      temper: Math.min(10, stats.temper + 2),
    },
    cost: 3,
  };
}

// Generate test jockey
function generateTestJockey(index: number): Jockey {
  return {
    id: `test-jockey-${index}`,
    name: `Jockey ${index}`,
    stats: {
      skill: 5 + Math.floor(Math.random() * 3),
      timing: 5 + Math.floor(Math.random() * 3),
      weight: 5 + Math.floor(Math.random() * 3),
    },
    style: 'classic',
  };
}

// Generate test track
function generateTestTrack(index: number): Track {
  const surfaces: Array<'dry_dirt' | 'wet_muddy' | 'turf_grass'> = ['dry_dirt', 'wet_muddy', 'turf_grass'];
  const categories: Array<'sprint' | 'mixed' | 'distance'> = ['sprint', 'mixed', 'distance'];
  const distances: Record<string, number> = {
    sprint: 1000,
    mixed: 1600,
    distance: 2400,
  };

  const category = categories[index % categories.length];
  const surface = surfaces[index % surfaces.length];

  return {
    id: `test-track-${index}`,
    name: `Test Track ${index}`,
    distance: distances[category],
    surface,
    category,
  };
}

// Run balance test
async function runBalanceTest() {
  console.log('🏁 Horse Racing Balance Test\n');
  console.log(`Running ${NUM_RACES} races with ${HORSES_PER_RACE} horses each...\n`);

  const results: TestResults = {
    bloodlineWins: {
      'Northern Storm': 0,
      'Desert Wind': 0,
      'Iron Heart': 0,
      'Wild Card': 0,
      'Mudblood': 0,
      'Royal Line': 0,
    },
    bloodlineFinishes: {
      'Northern Storm': [],
      'Desert Wind': [],
      'Iron Heart': [],
      'Wild Card': [],
      'Mudblood': [],
      'Royal Line': [],
    },
    totalRaces: NUM_RACES,
    raceTimes: [],
  };

  const bloodlines: Bloodline[] = ['Northern Storm', 'Desert Wind', 'Iron Heart', 'Wild Card', 'Mudblood', 'Royal Line'];

  // Run races
  for (let raceNum = 0; raceNum < NUM_RACES; raceNum++) {
    // Generate participants (rotate through bloodlines)
    const participants: RaceParticipant[] = [];
    for (let i = 0; i < HORSES_PER_RACE; i++) {
      const bloodline = bloodlines[i % bloodlines.length];
      participants.push({
        playerId: `player-${i}`,
        playerName: `Player ${i}`,
        horse: generateTestHorse(bloodline, i),
        jockey: generateTestJockey(i),
        equipment: [],
      });
    }

    // Generate track
    const track = generateTestTrack(raceNum);

    // Run simulation
    const simulator = new RaceSimulator(participants, track, Date.now() + raceNum);
    const raceResults = simulator.simulate();

    // Record results
    raceResults.placements.forEach((placement, index) => {
      const participant = participants.find(p => p.horse.id === placement.horseId)!;
      const bloodline = participant.horse.bloodline;

      results.bloodlineFinishes[bloodline].push(index + 1);

      if (index === 0) {
        // Winner
        results.bloodlineWins[bloodline]++;
        results.raceTimes.push(placement.time);
      }
    });

    // Progress indicator
    if ((raceNum + 1) % 10 === 0) {
      console.log(`Completed ${raceNum + 1}/${NUM_RACES} races...`);
    }
  }

  // Calculate and display statistics
  console.log('\n📊 Balance Test Results\n');
  console.log('='.repeat(50));
  console.log('\n🏆 Bloodline Win Rates:\n');

  const expected = 100 / bloodlines.length; // Expected win rate for each bloodline

  for (const bloodline of bloodlines) {
    const wins = results.bloodlineWins[bloodline];
    const winRate = (wins / NUM_RACES) * 100;
    const deviation = Math.abs(winRate - expected);
    const status = deviation < 10 ? '✅' : deviation < 20 ? '⚠️' : '❌';

    console.log(`${status} ${bloodline.padEnd(20)}: ${winRate.toFixed(1)}% (${wins}/${NUM_RACES} races)`);
    console.log(`   Expected: ~${expected.toFixed(1)}%, Deviation: ${(winRate - expected).toFixed(1)}%`);
  }

  // Average finish position
  console.log('\n📍 Average Finish Position:\n');
  const expectedPosition = (HORSES_PER_RACE + 1) / 2;

  for (const bloodline of bloodlines) {
    const finishes = results.bloodlineFinishes[bloodline];
    if (finishes.length === 0) continue;

    const avgFinish = finishes.reduce((a, b) => a + b, 0) / finishes.length;
    const deviation = Math.abs(avgFinish - expectedPosition);
    const status = deviation < 1 ? '✅' : deviation < 2 ? '⚠️' : '❌';

    console.log(`${status} ${bloodline.padEnd(20)}: ${avgFinish.toFixed(2)} (Expected: ~${expectedPosition.toFixed(2)})`);
  }

  // Race time statistics
  if (results.raceTimes.length > 0) {
    const avgTime = results.raceTimes.reduce((a, b) => a + b, 0) / results.raceTimes.length;
    const minTime = Math.min(...results.raceTimes);
    const maxTime = Math.max(...results.raceTimes);

    console.log('\n⏱️  Race Time Statistics:\n');
    console.log(`Average winning time: ${avgTime.toFixed(2)}s`);
    console.log(`Fastest race: ${minTime.toFixed(2)}s`);
    console.log(`Slowest race: ${maxTime.toFixed(2)}s`);
    console.log(`Time variance: ${(maxTime - minTime).toFixed(2)}s`);
  }

  // Balance assessment
  console.log('\n🎯 Balance Assessment:\n');

  const issues: string[] = [];
  for (const bloodline of bloodlines) {
    const winRate = (results.bloodlineWins[bloodline] / NUM_RACES) * 100;
    const expectedRate = 100 / bloodlines.length;

    if (winRate > expectedRate * 1.5) {
      issues.push(`⚠️  ${bloodline} is too strong (${winRate.toFixed(1)}% win rate, expected ~${expectedRate.toFixed(1)}%)`);
    } else if (winRate < expectedRate * 0.5) {
      issues.push(`⚠️  ${bloodline} is too weak (${winRate.toFixed(1)}% win rate, expected ~${expectedRate.toFixed(1)}%)`);
    }
  }

  if (issues.length === 0) {
    console.log('✅ Game balance looks good! All bloodlines within acceptable ranges.');
  } else {
    console.log('Issues detected:\n');
    issues.forEach(issue => console.log(issue));
    console.log('\n💡 Consider adjusting stats for better balance.');
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n✨ Test complete!\n');
}

// Run the test
runBalanceTest().catch(error => {
  console.error('Error running balance test:', error);
  process.exit(1);
});
