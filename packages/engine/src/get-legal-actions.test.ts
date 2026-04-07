import { describe, expect, it } from 'vitest';
import { getLegalActions } from './engine';
import { GameState, PieceType } from './types';

const baseState = (): GameState => ({
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
    p1: {
      id: 'p1',
      score: 0,
      isEliminated: false,
      dropReserve: [],
      color: '#f00',
    },
    p2: {
      id: 'p2',
      score: 0,
      isEliminated: false,
      dropReserve: [],
      color: '#00f',
    },
  },
  pieces: [],
});

describe('getLegalActions', () => {
  it('returns only actions for pieces owned by the requested player', () => {
    const state = baseState();
    state.pieces = [
      { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 6, y: 6 } },
      { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 1, y: 1 } },
    ];

    const actions = getLegalActions(state, 'p1');
    const moveActions = actions.filter((a) => a.type === 'move');

    expect(moveActions.length).toBeGreaterThan(0);
    expect(moveActions.every((a) => a.type === 'move' && a.pieceId === 'k1')).toBe(true);
  });

  it('does not return out-of-bounds moves', () => {
    const state = baseState();
    state.pieces = [
      { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 0, y: 0 } },
    ];

    const actions = getLegalActions(state, 'p1').filter(
      (a): a is Extract<typeof a, { type: 'move' }> => a.type === 'move',
    );

    expect(actions.some((a) => a.to.x < 0 || a.to.y < 0)).toBe(false);
    expect(
      actions.some(
        (a) => a.to.x >= state.config.boardSize || a.to.y >= state.config.boardSize,
      ),
    ).toBe(false);
  });

  it('includes drop actions when reserve pieces can be legally dropped', () => {
    const state = baseState();
    state.players.p1.dropReserve = [PieceType.Knight];

    const actions = getLegalActions(state, 'p1');
    const drops = actions.filter((a) => a.type === 'drop');

    expect(drops.length).toBeGreaterThan(0);
    expect(drops.every((a) => a.type === 'drop' && a.playerId === 'p1')).toBe(true);
  });

  it('is deterministic for the same state and player', () => {
    const state = baseState();
    state.pieces = [
      { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 6, y: 6 } },
    ];
    state.players.p1.dropReserve = [PieceType.Bishop];

    const first = getLegalActions(state, 'p1');
    const second = getLegalActions(state, 'p1');

    expect(second).toStrictEqual(first);
  });
});
