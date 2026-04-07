import { describe, expect, it } from 'vitest';
import { getMovesForPiece } from './movement';
import { applyAction, validateAction } from './moves';
import { GameConfig, Piece, PieceType, PlayerAction } from './types';

const mockConfig: GameConfig = {
  playerCount: 4,
  boardSize: 15,
  enabledRules: ['center-bonus'],
  scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 5 },
  turnSystem: { type: 'simultaneous', maxRounds: 40, timerSeconds: 30 },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const emptyState = (pieces: Piece[] = []) => ({
  config: mockConfig,
  round: 1,
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
  pieces,
  status: 'playing' as const,
  history: [],
});

const makePiece = (
  type: PieceType,
  x: number,
  y: number,
  owner = 'p1',
  id = `${type}_${x}_${y}`,
) => ({
  id,
  owner,
  type,
  position: { x, y },
});

// ── King ──────────────────────────────────────────────────────────────────────
describe('King movement', () => {
  it('moves to all 8 squares from the center of an empty board', () => {
    const king = makePiece(PieceType.King, 7, 7);
    const state = emptyState([king]);
    const moves = getMovesForPiece(king, state as any);
    expect(moves.length).toBe(8);
  });
});

describe('Action validation', () => {
  it('rejects moves that go out of bounds', () => {
    const king = makePiece(PieceType.King, 0, 0, 'p1', 'king1');
    const state = emptyState([king]);
    const action: PlayerAction = {
      type: 'move',
      pieceId: 'king1',
      from: { x: 0, y: 0 },
      to: { x: -1, y: 0 },
    };

    expect(validateAction(action, state as any)).toStrictEqual({
      isValid: false,
      error: 'Out of bounds',
    });
  });

  it('rejects moves into a square occupied by an allied piece', () => {
    const king = makePiece(PieceType.King, 7, 7, 'p1', 'king1');
    const ally = makePiece(PieceType.Pawn, 8, 7, 'p1', 'ally1');
    const state = emptyState([king, ally]);
    const action: PlayerAction = {
      type: 'move',
      pieceId: 'king1',
      from: { x: 7, y: 7 },
      to: { x: 8, y: 7 },
    };

    expect(validateAction(action, state as any)).toStrictEqual({
      isValid: false,
      error: 'Illegal move for piece type',
    });
  });

  it('rejects moves whose origin does not match the current piece position', () => {
    const rook = makePiece(PieceType.Rook, 3, 3, 'p1', 'rook1');
    const state = emptyState([rook]);
    const action: PlayerAction = {
      type: 'move',
      pieceId: 'rook1',
      from: { x: 2, y: 3 },
      to: { x: 3, y: 6 },
    };

    expect(validateAction(action, state as any)).toStrictEqual({
      isValid: false,
      error: 'Origin does not match piece position',
    });
  });

  it('does not mutate the state while validating a legal move', () => {
    const rook = makePiece(PieceType.Rook, 3, 3, 'p1', 'rook1');
    const state = emptyState([rook]);
    const snapshot = JSON.parse(JSON.stringify(state));
    const action: PlayerAction = {
      type: 'move',
      pieceId: 'rook1',
      from: { x: 3, y: 3 },
      to: { x: 3, y: 6 },
    };

    const validation = validateAction(action, state as any);

    expect(validation.isValid).toBe(true);
    expect(state).toStrictEqual(snapshot);
  });
});

// ── Guard ─────────────────────────────────────────────────────────────────────
describe('Guard movement', () => {
  it('moves 1 or 2 squares orthogonally/diagonally but cannot jump', () => {
    const guard = makePiece(PieceType.Guard, 7, 7);
    const blocker = makePiece(PieceType.Pawn, 8, 7, 'p1', 'blocker');
    const state = emptyState([guard, blocker]);
    const moves = getMovesForPiece(guard, state as any);

    // Orthogonal right is blocked at 1 step, so 2 steps also blocked
    expect(moves.some((c) => c.x === 8 && c.y === 7)).toBe(false); // Friendly blocker
    expect(moves.some((c) => c.x === 9 && c.y === 7)).toBe(false); // Blocked

    // Orthogonal left is free
    expect(moves.some((c) => c.x === 6 && c.y === 7)).toBe(true);
    expect(moves.some((c) => c.x === 5 && c.y === 7)).toBe(true);
  });
});

// ── Pawn Radial Movement and Capture ──────────────────────────────────────────
describe('Pawn logic', () => {
  it('moves toward center and captures diagonally relative to movement', () => {
    // NW corner: moves SE (dx=1, dy=-1)
    const pawn = makePiece(PieceType.Pawn, 0, 14, 'p1', 'p1');
    const enemy1 = makePiece(PieceType.Pawn, 1, 14, 'p2', 'e1'); // Capture target 1
    const enemy2 = makePiece(PieceType.Pawn, 0, 13, 'p2', 'e2'); // Capture target 2
    const blocker = makePiece(PieceType.Pawn, 1, 13, 'p2', 'b1'); // Forward blocker

    const state = emptyState([pawn, enemy1, enemy2, blocker]);
    const moves = getMovesForPiece(pawn, state as any);

    expect(moves.some((c) => c.x === 1 && c.y === 14)).toBe(true); // Capture
    expect(moves.some((c) => c.x === 0 && c.y === 13)).toBe(true); // Capture
    expect(moves.some((c) => c.x === 1 && c.y === 13)).toBe(false); // Forward blocked
  });

  it('promotes to Veteran when entering the center', () => {
    const pawn = makePiece(PieceType.Pawn, 4, 7, 'p1', 'pawn1');
    const state = emptyState([pawn]);
    const next = applyAction(
      {
        type: 'move',
        pieceId: 'pawn1',
        from: { x: 4, y: 7 },
        to: { x: 5, y: 7 },
      },
      state as any,
    );
    const movedPawn = next.pieces.find((p) => p.id === 'pawn1')!;
    expect(movedPawn.type).toBe(PieceType.Veteran);
  });
});

// ── Multi-Threat Rule ─────────────────────────────────────────────────────────
describe('Multi-threat (Anti-Focus-Fire)', () => {
  it('prevents a move if the piece becomes reachable by 2+ opponents', () => {
    const rook = makePiece(PieceType.Rook, 0, 0, 'p1', 'r1');
    const enemy1 = makePiece(PieceType.Rook, 5, 5, 'p2', 'e1');
    const enemy2 = makePiece(PieceType.Rook, 0, 5, 'p3', 'e2');

    const state = emptyState([rook, enemy1, enemy2]) as any;
    state.config.playerCount = 3;
    state.players.p3 = {
      id: 'p3',
      score: 0,
      isEliminated: false,
      dropReserve: [],
      color: '#00FF00',
    };

    // Rook is at (0,0). (0,5) is a legal move for Rook.
    // enemy1 is at (5,5), can reach (0,5) orthogonally.
    // enemy2 is at (0,5), is ALREADY at the destination (this is fine for the simulation)
    // Wait, let's make it cleaner:
    // Rook at (0,0). Moves to (0,2).
    // Enemy 1 at (5,2) (Rook) can hit (0,2).
    // Enemy 2 at (0,5) (Rook) can hit (0,2).

    const action: PlayerAction = {
      type: 'move',
      pieceId: 'r1',
      from: { x: 0, y: 0 },
      to: { x: 0, y: 2 },
    };

    // Update enemy positions
    state.pieces = [
      makePiece(PieceType.Rook, 0, 0, 'p1', 'r1'),
      makePiece(PieceType.Rook, 5, 2, 'p2', 'e1'),
      makePiece(PieceType.Rook, 0, 5, 'p3', 'e2'),
    ];

    const validation = validateAction(action, state as any);

    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain('Multi-threat');
  });
});
