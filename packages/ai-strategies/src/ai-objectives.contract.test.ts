import { describe, expect, it } from 'vitest';
import { GameState, PieceType, PlayerAction } from '../../engine/src/types';
import {
  HeuristicBot,
  scoreObjectiveAction,
  selectObjectiveAction,
} from './index';

const baseState = (overrides?: Partial<GameState>): GameState => ({
  config: {
    playerCount: 4,
    boardSize: 13,
    enabledRules: [],
    scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
    turnSystem: { type: 'simultaneous', maxRounds: 40, timerSeconds: 30 },
  },
  round: 2,
  status: 'playing',
  history: [],
  players: {
    p1: { id: 'p1', score: 0, isEliminated: false, dropReserve: [], color: '#f00' },
    p2: { id: 'p2', score: 0, isEliminated: false, dropReserve: [], color: '#00f' },
    p3: { id: 'p3', score: 0, isEliminated: false, dropReserve: [], color: '#0f0' },
    p4: { id: 'p4', score: 0, isEliminated: false, dropReserve: [], color: '#ff0' },
  },
  pieces: [
    { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 0, y: 0 } },
    { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 12, y: 12 } },
    { id: 'k3', owner: 'p3', type: PieceType.King, position: { x: 0, y: 12 } },
    { id: 'k4', owner: 'p4', type: PieceType.King, position: { x: 12, y: 0 } },
  ],
  ...overrides,
});

describe('Heuristic objectives contract', () => {
  it('exposes deterministic objective scores for candidate actions', () => {
    const state = baseState({
      round: 2,
      pieces: [
        ...baseState().pieces,
        { id: 'r1', owner: 'p1', type: PieceType.Rook, position: { x: 0, y: 6 } },
      ],
    });
    const toCenter: PlayerAction = {
      type: 'move',
      pieceId: 'r1',
      from: { x: 0, y: 6 },
      to: { x: 6, y: 6 },
    };
    const quiet: PlayerAction = {
      type: 'move',
      pieceId: 'r1',
      from: { x: 0, y: 6 },
      to: { x: 0, y: 5 },
    };

    const centerScore = scoreObjectiveAction(toCenter, state, 'p1', 'opening');
    const quietScore = scoreObjectiveAction(quiet, state, 'p1', 'opening');

    expect(centerScore).toBeGreaterThan(quietScore);
  });

  it('selects objective-best action even without evaluator fallback', () => {
    const state = baseState({
      round: 8,
      players: {
        ...baseState().players,
        p1: {
          ...baseState().players.p1,
          dropReserve: [PieceType.Rook],
        },
      },
      pieces: [
        ...baseState().pieces,
        { id: 'n1', owner: 'p1', type: PieceType.Knight, position: { x: 1, y: 1 } },
      ],
    });
    const dropCenter: PlayerAction = {
      type: 'drop',
      playerId: 'p1',
      pieceType: PieceType.Rook,
      to: { x: 6, y: 6 },
    };
    const quietMove: PlayerAction = {
      type: 'move',
      pieceId: 'n1',
      from: { x: 1, y: 1 },
      to: { x: 2, y: 3 },
    };

    const selected = selectObjectiveAction(
      [quietMove, dropCenter],
      state,
      'p1',
      'expansion',
    );

    expect(selected).toStrictEqual(dropCenter);
  });

  it('prefers center-control move in opening when options are otherwise neutral', () => {
    const state = baseState({
      round: 2,
      pieces: [
        ...baseState().pieces,
        { id: 'r1', owner: 'p1', type: PieceType.Rook, position: { x: 0, y: 6 } },
      ],
    });
    const toCenter: PlayerAction = {
      type: 'move',
      pieceId: 'r1',
      from: { x: 0, y: 6 },
      to: { x: 6, y: 6 },
    };
    const quiet: PlayerAction = {
      type: 'move',
      pieceId: 'r1',
      from: { x: 0, y: 6 },
      to: { x: 0, y: 5 },
    };
    const bot = new HeuristicBot('p1', {
      aggression: 0.3,
      greed: 0.2,
      riskTolerance: 0.3,
      focusBias: 0.3,
      randomness: 0,
    });

    const selected = bot.decide({
      state,
      playerId: 'p1',
      legalActions: [quiet, toCenter],
      seed: 'objective-center',
    });

    expect(selected).toStrictEqual(toCenter);
  });

  it('prioritizes king safety by avoiding actions that increase king threats', () => {
    const state = baseState({
      round: 18,
      pieces: [
        { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 6, y: 6 } },
        { id: 'g1', owner: 'p1', type: PieceType.Guard, position: { x: 6, y: 7 } },
        { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 12, y: 12 } },
        { id: 'r2', owner: 'p2', type: PieceType.Rook, position: { x: 6, y: 10 } },
        { id: 'k3', owner: 'p3', type: PieceType.King, position: { x: 0, y: 12 } },
        { id: 'k4', owner: 'p4', type: PieceType.King, position: { x: 12, y: 0 } },
      ],
    });
    const risky: PlayerAction = {
      type: 'move',
      pieceId: 'g1',
      from: { x: 6, y: 7 },
      to: { x: 5, y: 7 },
    };
    const safe: PlayerAction = {
      type: 'move',
      pieceId: 'g1',
      from: { x: 6, y: 7 },
      to: { x: 6, y: 8 },
    };
    const bot = new HeuristicBot('p1', {
      aggression: 0.4,
      greed: 0.4,
      riskTolerance: 0.2,
      focusBias: 0.5,
      randomness: 0,
    });

    const selected = bot.decide({
      state,
      playerId: 'p1',
      legalActions: [risky, safe],
      seed: 'objective-king-defense',
    });

    expect(selected).toStrictEqual(safe);
  });

  it('uses center drop timing in expansion phase when drop has high strategic value', () => {
    const state = baseState({
      round: 8,
      players: {
        ...baseState().players,
        p1: {
          ...baseState().players.p1,
          dropReserve: [PieceType.Rook],
        },
      },
      pieces: [
        ...baseState().pieces,
        { id: 'n1', owner: 'p1', type: PieceType.Knight, position: { x: 1, y: 1 } },
      ],
    });
    const dropCenter: PlayerAction = {
      type: 'drop',
      playerId: 'p1',
      pieceType: PieceType.Rook,
      to: { x: 6, y: 6 },
    };
    const quietMove: PlayerAction = {
      type: 'move',
      pieceId: 'n1',
      from: { x: 1, y: 1 },
      to: { x: 2, y: 3 },
    };
    const bot = new HeuristicBot('p1', {
      aggression: 0.5,
      greed: 0.5,
      riskTolerance: 0.4,
      focusBias: 0.6,
      randomness: 0,
    });

    const selected = bot.decide({
      state,
      playerId: 'p1',
      legalActions: [quietMove, dropCenter],
      seed: 'objective-drop-timing',
    });

    expect(selected).toStrictEqual(dropCenter);
  });
});
