import { describe, expect, it, vi } from 'vitest';
import { BaseBot, createBotForDifficulty, LookaheadBot, RandomBot } from './index';
import { GameState, PieceType, PlayerAction } from '../../engine/src/types';
import { getDifficultyProfile } from '../../difficulty/src/index';

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
  } as any,
  pieces: [
    { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 6, y: 6 } },
    { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 1, y: 1 } },
  ],
});

describe('BaseBot contract', () => {
  it('chooses one action from provided legal actions', () => {
    const bot = new BaseBot('p1', {
      aggression: 0,
      greed: 0,
      riskTolerance: 0,
      focusBias: 0,
      randomness: 0,
    });
    const legalActions: PlayerAction[] = [
      { type: 'move', pieceId: 'k1', from: { x: 6, y: 6 }, to: { x: 6, y: 7 } },
      { type: 'move', pieceId: 'k1', from: { x: 6, y: 6 }, to: { x: 7, y: 7 } },
    ];

    const action = bot.decide({
      state: makeState(),
      playerId: 'p1',
      legalActions,
    });

    expect(legalActions).toContainEqual(action);
  });

  it('creates bots from difficulty presets with matching personality profile', () => {
    const easyBot = createBotForDifficulty('p1', 'easy');
    const hardBot = createBotForDifficulty('p2', 'hard');

    expect(easyBot.personality).toStrictEqual(getDifficultyProfile('easy'));
    expect(hardBot.personality).toStrictEqual(getDifficultyProfile('hard'));
    expect(hardBot.personality.randomness).toBeLessThan(
      easyBot.personality.randomness,
    );
  });

  it('returns null when no legal actions are provided', () => {
    const bot = new BaseBot('p1', {
      aggression: 0,
      greed: 0,
      riskTolerance: 0,
      focusBias: 0,
      randomness: 0,
    });

    const action = bot.decide({
      state: makeState(),
      playerId: 'p1',
      legalActions: [],
    });

    expect(action).toBeNull();
  });

  it('RandomBot uses seeded deterministic selection when context seed is provided', () => {
    const bot = new RandomBot('p1', {
      aggression: 0,
      greed: 0,
      riskTolerance: 0,
      focusBias: 0,
      randomness: 0,
    });
    const legalActions: PlayerAction[] = [
      { type: 'move', pieceId: 'k1', from: { x: 6, y: 6 }, to: { x: 6, y: 7 } },
      { type: 'move', pieceId: 'k1', from: { x: 6, y: 6 }, to: { x: 7, y: 7 } },
      { type: 'move', pieceId: 'k1', from: { x: 6, y: 6 }, to: { x: 5, y: 7 } },
    ];

    const first = bot.decide({
      state: makeState(),
      playerId: 'p1',
      legalActions,
      seed: 'same-seed',
    });
    const second = bot.decide({
      state: makeState(),
      playerId: 'p1',
      legalActions,
      seed: 'same-seed',
    });

    expect(second).toStrictEqual(first);
    expect(legalActions).toContainEqual(first);
  });

  it('RandomBot uses Math.random branch when no seed is provided', () => {
    const bot = new RandomBot('p1', {
      aggression: 0,
      greed: 0,
      riskTolerance: 0,
      focusBias: 0,
      randomness: 0,
    });
    const legalActions: PlayerAction[] = [
      { type: 'move', pieceId: 'k1', from: { x: 6, y: 6 }, to: { x: 6, y: 7 } },
      { type: 'move', pieceId: 'k1', from: { x: 6, y: 6 }, to: { x: 7, y: 7 } },
    ];

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    try {
      const action = bot.decide({
        state: makeState(),
        playerId: 'p1',
        legalActions,
      });
      expect(action).toStrictEqual(legalActions[1]);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('LookaheadBot currently matches BaseBot one-step behavior', () => {
    const personality = {
      aggression: 0,
      greed: 0.2,
      riskTolerance: 0,
      focusBias: 0,
      randomness: 0,
    };
    const base = new BaseBot('p1', personality);
    const lookahead = new LookaheadBot('p1', personality);
    const legalActions: PlayerAction[] = [
      { type: 'move', pieceId: 'k1', from: { x: 6, y: 6 }, to: { x: 6, y: 7 } },
      { type: 'move', pieceId: 'k1', from: { x: 6, y: 6 }, to: { x: 7, y: 7 } },
    ];
    const context = {
      state: makeState(),
      playerId: 'p1',
      legalActions,
      seed: 'lookahead',
    };

    expect(lookahead.decide(context)).toStrictEqual(base.decide(context));
  });
});
