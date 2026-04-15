import { describe, expect, it } from 'vitest';
import {
  MultiThreatRule,
  RuleManager,
} from './index';
import { GameConfig, PieceType, RuleModule } from '../../engine/src/types';

const mockConfig: GameConfig = {
  playerCount: 3,
  boardSize: 15,
  enabledRules: ['multi-threat'],
  scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
  turnSystem: { type: 'simultaneous', maxRounds: 40, timerSeconds: 30 },
};

const makeState = (pieces: any[] = []) => ({
  config: mockConfig,
  round: 1,
  players: {
    p1: { id: 'p1', score: 0, isEliminated: false, dropReserve: [], color: '#f00' },
    p2: { id: 'p2', score: 0, isEliminated: false, dropReserve: [], color: '#00f' },
    p3: { id: 'p3', score: 0, isEliminated: false, dropReserve: [], color: '#0f0' },
  },
  pieces,
  status: 'playing' as const,
  history: [],
});

const makePiece = (
  type: PieceType,
  x: number,
  y: number,
  owner: string,
  id = `${type}_${x}_${y}_${owner}`,
) => ({
  id,
  owner,
  type,
  position: { x, y },
});

describe('RuleManager', () => {
  it('returns valid when no rule rejects the action', () => {
    const manager = new RuleManager([]);
    const state = makeState([makePiece(PieceType.Rook, 0, 0, 'p1', 'rook1')]);
    const result = manager.validateMove(state as any, {
      type: 'move',
      pieceId: 'rook1',
      from: { x: 0, y: 0 },
      to: { x: 0, y: 2 },
    });

    expect(result).toStrictEqual({ isValid: true });
  });

  it('stops at the first failing rule', () => {
    const calls: string[] = [];
    const firstRule: RuleModule = {
      name: 'first',
      onValidateMove() {
        calls.push('first');
        return { isValid: false, error: 'blocked' };
      },
    };
    const secondRule: RuleModule = {
      name: 'second',
      onValidateMove() {
        calls.push('second');
        return { isValid: true };
      },
    };

    const manager = new RuleManager([firstRule, secondRule]);
    const result = manager.validateMove(makeState() as any, {
      type: 'move',
      pieceId: 'rook1',
      from: { x: 0, y: 0 },
      to: { x: 0, y: 1 },
    });

    expect(result).toStrictEqual({ isValid: false, error: 'blocked' });
    expect(calls).toStrictEqual(['first']);
  });
});

describe('MultiThreatRule', () => {
  it('rejects a move exposed to two opponents', () => {
    const state = makeState([
      makePiece(PieceType.Rook, 0, 0, 'p1', 'r1'),
      makePiece(PieceType.Rook, 5, 2, 'p2', 'e1'),
      makePiece(PieceType.Rook, 0, 5, 'p3', 'e2'),
    ]);
    const action = {
      type: 'move' as const,
      pieceId: 'r1',
      from: { x: 0, y: 0 },
      to: { x: 0, y: 2 },
    };

    const result = MultiThreatRule.onValidateMove!({ state: state as any, action });

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Multi-threat');
  });

  it('allows the move when only one opponent can attack the target', () => {
    const state = makeState([
      makePiece(PieceType.Rook, 0, 0, 'p1', 'r1'),
      makePiece(PieceType.Rook, 5, 2, 'p2', 'e1'),
      makePiece(PieceType.Rook, 4, 5, 'p3', 'e2'),
    ]);
    const action = {
      type: 'move' as const,
      pieceId: 'r1',
      from: { x: 0, y: 0 },
      to: { x: 0, y: 2 },
    };

    const result = MultiThreatRule.onValidateMove!({ state: state as any, action });

    expect(result).toStrictEqual({ isValid: true });
  });
});
