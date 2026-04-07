import { describe, expect, it } from 'vitest';
import { MultiAgentAIManager } from './index';
import {
  Bot,
  DecisionContext,
  GameState,
  PieceType,
  PlayerAction,
} from '../../engine/src/types';

class FirstActionBot implements Bot {
  constructor(
    public id: string,
    public personality = {
      aggression: 0,
      greed: 0,
      riskTolerance: 0,
      focusBias: 0,
      randomness: 0,
    },
  ) {}

  decide(context: DecisionContext): PlayerAction {
    return context.legalActions[0];
  }
}

const makeState = (): GameState => ({
  config: {
    playerCount: 3,
    boardSize: 11,
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
    p3: { id: 'p3', score: 0, isEliminated: false, dropReserve: [], color: '#0f0' },
  },
  pieces: [
    { id: 'k1', owner: 'p1', type: PieceType.King, position: { x: 5, y: 0 } },
    { id: 'k2', owner: 'p2', type: PieceType.King, position: { x: 6, y: 0 } },
    { id: 'k3', owner: 'p3', type: PieceType.King, position: { x: 5, y: 10 } },
    { id: 'r1', owner: 'p1', type: PieceType.Rook, position: { x: 0, y: 0 } },
    { id: 'r2', owner: 'p2', type: PieceType.Rook, position: { x: 2, y: 0 } },
    { id: 't1', owner: 'p3', type: PieceType.Pawn, position: { x: 0, y: 1 } },
    { id: 't2', owner: 'p3', type: PieceType.Pawn, position: { x: 2, y: 1 } },
  ],
});

const attacksOwner = (
  action: PlayerAction | null | undefined,
  state: GameState,
  owner: string,
): boolean => {
  if (!action || action.type !== 'move') return false;
  return state.pieces.some(
    (piece) =>
      piece.position.x === action.to.x &&
      piece.position.y === action.to.y &&
      piece.owner === owner,
  );
};

describe('MultiAgentAIManager contract', () => {
  it('returns one decision per managed bot using only legal actions', () => {
    const state = makeState();
    const bots = [new FirstActionBot('p1'), new FirstActionBot('p2')];
    const manager = new MultiAgentAIManager(bots, { maxFocusPerTarget: 1 });
    const legalActionsByPlayer: Record<string, PlayerAction[]> = {
      p1: [
        { type: 'move', pieceId: 'r1', from: { x: 0, y: 0 }, to: { x: 0, y: 1 } },
        { type: 'move', pieceId: 'r1', from: { x: 0, y: 0 }, to: { x: 0, y: 2 } },
      ],
      p2: [
        { type: 'move', pieceId: 'r2', from: { x: 2, y: 0 }, to: { x: 2, y: 1 } },
        { type: 'move', pieceId: 'r2', from: { x: 2, y: 0 }, to: { x: 2, y: 2 } },
      ],
    };

    const decisions = manager.decideRound(state, legalActionsByPlayer);

    expect(legalActionsByPlayer.p1).toContainEqual(decisions.p1 as PlayerAction);
    expect(legalActionsByPlayer.p2).toContainEqual(decisions.p2 as PlayerAction);
  });

  it('applies anti-collusion cap so no more than one bot focuses the same target owner', () => {
    const state = makeState();
    const bots = [new FirstActionBot('p1'), new FirstActionBot('p2')];
    const manager = new MultiAgentAIManager(bots, { maxFocusPerTarget: 1 });
    const legalActionsByPlayer: Record<string, PlayerAction[]> = {
      p1: [
        { type: 'move', pieceId: 'r1', from: { x: 0, y: 0 }, to: { x: 0, y: 1 } },
        { type: 'move', pieceId: 'r1', from: { x: 0, y: 0 }, to: { x: 0, y: 2 } },
      ],
      p2: [
        { type: 'move', pieceId: 'r2', from: { x: 2, y: 0 }, to: { x: 2, y: 1 } },
        { type: 'move', pieceId: 'r2', from: { x: 2, y: 0 }, to: { x: 2, y: 2 } },
      ],
    };

    const decisions = manager.decideRound(state, legalActionsByPlayer);
    const focusedOnP3 = [decisions.p1, decisions.p2].filter((action) =>
      attacksOwner(action, state, 'p3'),
    );

    expect(focusedOnP3).toHaveLength(1);
  });

  it('returns null decisions for eliminated bots', () => {
    const state = makeState();
    state.players.p2.isEliminated = true;
    const bots = [new FirstActionBot('p1'), new FirstActionBot('p2')];
    const manager = new MultiAgentAIManager(bots, { maxFocusPerTarget: 1 });
    const legalActionsByPlayer: Record<string, PlayerAction[]> = {
      p1: [{ type: 'move', pieceId: 'r1', from: { x: 0, y: 0 }, to: { x: 0, y: 2 } }],
      p2: [{ type: 'move', pieceId: 'r2', from: { x: 2, y: 0 }, to: { x: 2, y: 2 } }],
    };

    const decisions = manager.decideRound(state, legalActionsByPlayer);
    expect(decisions.p2).toBeNull();
  });
});

