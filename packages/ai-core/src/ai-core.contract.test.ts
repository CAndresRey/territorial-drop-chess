import { describe, expect, it } from 'vitest';
import { AIEvaluator } from './index';
import { GameState, PieceType } from '../../engine/src/types';

const makeState = (): GameState => ({
  config: {
    playerCount: 4,
    boardSize: 13,
    enabledRules: [],
    scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
    turnSystem: { type: 'simultaneous', maxRounds: 40, timerSeconds: 30 },
  },
  round: 1,
  status: 'playing',
  history: [],
  players: {
    p1: { id: 'p1', score: 0, isEliminated: false, dropReserve: [], color: '#f00' },
    p2: { id: 'p2', score: 0, isEliminated: false, dropReserve: [], color: '#00f' },
  } as any,
  pieces: [
    { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 6, y: 6 } },
    { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 1, y: 1 } },
  ],
});

const personality = {
  aggression: 0,
  greed: 0,
  riskTolerance: 0,
  focusBias: 0,
  randomness: 0,
};

describe('AIEvaluator contract', () => {
  it('returns deterministic evaluation when randomness is zero', () => {
    const state = makeState();
    const first = AIEvaluator.evaluate(state, 'p1', personality);
    const second = AIEvaluator.evaluate(state, 'p1', personality);
    expect(second).toStrictEqual(first);
  });

  it('returns very low score for eliminated player', () => {
    const state = makeState();
    (state.players as any).p1.isEliminated = true;
    const result = AIEvaluator.evaluate(state, 'p1', personality);
    expect(result.score).toBeLessThan(-100);
  });

  it('is deterministic for same seed when randomness is enabled', () => {
    const state = makeState();
    const randomPersonality = { ...personality, randomness: 0.8 };

    const first = AIEvaluator.evaluate(state, 'p1', randomPersonality, {
      seed: 'same-seed',
    } as any);
    const second = AIEvaluator.evaluate(state, 'p1', randomPersonality, {
      seed: 'same-seed',
    } as any);

    expect(second).toStrictEqual(first);
  });

  it('produces different noisy evaluations for different seeds', () => {
    const state = makeState();
    const randomPersonality = { ...personality, randomness: 0.8 };

    const first = AIEvaluator.evaluate(state, 'p1', randomPersonality, {
      seed: 'seed-a',
    } as any);
    const second = AIEvaluator.evaluate(state, 'p1', randomPersonality, {
      seed: 'seed-b',
    } as any);

    expect(second.score).not.toBe(first.score);
  });
});
