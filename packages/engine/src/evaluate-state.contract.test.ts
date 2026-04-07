import { describe, expect, it } from 'vitest';
import { evaluateState } from './engine';
import { GameState, PieceType } from './types';

const makeState = (): GameState => ({
  config: {
    playerCount: 2,
    boardSize: 11,
    enabledRules: [],
    scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
    turnSystem: { type: 'simultaneous', maxRounds: 40, timerSeconds: 30 },
  },
  round: 1,
  status: 'playing',
  history: [],
  players: {
    p1: { id: 'p1', score: 3, isEliminated: false, dropReserve: [], color: '#f00' },
    p2: { id: 'p2', score: 1, isEliminated: false, dropReserve: [], color: '#00f' },
  },
  pieces: [
    { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 5, y: 0 } },
    { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 5, y: 10 } },
  ],
});

describe('evaluateState contract', () => {
  it('returns a stable summary with per-player values', () => {
    const state = makeState();
    const evaluation = evaluateState(state);

    expect(evaluation).toHaveProperty('scores');
    expect(evaluation).toHaveProperty('leaderIds');
    expect(Object.keys((evaluation as any).scores).sort()).toStrictEqual(['p1', 'p2']);
  });

  it('is deterministic for the same state', () => {
    const state = makeState();
    const first = evaluateState(state);
    const second = evaluateState(state);
    expect(second).toStrictEqual(first);
  });

  it('returns all leaders sorted when there is a score tie', () => {
    const state = makeState();
    state.players.p1.score = 5;
    state.players.p2.score = 5;

    const evaluation = evaluateState(state);
    expect(evaluation.leaderIds).toStrictEqual(['p1', 'p2']);
    expect(evaluation.scores.p1).toBe(5);
    expect(evaluation.scores.p2).toBe(5);
  });
});
