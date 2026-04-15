import { describe, expect, it } from 'vitest';
import { GameState, PieceType } from '@tdc/engine';
import {
  buildFinalRanking,
  canSubmitInteraction,
  deriveViewState,
  deriveTurnBanner,
  getWinnerLabel,
} from './ui-state';

const makeState = (status: GameState['status'], winner?: GameState['winner']): GameState =>
  ({
    config: {
      playerCount: 2,
      boardSize: 11,
      enabledRules: [],
      scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
      turnSystem: { type: 'simultaneous', maxRounds: 10, timerSeconds: 30 },
    },
    round: 1,
    status,
    winner,
    history: [],
    players: {
      human: { id: 'human', score: 0, isEliminated: false, dropReserve: [], color: '#f00' },
      bot_1: { id: 'bot_1', score: 0, isEliminated: false, dropReserve: [], color: '#00f' },
    },
    pieces: [
      { id: 'k1', owner: 'human', type: PieceType.King, position: { x: 5, y: 0 } },
      { id: 'k2', owner: 'bot_1', type: PieceType.King, position: { x: 5, y: 10 } },
    ],
  }) as GameState;

describe('ui state contract', () => {
  it('derives finished view from game state status', () => {
    expect(deriveViewState(makeState('playing'))).toBe('playing');
    expect(deriveViewState(makeState('finished', 'human'))).toBe('finished');
  });

  it('builds coherent winner label for single or tie winner', () => {
    expect(getWinnerLabel(makeState('finished', 'human'))).toMatch(/human/i);
    expect(getWinnerLabel(makeState('finished', ['human', 'bot_1']))).toMatch(/tie/i);
  });

  it('blocks interactions when game is finished or action already submitted', () => {
    const playing = makeState('playing');
    const finished = makeState('finished', 'human');

    expect(canSubmitInteraction({ gameState: playing, actionSubmitted: false })).toBe(true);
    expect(canSubmitInteraction({ gameState: playing, actionSubmitted: true })).toBe(false);
    expect(canSubmitInteraction({ gameState: finished, actionSubmitted: false })).toBe(false);
  });

  it('builds final ranking sorted by score descending', () => {
    const state = makeState('finished', 'human');
    state.players.human.score = 7;
    state.players.bot_1.score = 3;

    const ranking = buildFinalRanking(state);
    expect(ranking).toStrictEqual([
      { playerId: 'human', score: 7, isEliminated: false },
      { playerId: 'bot_1', score: 3, isEliminated: false },
    ]);
  });

  it('derives turn banner for active, waiting and eliminated user states', () => {
    const playing = makeState('playing');
    expect(deriveTurnBanner(playing, 'human', false)).toStrictEqual({
      tone: 'info',
      message: 'Your turn: choose a move, drop, or pass.',
    });
    expect(deriveTurnBanner(playing, 'human', true)).toStrictEqual({
      tone: 'muted',
      message: 'Action submitted. Waiting for other players...',
    });

    playing.players.human.isEliminated = true;
    expect(deriveTurnBanner(playing, 'human', false)).toStrictEqual({
      tone: 'warning',
      message: 'You are eliminated. Observing the match.',
    });
  });
});
