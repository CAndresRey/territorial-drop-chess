/**
 * run-balance-sim.ts — Run balance simulations and output a tuning report
 *
 * Usage: npx tsx packages/sim/src/run-balance-sim.ts
 */
import {
  DifficultyLevel,
  getDifficultyProfile,
} from '../../difficulty/src/index.js';
import {
  GameConfig,
  PersonalityProfile,
  PlayerId,
} from '../../engine/src/types.js';
import {
  BalanceAnalyzer,
  buildStandardScenarioMatrix
} from './balance.js';
import { SimulationResult, SimulationRunner } from './index.js';

const ITERATIONS = 30; // enough for statistical signal, fast enough for dev
const SEED = 'balance-tuning-v2';

const baseConfig: Omit<GameConfig, 'playerCount' | 'boardSize'> = {
  enabledRules: [],
  scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
  turnSystem: { type: 'simultaneous', maxRounds: 40, timerSeconds: 30 },
};

// ── 1. Run difficulty-vs-difficulty matchups ─────────────────────────────────
const runDifficultyMatchup = (
  d1: DifficultyLevel,
  d2: DifficultyLevel,
  playerCount: 2 | 4,
): SimulationResult => {
  const boardSize = playerCount === 2 ? 11 : 13;
  const config: GameConfig = { ...baseConfig, playerCount, boardSize };
  const players = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);
  const personalities = Object.fromEntries(
    players.map((id, i) => [id, getDifficultyProfile(i === 0 ? d1 : d2)]),
  ) as Record<PlayerId, PersonalityProfile>;

  return SimulationRunner.run(config, personalities, ITERATIONS, {
    seed: `${SEED}|${d1}-vs-${d2}|${playerCount}p`,
  });
};

// ── 2. Run full balance matrix ───────────────────────────────────────────────
const runBalanceMatrix = () => {
  const scenarios = buildStandardScenarioMatrix(baseConfig, {
    playerCounts: [2, 4, 6, 8],
    difficulty: 'normal',
    iterations: ITERATIONS,
    seed: SEED,
  });

  return BalanceAnalyzer.runScenarios(scenarios, {
    defaultIterations: ITERATIONS,
    fairnessTolerance: 0.15,
    focusViolationTolerance: 0.5,
  });
};

// ── 3. Test specific personality tuning candidates ───────────────────────────
interface TuningCandidate {
  label: string;
  profile: PersonalityProfile;
}

const tuningCandidates: TuningCandidate[] = [
  {
    label: 'Aggressive-King-Hunter',
    profile: {
      aggression: 0.85,
      greed: 0.4,
      riskTolerance: 0.7,
      focusBias: 0.9,
      randomness: 0.05,
    },
  },
  {
    label: 'Center-Controller',
    profile: {
      aggression: 0.3,
      greed: 0.8,
      riskTolerance: 0.3,
      focusBias: 0.4,
      randomness: 0.1,
    },
  },
  {
    label: 'Defensive-Turtle',
    profile: {
      aggression: 0.15,
      greed: 0.5,
      riskTolerance: 0.1,
      focusBias: 0.2,
      randomness: 0.15,
    },
  },
  {
    label: 'Balanced-Sharp',
    profile: {
      aggression: 0.6,
      greed: 0.6,
      riskTolerance: 0.5,
      focusBias: 0.6,
      randomness: 0.08,
    },
  },
  {
    label: 'High-Mobility-Flanker',
    profile: {
      aggression: 0.5,
      greed: 0.3,
      riskTolerance: 0.6,
      focusBias: 0.5,
      randomness: 0.12,
    },
  },
];

const runTuningRoundRobin = () => {
  const results: {
    label: string;
    wins: number;
    games: number;
    avgScore: number;
  }[] = [];
  const config: GameConfig = { ...baseConfig, playerCount: 4, boardSize: 13 };

  for (const candidate of tuningCandidates) {
    let totalWins = 0;
    let totalGames = 0;

    // Pit candidate (p1) vs 3 "normal" bots
    const normalProfile = getDifficultyProfile('normal');
    const personalities: Record<PlayerId, PersonalityProfile> = {
      p1: candidate.profile,
      p2: normalProfile,
      p3: normalProfile,
      p4: normalProfile,
    };

    const result = SimulationRunner.run(config, personalities, ITERATIONS, {
      seed: `${SEED}|tuning|${candidate.label}`,
    });

    totalWins += result.winRates.p1 * ITERATIONS;
    totalGames += ITERATIONS;

    results.push({
      label: candidate.label,
      wins: totalWins,
      games: totalGames,
      avgScore: result.winRates.p1,
    });
  }

  return results;
};

// ── Main execution ───────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════');
console.log('  TDC Balance & AI Tuning Report');
console.log(`  Iterations per scenario: ${ITERATIONS} | Seed: ${SEED}`);
console.log('═══════════════════════════════════════════════════════════\n');

// --- Section 1: Difficulty Matchups ---
console.log('── 1. Difficulty Matchups (2-player) ──────────────────────');
const difficulties: DifficultyLevel[] = ['easy', 'normal', 'hard'];
for (const d1 of difficulties) {
  for (const d2 of difficulties) {
    if (d1 === d2) continue;
    const r = runDifficultyMatchup(d1, d2, 2);
    console.log(
      `  ${d1.padEnd(7)} vs ${d2.padEnd(7)} → p1 win: ${(r.winRates.p1 * 100).toFixed(1)}% | p2 win: ${(r.winRates.p2 * 100).toFixed(1)}% | avg rounds: ${r.avgGameLength.toFixed(1)} | captures/game: ${r.totalCaptures.toFixed(1)}`,
    );
  }
}

// --- Section 2: Balance Matrix ---
console.log('\n── 2. Fairness Balance Matrix (normal bots) ───────────────');
const balanceReport = runBalanceMatrix();
for (const result of balanceReport.results) {
  const rates = Object.entries(result.simulation.winRates)
    .map(([id, rate]) => `${id}:${(rate * 100).toFixed(0)}%`)
    .join(' ');
  console.log(
    `  ${result.scenarioId.padEnd(12)} ${result.passed ? '✅' : '❌'} | deviation: ${(result.fairness.maxDeviation * 100).toFixed(1)}% | focus-viol: ${result.simulation.avgFocusViolations.toFixed(2)} | ${rates}`,
  );
}
console.log(
  `\n  Summary: ${balanceReport.summary.passingScenarios}/${balanceReport.summary.totalScenarios} pass | avg deviation: ${(balanceReport.summary.averageMaxDeviation * 100).toFixed(1)}% | worst: ${balanceReport.summary.worstScenarioId}`,
);

// --- Section 3: Tuning Round-Robin ---
console.log('\n── 3. AI Personality Tuning (candidate vs 3 normal bots) ──');
const tuningResults = runTuningRoundRobin();
tuningResults
  .sort((a, b) => b.avgScore - a.avgScore)
  .forEach((r, i) => {
    const bar = '█'.repeat(Math.round(r.avgScore * 40));
    console.log(
      `  ${(i + 1).toString().padStart(2)}. ${r.label.padEnd(25)} win rate: ${(r.avgScore * 100).toFixed(1)}% ${bar}`,
    );
  });

// --- Section 4: Recommendations ---
console.log('\n── 4. Tuning Recommendations ───────────────────────────────');
const bestCandidate = tuningResults.sort((a, b) => b.avgScore - a.avgScore)[0];
const worstCandidate = tuningResults[tuningResults.length - 1];

console.log(
  `  Best personality:  ${bestCandidate.label} (${(bestCandidate.avgScore * 100).toFixed(1)}% win rate)`,
);
console.log(
  `  Worst personality: ${worstCandidate.label} (${(worstCandidate.avgScore * 100).toFixed(1)}% win rate)`,
);

const bestProfile = tuningCandidates.find(
  (c) => c.label === bestCandidate.label,
)!.profile;
console.log(`\n  Recommended "hard" profile update:`);
console.log(`    aggression:     ${bestProfile.aggression}`);
console.log(`    greed:          ${bestProfile.greed}`);
console.log(`    riskTolerance:  ${bestProfile.riskTolerance}`);
console.log(`    focusBias:      ${bestProfile.focusBias}`);
console.log(`    randomness:     ${bestProfile.randomness}`);

// Check if hard actually beats normal
const hardVsNormal = runDifficultyMatchup('hard', 'normal', 2);
const hardWinRate = hardVsNormal.winRates.p1 * 100;
console.log(
  `\n  Current "hard" vs "normal" win rate: ${hardWinRate.toFixed(1)}%`,
);
if (hardWinRate < 55) {
  console.log(
    '  ⚠️  Hard difficulty is NOT significantly stronger than normal — needs tuning!',
  );
} else if (hardWinRate > 80) {
  console.log('  ⚠️  Hard difficulty is TOO dominant — may frustrate players');
} else {
  console.log('  ✅ Hard difficulty is in a healthy range (55-80%)');
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  Report complete.');
console.log('═══════════════════════════════════════════════════════════');
