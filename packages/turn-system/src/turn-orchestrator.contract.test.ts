import { describe, expect, it } from 'vitest';
import { TurnOrchestrator } from './index';
import { GameState, PieceType } from '../../engine/src/types';

const makeState = (type: 'simultaneous' | 'sequential'): GameState =>
  ({
    config: {
      playerCount: 2,
      boardSize: 11,
      enabledRules: [],
      scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
      turnSystem: { type, maxRounds: 40, timerSeconds: 30 },
    },
    round: 1,
    status: 'playing',
    history: [],
    players: {
      p1: { id: 'p1', score: 0, isEliminated: false, dropReserve: [], color: '#f00' },
      p2: { id: 'p2', score: 0, isEliminated: false, dropReserve: [], color: '#00f' },
    },
    pieces: [],
  }) as any;

describe('TurnOrchestrator contract', () => {
  it('returns active players in deterministic priority order', () => {
    const state = makeState('simultaneous');
    state.players.p1.score = 5;
    state.players.p2.score = 1;

    expect(TurnOrchestrator.getActivePlayers(state)).toStrictEqual(['p2', 'p1']);
  });

  it('returns the first active player when no current player is provided', () => {
    const state = makeState('sequential');
    state.players.p1.score = 3;
    state.players.p2.score = 1;

    expect(TurnOrchestrator.getNextPlayer(state)).toBe('p2');
  });

  it('advances to the next non-eliminated player in sequential order', () => {
    const state = makeState('sequential');
    state.players.p1.score = 0;
    state.players.p2.score = 1;

    expect(TurnOrchestrator.getNextPlayer(state, 'p1')).toBe('p2');
    expect(TurnOrchestrator.getNextPlayer(state, 'p2')).toBe('p1');
  });

  it('skips eliminated players when selecting the next player', () => {
    const state = makeState('sequential');
    state.players.p2.isEliminated = true;

    expect(TurnOrchestrator.getNextPlayer(state, 'p1')).toBe('p1');
  });

  it('marks a player as skippable when they have no legal actions', () => {
    const state = makeState('sequential');

    expect(TurnOrchestrator.shouldSkipTurn(state, 'p1')).toBe(true);
  });

  it('returns a round result for simultaneous turns', () => {
    const result = TurnOrchestrator.resolve(makeState('simultaneous'), { p1: null, p2: null } as any);
    expect(result.state.round).toBe(2);
  });

  it('computes deterministic priority ordering from state', () => {
    const state = makeState('simultaneous');
    state.players.p1.score = 2;
    state.players.p2.score = 1;
    expect(TurnOrchestrator.getPriority(state)).toStrictEqual(['p2', 'p1']);
  });

  it('treats missing actions as timeout passes in simultaneous mode', () => {
    const state = makeState('simultaneous');
    const result = TurnOrchestrator.resolve(
      state,
      {
        p1: null,
      } as any,
      { reason: 'timeout' },
    );

    expect(result.state.players.p2.score).toBe(-0.5);
    expect(result.events.some((event) => event.type === 'skip_penalty' && event.playerId === 'p2')).toBe(true);
  });

  it('does not assign timeout penalties to already eliminated players', () => {
    const state = makeState('simultaneous');
    state.players.p2.isEliminated = true;

    const result = TurnOrchestrator.resolve(
      state,
      {
        p1: null,
      } as any,
      { reason: 'timeout' },
    );

    expect(result.state.players.p2.score).toBe(0);
    expect(result.events.some((event) => event.type === 'skip_penalty' && event.playerId === 'p2')).toBe(false);
  });

  it('uses stable lexicographic tie-breakers when priority scores are equal', () => {
    const state = makeState('simultaneous');
    state.players = {
      p2: state.players.p2,
      p1: state.players.p1,
    } as any;
    state.players.p1.score = 1;
    state.players.p2.score = 1;

    expect(TurnOrchestrator.getPriority(state)).toStrictEqual(['p1', 'p2']);
  });

  it('resolves dependent moves deterministically regardless action object insertion order', () => {
    const state = makeState('simultaneous');
    state.players.p1.score = 2;
    state.players.p2.score = 1; // p2 priority should resolve first
    state.pieces = [
      { id: 'r1', owner: 'p1', type: PieceType.Rook, position: { x: 0, y: 0 } },
      { id: 'r2', owner: 'p2', type: PieceType.Rook, position: { x: 0, y: 1 } },
    ];

    const p1Action = {
      type: 'move' as const,
      pieceId: 'r1',
      from: { x: 0, y: 0 },
      to: { x: 0, y: 1 },
    };
    const p2Action = {
      type: 'move' as const,
      pieceId: 'r2',
      from: { x: 0, y: 1 },
      to: { x: 0, y: 2 },
    };

    const first = TurnOrchestrator.resolve(
      state,
      {
        p1: p1Action,
        p2: p2Action,
      },
      { reason: 'timeout' },
    );
    const second = TurnOrchestrator.resolve(
      state,
      {
        p2: p2Action,
        p1: p1Action,
      },
      { reason: 'timeout' },
    );

    expect(second.state).toStrictEqual(first.state);
    expect(first.state.pieces.find((piece) => piece.id === 'r1')?.position).toStrictEqual({ x: 0, y: 1 });
    expect(first.state.pieces.find((piece) => piece.id === 'r2')?.position).toStrictEqual({ x: 0, y: 2 });
  });
});
