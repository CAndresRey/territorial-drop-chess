import { describe, expect, it } from 'vitest';
import { checkGameOver, resolveRound } from './resolver';
import { GameConfig, PieceType } from './types';

const mockConfig: GameConfig = {
  playerCount: 4,
  boardSize: 15,
  enabledRules: [],
  scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
  turnSystem: { type: 'simultaneous', maxRounds: 40, timerSeconds: 30 },
};

const makeState = (overrides = {}) => ({
  config: mockConfig,
  round: 1,
  status: 'playing' as const,
  pieces: [],
  players: {
    p1: {
      id: 'p1',
      score: 0,
      isEliminated: false,
      dropReserve: [],
      color: '#FF0000',
    },
    p2: {
      id: 'p2',
      score: 0,
      isEliminated: false,
      dropReserve: [],
      color: '#0000FF',
    },
  },
  history: [],
  ...overrides,
});

const makePiece = (
  type: PieceType,
  x: number,
  y: number,
  owner: string,
  id?: string,
) => ({
  id: id ?? `${type}_${x}_${y}_${owner}`,
  owner,
  type,
  position: { x, y },
});

describe('checkGameOver', () => {
  it('ends game at round > 40', () => {
    const state = makeState({ round: 41 });
    const result = checkGameOver(state as any);
    expect(result.isOver).toBe(true);
    expect(result.reason).toBe('max_rounds');
  });
});

describe('resolveRound', () => {
  it('advances round number', () => {
    const state = makeState();
    const { state: next } = resolveRound(state as any, { p1: null, p2: null });
    expect(next.round).toBe(2);
  });

  it('resolves conflict: higher value piece wins destination', () => {
    const rook = makePiece(PieceType.Rook, 7, 6, 'p1', 'rook1');
    const pawn = makePiece(PieceType.Pawn, 7, 8, 'p2', 'pawn2');
    const state = makeState({
      pieces: [rook, pawn],
    });
    const { state: next } = resolveRound(state as any, {
      p1: {
        type: 'move',
        pieceId: 'rook1',
        from: { x: 7, y: 6 },
        to: { x: 7, y: 7 },
      },
      p2: {
        type: 'move',
        pieceId: 'pawn2',
        from: { x: 7, y: 8 },
        to: { x: 7, y: 7 },
      },
    });
    const rookFinal = next.pieces.find((p) => p.id === 'rook1');
    expect(rookFinal?.position).toStrictEqual({ x: 7, y: 7 });
  });

  it('keeps the original state immutable while resolving a legal move', () => {
    const rook = makePiece(PieceType.Rook, 7, 6, 'p1', 'rook1');
    const state = makeState({
      pieces: [rook],
    });
    const snapshot = JSON.parse(JSON.stringify(state));

    const { state: next } = resolveRound(state as any, {
      p1: {
        type: 'move',
        pieceId: 'rook1',
        from: { x: 7, y: 6 },
        to: { x: 7, y: 7 },
      },
      p2: null,
    });

    expect(next.pieces.find((p) => p.id === 'rook1')?.position).toStrictEqual({
      x: 7,
      y: 7,
    });
    expect(state).toStrictEqual(snapshot);
  });

  it('bounces all contenders when equally valued pieces target the same square', () => {
    const rook1 = makePiece(PieceType.Rook, 7, 6, 'p1', 'rook1');
    const rook2 = makePiece(PieceType.Rook, 7, 8, 'p2', 'rook2');
    const state = makeState({
      pieces: [rook1, rook2],
    });

    const result = resolveRound(state as any, {
      p1: {
        type: 'move',
        pieceId: 'rook1',
        from: { x: 7, y: 6 },
        to: { x: 7, y: 7 },
      },
      p2: {
        type: 'move',
        pieceId: 'rook2',
        from: { x: 7, y: 8 },
        to: { x: 7, y: 7 },
      },
    });

    expect(
      result.state.pieces.find((p) => p.id === 'rook1')?.position,
    ).toStrictEqual({ x: 7, y: 6 });
    expect(
      result.state.pieces.find((p) => p.id === 'rook2')?.position,
    ).toStrictEqual({ x: 7, y: 8 });
    expect(
      result.events.filter((event) => event.type === 'bounce'),
    ).toHaveLength(2);
  });

  it('applies valid actions while ignoring invalid ones', () => {
    const rook = makePiece(PieceType.Rook, 7, 6, 'p1', 'rook1');
    const pawn = makePiece(PieceType.Pawn, 7, 8, 'p2', 'pawn2');
    const state = makeState({
      pieces: [rook, pawn],
    });

    const result = resolveRound(state as any, {
      p1: {
        type: 'move',
        pieceId: 'rook1',
        from: { x: 0, y: 0 },
        to: { x: 7, y: 7 },
      },
      p2: {
        type: 'move',
        pieceId: 'pawn2',
        from: { x: 7, y: 8 },
        to: { x: 7, y: 7 },
      },
    });

    expect(
      result.state.pieces.find((p) => p.id === 'rook1')?.position,
    ).toStrictEqual({ x: 7, y: 6 });
    expect(
      result.state.pieces.find((p) => p.id === 'pawn2')?.position,
    ).toStrictEqual({ x: 7, y: 7 });
    expect(
      result.state.history[result.state.history.length - 1]?.actions,
    ).toHaveLength(1);
  });
});
