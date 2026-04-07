import { describe, expect, it } from 'vitest';
import { SimulationRunner } from './index';
import { GameConfig } from '../../engine/src/types';

const config: GameConfig = {
  playerCount: 4,
  boardSize: 13,
  enabledRules: [],
  scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
  turnSystem: { type: 'simultaneous', maxRounds: 5, timerSeconds: 30 },
};

describe('SimulationRunner contract', () => {
  it('returns coherent metric structure', () => {
    const result = SimulationRunner.run(
      config,
      {
        p1: { aggression: 0, greed: 0, riskTolerance: 0, focusBias: 0, randomness: 0 },
        p2: { aggression: 0, greed: 0, riskTolerance: 0, focusBias: 0, randomness: 0 },
        p3: { aggression: 0, greed: 0, riskTolerance: 0, focusBias: 0, randomness: 0 },
        p4: { aggression: 0, greed: 0, riskTolerance: 0, focusBias: 0, randomness: 0 },
      },
      3,
    );

    expect(result).toHaveProperty('winRates');
    expect(result).toHaveProperty('avgGameLength');
    expect(result).toHaveProperty('totalCaptures');
    expect(result).toHaveProperty('avgFocusViolations');
  });

  it('runs without crashes for the full 2..8 player matrix', { timeout: 30000 }, () => {
    const configs: GameConfig[] = Array.from({ length: 7 }, (_, idx) => {
      const playerCount = (idx + 2) as GameConfig['playerCount'];
      return {
        ...config,
        playerCount,
        boardSize: playerCount === 2 ? 11 : playerCount <= 4 ? 13 : 15,
      };
    });

    for (const cfg of configs) {
      const players = Array.from({ length: cfg.playerCount }, (_, i) => `p${i + 1}`);
      const personalities = Object.fromEntries(
        players.map((playerId) => [
          playerId,
          { aggression: 0.2, greed: 0.2, riskTolerance: 0.2, focusBias: 0.2, randomness: 0.2 },
        ]),
      );

      const result = SimulationRunner.run(cfg, personalities, 2, { seed: `cfg-${cfg.playerCount}` });
      expect(result.avgGameLength).toBeGreaterThan(0);
      expect(result.totalCaptures).toBeGreaterThanOrEqual(0);
      expect(result.avgFocusViolations).toBeGreaterThanOrEqual(0);
    }
  });

  it('stays within smoke performance budgets for 2, 4 and 8 players', { timeout: 30000 }, () => {
    const budgetsMs: Record<number, number> = {
      2: 800,
      4: 1800,
      8: 4500,
    };

    for (const playerCount of [2, 4, 8] as const) {
      const cfg: GameConfig = {
        ...config,
        playerCount,
        boardSize: playerCount === 2 ? 11 : playerCount <= 4 ? 13 : 15,
      };
      const players = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);
      const personalities = Object.fromEntries(
        players.map((playerId) => [
          playerId,
          {
            aggression: 0.35,
            greed: 0.35,
            riskTolerance: 0.35,
            focusBias: 0.35,
            randomness: 0.25,
          },
        ]),
      );

      const start = Date.now();
      SimulationRunner.run(cfg, personalities, 3, { seed: `perf-${playerCount}` });
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThanOrEqual(budgetsMs[playerCount]);
    }
  });

  it('produces a coherent win-rate distribution that sums to approximately 1', () => {
    const result = SimulationRunner.run(
      config,
      {
        p1: { aggression: 0.2, greed: 0.2, riskTolerance: 0.2, focusBias: 0.2, randomness: 0.2 },
        p2: { aggression: 0.2, greed: 0.2, riskTolerance: 0.2, focusBias: 0.2, randomness: 0.2 },
        p3: { aggression: 0.2, greed: 0.2, riskTolerance: 0.2, focusBias: 0.2, randomness: 0.2 },
        p4: { aggression: 0.2, greed: 0.2, riskTolerance: 0.2, focusBias: 0.2, randomness: 0.2 },
      },
      8,
      { seed: 'coherent-rates' },
    );

    const total = Object.values(result.winRates).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it('is deterministic for the same seed and stochastic personalities', { timeout: 30000 }, () => {
    const personalities = {
      p1: { aggression: 0.2, greed: 0.2, riskTolerance: 0.2, focusBias: 0.2, randomness: 0.9 },
      p2: { aggression: 0.2, greed: 0.2, riskTolerance: 0.2, focusBias: 0.2, randomness: 0.9 },
      p3: { aggression: 0.2, greed: 0.2, riskTolerance: 0.2, focusBias: 0.2, randomness: 0.9 },
      p4: { aggression: 0.2, greed: 0.2, riskTolerance: 0.2, focusBias: 0.2, randomness: 0.9 },
    };
    const first = SimulationRunner.run(config, personalities, 6, { seed: 'same-seed' });
    const second = SimulationRunner.run(config, personalities, 6, { seed: 'same-seed' });

    expect(second).toStrictEqual(first);
  });
});
