import { describe, expect, it } from 'vitest';
import { getDifficultyProfile } from '../../difficulty/src/index';
import { GameConfig, PlayerId } from '../../engine/src/types';
import {
  BalanceAnalyzer,
  BalanceScenario,
  buildStandardScenarioMatrix,
  computeFairnessMetrics,
} from './balance';
import { SimulationResult } from './index';

const baseConfig: Omit<GameConfig, 'playerCount' | 'boardSize'> = {
  enabledRules: [],
  scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
  turnSystem: { type: 'simultaneous', maxRounds: 5, timerSeconds: 30 },
};

describe('Balance analysis contract', () => {
  it('computes fairness metrics for an even distribution', () => {
    const metrics = computeFairnessMetrics(
      { p1: 0.25, p2: 0.25, p3: 0.25, p4: 0.25 },
      0.1,
    );

    expect(metrics.expectedWinRate).toBe(0.25);
    expect(metrics.maxDeviation).toBe(0);
    expect(metrics.standardDeviation).toBe(0);
    expect(metrics.isBalanced).toBe(true);
  });

  it('flags imbalanced distributions when max deviation exceeds tolerance', () => {
    const metrics = computeFairnessMetrics(
      { p1: 0.6, p2: 0.2, p3: 0.1, p4: 0.1 },
      0.15,
    );

    expect(metrics.maxDeviation).toBeCloseTo(0.35, 6);
    expect(metrics.isBalanced).toBe(false);
  });

  it('builds scenario-level pass/fail summary from simulation outputs', () => {
    const scenarios: BalanceScenario[] = [
      {
        id: 'balanced-4p',
        config: { ...baseConfig, playerCount: 4, boardSize: 13 },
        botPersonalities: {
          p1: getDifficultyProfile('normal'),
          p2: getDifficultyProfile('normal'),
          p3: getDifficultyProfile('normal'),
          p4: getDifficultyProfile('normal'),
        },
        iterations: 5,
      },
      {
        id: 'unbalanced-3p',
        config: { ...baseConfig, playerCount: 3, boardSize: 13 },
        botPersonalities: {
          p1: getDifficultyProfile('normal'),
          p2: getDifficultyProfile('normal'),
          p3: getDifficultyProfile('normal'),
        },
        iterations: 5,
      },
    ];

    const report = BalanceAnalyzer.runScenarios(scenarios, {
      fairnessTolerance: 0.15,
      focusViolationTolerance: 0.2,
      executor: (config): SimulationResult => {
        if (config.playerCount === 4) {
          return {
            winRates: { p1: 0.25, p2: 0.25, p3: 0.25, p4: 0.25 } as Record<
              PlayerId,
              number
            >,
            avgGameLength: 5,
            totalCaptures: 1.2,
            avgFocusViolations: 0.1,
          };
        }
        return {
          winRates: { p1: 0.7, p2: 0.2, p3: 0.1 } as Record<PlayerId, number>,
          avgGameLength: 5,
          totalCaptures: 1.4,
          avgFocusViolations: 0.3,
        };
      },
    });

    expect(report.summary.totalScenarios).toBe(2);
    expect(report.summary.passingScenarios).toBe(1);
    expect(report.summary.failingScenarios).toBe(1);
    expect(report.summary.worstScenarioId).toBe('unbalanced-3p');

    const byId = Object.fromEntries(
      report.results.map((entry) => [entry.scenarioId, entry]),
    ) as Record<PlayerId, (typeof report.results)[number]>;
    expect(byId['balanced-4p'].passed).toBe(true);
    expect(byId['unbalanced-3p'].passed).toBe(false);
  });

  it('builds a deterministic standard matrix for players 2..8', () => {
    const scenarios = buildStandardScenarioMatrix(baseConfig, {
      seed: 'matrix-seed',
      difficulty: 'hard',
      iterations: 9,
    });

    expect(scenarios).toHaveLength(7);
    expect(scenarios[0].config.playerCount).toBe(2);
    expect(scenarios[0].config.boardSize).toBe(11);
    expect(scenarios[2].config.playerCount).toBe(4);
    expect(scenarios[2].config.boardSize).toBe(13);
    expect(scenarios[6].config.playerCount).toBe(8);
    expect(scenarios[6].config.boardSize).toBe(15);
    expect(scenarios[3].iterations).toBe(9);
    expect(scenarios[3].options?.seed).toBe('matrix-seed|players:5');
    expect(scenarios[3].botPersonalities.p1).toStrictEqual(
      getDifficultyProfile('hard'),
    );
  });
});
