import { describe, expect, it } from 'vitest';
import { CenterBonusRule, MultiThreatRule, RuleManager, TerritoryControlRule } from './index';
import { GameState, PieceType, PlayerAction, RuleModule } from '../../engine/src/types';

const makeState = (): GameState => ({
  config: {
    playerCount: 4,
    boardSize: 15,
    enabledRules: ['center-bonus', 'territory-control', 'multi-threat'],
    scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
    turnSystem: { type: 'simultaneous', maxRounds: 40, timerSeconds: 30 },
  },
  round: 1,
  status: 'playing',
  history: [],
  players: {
    p1: { id: 'p1', score: 0, isEliminated: false, dropReserve: [], color: '#f00' },
    p2: { id: 'p2', score: 0, isEliminated: false, dropReserve: [], color: '#00f' },
  } as any,
  pieces: [
    { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 6, y: 6 } },
    { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 1, y: 1 } },
  ],
});

describe('RuleManager contract', () => {
  it('short-circuits on first invalid rule validation', () => {
    const denyRule: RuleModule = {
      name: 'deny',
      onValidateMove: () => ({ isValid: false, error: 'blocked' }),
    };
    const manager = new RuleManager([denyRule]);
    const state = makeState();
    const action: PlayerAction = {
      type: 'move',
      pieceId: 'k1',
      from: { x: 6, y: 6 },
      to: { x: 6, y: 7 },
    };

    expect(manager.validateMove(state, action)).toStrictEqual({
      isValid: false,
      error: 'blocked',
    });
  });

  it('aggregates scoring deltas from all scoring rules', () => {
    const manager = new RuleManager([CenterBonusRule, TerritoryControlRule, MultiThreatRule]);
    const deltas = manager.calculateScores(makeState());
    expect(Array.isArray(deltas)).toBe(true);
  });

  it('MultiThreatRule rejects non-king move that becomes targetable by two opponents', () => {
    const state = makeState();
    state.config.playerCount = 3;
    (state.players as any).p3 = {
      id: 'p3',
      score: 0,
      isEliminated: false,
      dropReserve: [],
      color: '#0f0',
    };
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
    const manager = new RuleManager([MultiThreatRule]);

    expect(manager.validateMove(state, action)).toStrictEqual({
      isValid: false,
      error: 'Multi-threat: move exposes piece to >=2 opponents',
    });
  });
});
