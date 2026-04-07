import { describe, expect, it } from 'vitest';
import { RuleManager } from './index';
import { GameState, PieceType, PlayerAction, RuleModule } from '../../engine/src/types';

const makeState = (): GameState => ({
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
    p1: { id: 'p1', score: 0, isEliminated: false, dropReserve: [], color: '#f00' },
    p2: { id: 'p2', score: 0, isEliminated: false, dropReserve: [], color: '#00f' },
  },
  pieces: [
    { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 6, y: 6 } },
    { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 1, y: 1 } },
  ],
});

describe('RuleManager', () => {
  it('stops validation at first failing rule', () => {
    const first: RuleModule = {
      name: 'first',
      onValidateMove: () => ({ isValid: false, error: 'blocked' }),
    };
    const second: RuleModule = {
      name: 'second',
      onValidateMove: () => ({ isValid: true }),
    };
    const manager = new RuleManager([first, second]);
    const action: PlayerAction = {
      type: 'move',
      pieceId: 'k1',
      from: { x: 6, y: 6 },
      to: { x: 6, y: 7 },
    };

    expect(manager.validateMove(makeState(), action)).toStrictEqual({
      isValid: false,
      error: 'blocked',
    });
  });

  it('calls resolve turn hooks in declaration order', () => {
    const called: string[] = [];
    const first: RuleModule = {
      name: 'first',
      onResolveTurn: () => {
        called.push('first');
      },
    };
    const second: RuleModule = {
      name: 'second',
      onResolveTurn: () => {
        called.push('second');
      },
    };

    const manager = new RuleManager([first, second]);
    manager.resolveTurn(makeState(), []);

    expect(called).toStrictEqual(['first', 'second']);
  });

  it('flattens score deltas from all scoring hooks', () => {
    const first: RuleModule = {
      name: 'first',
      onScore: () => [{ playerId: 'p1', delta: 1, reason: 'first' }],
    };
    const second: RuleModule = {
      name: 'second',
      onScore: () => [{ playerId: 'p2', delta: 2, reason: 'second' }],
    };

    const manager = new RuleManager([first, second]);
    const deltas = manager.calculateScores(makeState());

    expect(deltas).toStrictEqual([
      { playerId: 'p1', delta: 1, reason: 'first' },
      { playerId: 'p2', delta: 2, reason: 'second' },
    ]);
  });
});

