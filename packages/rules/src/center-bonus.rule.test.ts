import { describe, expect, it } from 'vitest';
import { CenterBonusRule } from './index';
import { GameState, PieceType } from '../../engine/src/types';

const makeState = (playerCount: 2 | 4): GameState => ({
  config: {
    playerCount,
    boardSize: playerCount === 2 ? 11 : 13,
    enabledRules: ['center-bonus'],
    scoring: { centerControl: 3, captureValue: {} as any, survivalBonus: 0 },
    turnSystem: { type: 'simultaneous', maxRounds: 40, timerSeconds: 30 },
  },
  round: 1,
  status: 'playing',
  history: [],
  players: {
    p1: { id: 'p1', score: 0, isEliminated: false, dropReserve: [], color: '#f00' },
    p2: { id: 'p2', score: 0, isEliminated: false, dropReserve: [], color: '#00f' },
    ...(playerCount === 4
      ? {
          p3: { id: 'p3', score: 0, isEliminated: false, dropReserve: [], color: '#0f0' },
          p4: { id: 'p4', score: 0, isEliminated: false, dropReserve: [], color: '#ff0' },
        }
      : {}),
  } as any,
  pieces: [
    { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 0, y: 0 } },
    { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 10, y: 10 } },
  ],
});

describe('CenterBonusRule', () => {
  it('does not score when player has less than threshold center squares in 4-player mode', () => {
    const state = makeState(4);
    state.pieces.push(
      { id: 'p1a', owner: 'p1', type: PieceType.Pawn, position: { x: 4, y: 4 } },
      { id: 'p1b', owner: 'p1', type: PieceType.Pawn, position: { x: 5, y: 4 } },
    );

    const deltas = CenterBonusRule.onScore!({ state });
    expect(deltas).toHaveLength(0);
  });

  it('scores when player reaches threshold center squares in 4-player mode', () => {
    const state = makeState(4);
    state.pieces.push(
      { id: 'p1a', owner: 'p1', type: PieceType.Pawn, position: { x: 4, y: 4 } },
      { id: 'p1b', owner: 'p1', type: PieceType.Pawn, position: { x: 5, y: 4 } },
      { id: 'p1c', owner: 'p1', type: PieceType.Pawn, position: { x: 6, y: 4 } },
    );

    const deltas = CenterBonusRule.onScore!({ state });
    expect(deltas).toStrictEqual([
      { playerId: 'p1', delta: 3, reason: 'Center control' },
    ]);
  });

  it('uses a threshold of 2 in 2-player mode', () => {
    const state = makeState(2);
    state.pieces.push(
      { id: 'p1a', owner: 'p1', type: PieceType.Pawn, position: { x: 4, y: 4 } },
      { id: 'p1b', owner: 'p1', type: PieceType.Pawn, position: { x: 5, y: 4 } },
    );

    const deltas = CenterBonusRule.onScore!({ state });
    expect(deltas).toStrictEqual([
      { playerId: 'p1', delta: 3, reason: 'Center control' },
    ]);
  });
});

