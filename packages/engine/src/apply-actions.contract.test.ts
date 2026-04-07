import { describe, expect, it, vi } from 'vitest';
import { applyActions } from './engine';
import { GameState, PieceType, PlayerAction } from './types';

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
    p1: { id: 'p1', score: 0, isEliminated: false, dropReserve: [], color: '#f00' },
    p2: { id: 'p2', score: 0, isEliminated: false, dropReserve: [], color: '#00f' },
  },
  pieces: [
    { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 5, y: 0 } },
    { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 5, y: 10 } },
  ],
});

const makeDropState = (): GameState => ({
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
      dropReserve: [PieceType.Knight],
      color: '#f00',
    },
    p2: { id: 'p2', score: 0, isEliminated: false, dropReserve: [], color: '#00f' },
    p3: { id: 'p3', score: 0, isEliminated: false, dropReserve: [], color: '#0f0' },
    p4: { id: 'p4', score: 0, isEliminated: false, dropReserve: [], color: '#ff0' },
  },
  pieces: [
    { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 1, y: 1 } },
    { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 11, y: 1 } },
    { id: 'k3', owner: 'p3', type: PieceType.King, position: { x: 1, y: 11 } },
    { id: 'k4', owner: 'p4', type: PieceType.King, position: { x: 11, y: 11 } },
  ],
});

describe('applyActions contract', () => {
  it('applies valid actions and advances round', () => {
    const state = makeState();
    const actions: Record<string, PlayerAction | null> = {
      p1: { type: 'move', pieceId: 'k1', from: { x: 5, y: 0 }, to: { x: 5, y: 1 } },
      p2: null,
    };

    const next = applyActions(state, actions as any);
    expect(next.round).toBe(2);
    expect(next.pieces.find((p) => p.id === 'k1')?.position).toStrictEqual({ x: 5, y: 1 });
  });

  it('ignores invalid actions and keeps state valid', () => {
    const state = makeState();
    const actions: Record<string, PlayerAction | null> = {
      p1: { type: 'move', pieceId: 'k1', from: { x: 0, y: 0 }, to: { x: 5, y: 1 } },
      p2: null,
    };

    const next = applyActions(state, actions as any);
    expect(next.pieces.find((p) => p.id === 'k1')?.position).toStrictEqual({ x: 5, y: 0 });
  });

  it('captures non-king pieces and adds score + reserve to attacker', () => {
    const state = makeState();
    state.pieces.push({
      id: 'r1',
      owner: 'p1',
      type: PieceType.Rook,
      position: { x: 0, y: 0 },
    });
    state.pieces.push({
      id: 'b2',
      owner: 'p2',
      type: PieceType.Bishop,
      position: { x: 0, y: 2 },
    });

    const actions: Record<string, PlayerAction | null> = {
      p1: { type: 'move', pieceId: 'r1', from: { x: 0, y: 0 }, to: { x: 0, y: 2 } },
      p2: null,
    };

    const next = applyActions(state, actions as any);
    expect(next.pieces.some((p) => p.id === 'b2')).toBe(false);
    expect(next.players.p1.score).toBe(1);
    expect(next.players.p1.dropReserve).toStrictEqual([PieceType.Bishop]);
  });

  it('eliminates a player when their king is captured', () => {
    const state = makeState();
    state.pieces = [
      { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 5, y: 0 } },
      { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 5, y: 2 } },
      { id: 'r1', owner: 'p1', type: PieceType.Rook, position: { x: 0, y: 2 } },
    ];

    const actions: Record<string, PlayerAction | null> = {
      p1: { type: 'move', pieceId: 'r1', from: { x: 0, y: 2 }, to: { x: 5, y: 2 } },
      p2: null,
    };

    const next = applyActions(state, actions as any);
    expect(next.players.p2.isEliminated).toBe(true);
    expect(next.pieces.some((p) => p.id === 'k2')).toBe(false);
  });

  it('applies valid drops by consuming reserve and placing piece', () => {
    const state = makeDropState();
    const actions: Record<string, PlayerAction | null> = {
      p1: { type: 'drop', playerId: 'p1', pieceType: PieceType.Knight, to: { x: 4, y: 4 } },
      p2: null,
      p3: null,
      p4: null,
    };

    const next = applyActions(state, actions as any);
    const dropped = next.pieces.find(
      (piece) => piece.owner === 'p1' && piece.type === PieceType.Knight && piece.position.x === 4 && piece.position.y === 4,
    );
    expect(dropped).toBeDefined();
    expect(next.players.p1.dropReserve).toHaveLength(0);
  });

  it('is deterministic for same state and actions regardless of system time', () => {
    vi.useFakeTimers();
    try {
      const state = makeDropState();
      const actions: Record<string, PlayerAction | null> = {
        p1: { type: 'drop', playerId: 'p1', pieceType: PieceType.Knight, to: { x: 4, y: 4 } },
        p2: null,
        p3: null,
        p4: null,
      };

      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const first = applyActions(state, actions as any);

      vi.setSystemTime(new Date('2026-01-01T00:00:01.000Z'));
      const second = applyActions(state, actions as any);

      expect(second).toStrictEqual(first);
    } finally {
      vi.useRealTimers();
    }
  });
});
