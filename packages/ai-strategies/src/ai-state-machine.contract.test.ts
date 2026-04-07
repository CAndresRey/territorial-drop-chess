import { describe, expect, it } from 'vitest';
import { GameState, PieceType, PlayerAction } from '../../engine/src/types';
import {
  HeuristicBot,
  HeuristicPhase,
  inferHeuristicPhase,
  isImmediateCaptureAction,
} from './index';

const makeState = (
  overrides?: Partial<GameState>,
  activePlayers: string[] = ['p1', 'p2', 'p3', 'p4'],
): GameState => {
  const players: Record<string, GameState['players'][string]> = {};
  for (const id of ['p1', 'p2', 'p3', 'p4']) {
    players[id] = {
      id,
      score: 0,
      isEliminated: !activePlayers.includes(id),
      dropReserve: [],
      color: '#fff',
    };
  }

  return {
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
    players: players as any,
    pieces: [
      { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 6, y: 6 } },
      { id: 'r1', owner: 'p1', type: PieceType.Rook, position: { x: 6, y: 5 } },
      { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 1, y: 1 } },
      { id: 'p2a', owner: 'p2', type: PieceType.Pawn, position: { x: 6, y: 4 } },
    ],
    ...overrides,
  };
};

describe('Heuristic AI state machine contract', () => {
  it('infers opening and endgame phases from board context', () => {
    const opening = inferHeuristicPhase(makeState({ round: 1 }), 'p1');
    const endgame = inferHeuristicPhase(makeState({ round: 36 }, ['p1', 'p2']), 'p1');

    expect(opening).toBe('opening');
    expect(endgame).toBe('endgame');
  });

  it('updates bot phase as game context evolves', () => {
    const bot = new HeuristicBot('p1', {
      aggression: 0.4,
      greed: 0.4,
      riskTolerance: 0.4,
      focusBias: 0.4,
      randomness: 0,
    });
    const legalActions: PlayerAction[] = [
      { type: 'move', pieceId: 'r1', from: { x: 6, y: 5 }, to: { x: 6, y: 4 } },
      { type: 'move', pieceId: 'r1', from: { x: 6, y: 5 }, to: { x: 6, y: 6 } },
    ];

    bot.decide({
      state: makeState({ round: 2 }),
      playerId: 'p1',
      legalActions,
      seed: 'phase-1',
    });
    expect(bot.getCurrentPhase()).toBe('opening');

    bot.decide({
      state: makeState({ round: 37 }, ['p1', 'p2']),
      playerId: 'p1',
      legalActions,
      seed: 'phase-2',
    });
    expect(bot.getCurrentPhase()).toBe('endgame');
  });

  it('prioritizes immediate captures in combat/endgame phases', () => {
    const bot = new HeuristicBot('p1', {
      aggression: 0.7,
      greed: 0.6,
      riskTolerance: 0.5,
      focusBias: 0.6,
      randomness: 0,
    });
    const captureAction: PlayerAction = {
      type: 'move',
      pieceId: 'r1',
      from: { x: 6, y: 5 },
      to: { x: 6, y: 4 },
    };
    const quietAction: PlayerAction = {
      type: 'move',
      pieceId: 'r1',
      from: { x: 6, y: 5 },
      to: { x: 6, y: 6 },
    };
    const state = makeState({ round: 20 }, ['p1', 'p2', 'p3']);
    expect(isImmediateCaptureAction(captureAction, state, 'p1')).toBe(true);

    const selected = bot.decide({
      state,
      playerId: 'p1',
      legalActions: [quietAction, captureAction],
      seed: 'combat-capture',
    });

    expect(selected).toStrictEqual(captureAction);
    expect(['combat', 'endgame'] as HeuristicPhase[]).toContain(bot.getCurrentPhase());
  });
});
