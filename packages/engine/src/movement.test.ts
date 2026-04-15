import { describe, expect, it } from 'vitest';
import { getLegalActions } from './engine';
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

describe('Piece movement rules', () => {
  it('rook moves in straight lines', () => {
    const rook = makePiece(PieceType.Rook, 7, 7, 'p1', 'rook1');
    const state = emptyState([rook]);
    const moves = getMovesForPiece(rook, state as any);

    expect(moves).toContainEqual({ x: 7, y: 0 });
    expect(moves).toContainEqual({ x: 7, y: 14 });
    expect(moves).toContainEqual({ x: 0, y: 7 });
    expect(moves).toContainEqual({ x: 14, y: 7 });
    expect(moves).not.toContainEqual({ x: 8, y: 8 });
  });

  it('bishop moves diagonally', () => {
    const bishop = makePiece(PieceType.Bishop, 7, 7, 'p1', 'bishop1');
    const state = emptyState([bishop]);
    const moves = getMovesForPiece(bishop, state as any);

    expect(moves).toContainEqual({ x: 0, y: 0 });
    expect(moves).toContainEqual({ x: 14, y: 14 });
    expect(moves).toContainEqual({ x: 0, y: 14 });
    expect(moves).toContainEqual({ x: 14, y: 0 });
    expect(moves).not.toContainEqual({ x: 7, y: 8 });
  });

  it('knight jumps correctly', () => {
    const knight = makePiece(PieceType.Knight, 7, 7, 'p1', 'knight1');
    const blocker1 = makePiece(PieceType.Pawn, 7, 8, 'p1', 'block1');
    const blocker2 = makePiece(PieceType.Pawn, 8, 7, 'p1', 'block2');
    const state = emptyState([knight, blocker1, blocker2]);
    const moves = getMovesForPiece(knight, state as any);

    expect(moves).toContainEqual({ x: 9, y: 8 });
    expect(moves).toContainEqual({ x: 8, y: 9 });
    expect(moves).toContainEqual({ x: 5, y: 6 });
    expect(moves).toHaveLength(8);
  });

  it('should block movement when path is occupied', () => {
    const rook = makePiece(PieceType.Rook, 7, 7, 'p1', 'rook1');
    const blocker = makePiece(PieceType.Pawn, 7, 9, 'p1', 'block1');
    const state = emptyState([rook, blocker]);
    const moves = getMovesForPiece(rook, state as any);

    expect(moves).toContainEqual({ x: 7, y: 8 });
    expect(moves).not.toContainEqual({ x: 7, y: 9 });
    expect(moves).not.toContainEqual({ x: 7, y: 10 });
  });

  it('should capture enemy piece', () => {
    const rook = makePiece(PieceType.Rook, 7, 7, 'p1', 'rook1');
    const enemy = makePiece(PieceType.Pawn, 7, 10, 'p2', 'enemy1');
    const state = emptyState([rook, enemy]);
    const action: PlayerAction = {
      type: 'move',
      pieceId: 'rook1',
      from: { x: 7, y: 7 },
      to: { x: 7, y: 10 },
    };

    const next = applyAction(action, state as any);

    expect(next.pieces.find((piece) => piece.id === 'enemy1')).toBeUndefined();
    expect(
      next.pieces.find((piece) => piece.id === 'rook1')?.position,
    ).toStrictEqual({ x: 7, y: 10 });
  });

  it('should not capture friendly piece', () => {
    const rook = makePiece(PieceType.Rook, 7, 7, 'p1', 'rook1');
    const ally = makePiece(PieceType.Pawn, 7, 10, 'p1', 'ally1');
    const state = emptyState([rook, ally]);

    expect(getMovesForPiece(rook, state as any)).not.toContainEqual({
      x: 7,
      y: 10,
    });
    expect(
      validateAction(
        {
          type: 'move',
          pieceId: 'rook1',
          from: { x: 7, y: 7 },
          to: { x: 7, y: 10 },
        },
        state as any,
      ),
    ).toStrictEqual({
      isValid: false,
      error: 'Illegal move for piece type',
    });
  });

  it('should return all valid moves for a player pieces via getLegalActions', () => {
    const rook = makePiece(PieceType.Rook, 7, 7, 'p1', 'rook1');
    const bishop = makePiece(PieceType.Bishop, 1, 1, 'p1', 'bishop1');
    const ally = makePiece(PieceType.Pawn, 7, 9, 'p1', 'ally1');
    const enemy = makePiece(PieceType.Pawn, 4, 4, 'p2', 'enemy1');
    const state = emptyState([rook, bishop, ally, enemy]);

    const actions = getLegalActions(state as any, 'p1');

    expect(actions).toContainEqual({
      type: 'move',
      pieceId: 'rook1',
      from: { x: 7, y: 7 },
      to: { x: 7, y: 8 },
    });
    expect(actions).toContainEqual({
      type: 'move',
      pieceId: 'bishop1',
      from: { x: 1, y: 1 },
      to: { x: 4, y: 4 },
    });
    expect(actions).not.toContainEqual({
      type: 'move',
      pieceId: 'rook1',
      from: { x: 7, y: 7 },
      to: { x: 7, y: 9 },
    });
    expect(
      actions.every((action: PlayerAction) => action.type === 'move'),
    ).toBe(true);
  });

  it('should maintain consistent state after multiple moves', () => {
    const rook = makePiece(PieceType.Rook, 0, 0, 'p1', 'rook1');
    const bishop = makePiece(PieceType.Bishop, 4, 4, 'p2', 'bishop1');
    const initial = emptyState([rook, bishop]);

    const afterFirst = applyAction(
      {
        type: 'move',
        pieceId: 'rook1',
        from: { x: 0, y: 0 },
        to: { x: 0, y: 4 },
      },
      initial as any,
    );
    const afterSecond = applyAction(
      {
        type: 'move',
        pieceId: 'rook1',
        from: { x: 0, y: 4 },
        to: { x: 4, y: 4 },
      },
      afterFirst as any,
    );

    expect(afterSecond.pieces).toHaveLength(1);
    expect(afterSecond.pieces[0]).toMatchObject({
      id: 'rook1',
      owner: 'p1',
      position: { x: 4, y: 4 },
    });
    expect(afterSecond.players.p1.dropReserve).toContain(PieceType.Bishop);
    expect(initial.pieces).toHaveLength(2);
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
  it('keeps structural validation independent from multi-threat plugin rules', () => {
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

    expect(validation).toStrictEqual({ isValid: true });
  });
});
