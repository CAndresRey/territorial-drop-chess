import { describe, expect, it } from 'vitest';
import { TerritoryControlRule } from './index';
import { GameState, PieceType } from '../../engine/src/types';

const makePlayer = (id: string, squares: Array<{ x: number; y: number }>) => ({
  id,
  score: 0,
  isEliminated: false,
  dropReserve: [],
  color: '#f00',
  territory: {
    id,
    squares,
    palace: { origin: { x: 0, y: 0 }, size: 3 },
  },
});

const makeState = (playerCount: 2 | 4): GameState => ({
  config: {
    playerCount,
    boardSize: 13,
    enabledRules: ['territory-control'],
    scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
    turnSystem: { type: 'simultaneous', maxRounds: 40, timerSeconds: 30 },
  },
  round: 1,
  status: 'playing',
  history: [],
  players: {
    p1: makePlayer('p1', []),
    p2: makePlayer('p2', []),
    ...(playerCount === 4
      ? {
          p3: makePlayer('p3', []),
          p4: makePlayer('p4', []),
        }
      : {}),
  } as any,
  pieces: [],
});

describe('TerritoryControlRule', () => {
  it('returns no deltas in 2-player mode', () => {
    const state = makeState(2);
    const deltas = TerritoryControlRule.onScore!({ state });
    expect(deltas).toStrictEqual([]);
  });

  it('scores one point per 5 controlled territory squares', () => {
    const state = makeState(4);
    state.players.p1.territory!.squares = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ];
    state.pieces = [
      { id: 'r1', owner: 'p1', type: PieceType.Rook, position: { x: 0, y: 0 } },
      { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 10, y: 10 } },
    ];

    const deltas = TerritoryControlRule.onScore!({ state });
    expect(deltas).toContainEqual({
      playerId: 'p1',
      delta: 1,
      reason: 'Territory control',
    });
  });

  it('does not emit zero-point deltas when controlled squares are below threshold', () => {
    const state = makeState(4);
    state.players.p1.territory!.squares = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    state.pieces = [
      { id: 'r1', owner: 'p1', type: PieceType.Rook, position: { x: 0, y: 0 } },
      { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 10, y: 10 } },
    ];

    const deltas = TerritoryControlRule.onScore!({ state });
    expect(deltas).toStrictEqual([]);
  });

  it('counts uniquely reachable empty squares as controlled', () => {
    const state = makeState(4);
    state.players.p1.territory!.squares = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
    ];
    state.pieces = [
      { id: 'b1', owner: 'p1', type: PieceType.Bishop, position: { x: 0, y: 0 } },
      { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 12, y: 12 } },
    ];

    const deltas = TerritoryControlRule.onScore!({ state });
    expect(deltas).toContainEqual({
      playerId: 'p1',
      delta: 1,
      reason: 'Territory control',
    });
  });
});
