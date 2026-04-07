import { describe, expect, it } from 'vitest';
import { MultiThreatRule } from './index';
import { GameState, PieceType, PlayerAction } from '../../engine/src/types';

const makeState = (playerCount: 2 | 3): GameState => ({
  config: {
    playerCount,
    boardSize: 11,
    enabledRules: ['multi-threat'],
    scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
    turnSystem: { type: 'simultaneous', maxRounds: 40, timerSeconds: 30 },
  },
  round: 1,
  status: 'playing',
  history: [],
  players: {
    p1: { id: 'p1', score: 0, isEliminated: false, dropReserve: [], color: '#f00' },
    p2: { id: 'p2', score: 0, isEliminated: false, dropReserve: [], color: '#00f' },
    ...(playerCount === 3
      ? {
          p3: { id: 'p3', score: 0, isEliminated: false, dropReserve: [], color: '#0f0' },
        }
      : {}),
  } as any,
  pieces: [],
});

describe('MultiThreatRule', () => {
  it('ignores non-move actions', () => {
    const state = makeState(3);
    const action: PlayerAction = {
      type: 'drop',
      playerId: 'p1',
      pieceType: PieceType.Knight,
      to: { x: 4, y: 4 },
    };

    expect(MultiThreatRule.onValidateMove!({ state, action })).toStrictEqual({
      isValid: true,
    });
  });

  it('is disabled in 2-player games', () => {
    const state = makeState(2);
    state.pieces = [
      { id: 'r1', owner: 'p1', type: PieceType.Rook, position: { x: 0, y: 0 } },
      { id: 'e1', owner: 'p2', type: PieceType.Rook, position: { x: 5, y: 2 } },
    ];
    const action: PlayerAction = {
      type: 'move',
      pieceId: 'r1',
      from: { x: 0, y: 0 },
      to: { x: 0, y: 2 },
    };

    expect(MultiThreatRule.onValidateMove!({ state, action })).toStrictEqual({
      isValid: true,
    });
  });

  it('rejects a non-king move threatened by at least two opponents', () => {
    const state = makeState(3);
    state.pieces = [
      { id: 'r1', owner: 'p1', type: PieceType.Rook, position: { x: 0, y: 0 } },
      { id: 'e1', owner: 'p2', type: PieceType.Rook, position: { x: 5, y: 2 } },
      { id: 'e2', owner: 'p3', type: PieceType.Rook, position: { x: 0, y: 5 } },
    ];
    const action: PlayerAction = {
      type: 'move',
      pieceId: 'r1',
      from: { x: 0, y: 0 },
      to: { x: 0, y: 2 },
    };

    expect(MultiThreatRule.onValidateMove!({ state, action })).toStrictEqual({
      isValid: false,
      error: 'Multi-threat: move exposes piece to >=2 opponents',
    });
  });

  it('allows king moves even when threatened by at least two opponents', () => {
    const state = makeState(3);
    state.pieces = [
      { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 0, y: 0 } },
      { id: 'e1', owner: 'p2', type: PieceType.Rook, position: { x: 5, y: 2 } },
      { id: 'e2', owner: 'p3', type: PieceType.Rook, position: { x: 0, y: 5 } },
    ];
    const action: PlayerAction = {
      type: 'move',
      pieceId: 'k1',
      from: { x: 0, y: 0 },
      to: { x: 0, y: 2 },
    };

    expect(MultiThreatRule.onValidateMove!({ state, action })).toStrictEqual({
      isValid: true,
    });
  });
});

