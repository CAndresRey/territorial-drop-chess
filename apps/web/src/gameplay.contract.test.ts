import { describe, expect, it } from 'vitest';
import { GameState, PieceType } from '@tdc/engine';
import {
  computeActionFromBoardClick,
  computeSelectableMoves,
  GameplaySelection,
  resetSelectionAfterSubmit,
  toggleDropSelection,
} from './gameplay';

const makeState = (): GameState =>
  ({
    config: {
      playerCount: 2,
      boardSize: 11,
      enabledRules: [],
      scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
      turnSystem: { type: 'simultaneous', maxRounds: 10, timerSeconds: 30 },
    },
    round: 1,
    status: 'playing',
    history: [],
    players: {
      human: {
        id: 'human',
        score: 0,
        isEliminated: false,
        dropReserve: [PieceType.Knight],
        color: '#f00',
      },
      bot_1: {
        id: 'bot_1',
        score: 0,
        isEliminated: false,
        dropReserve: [],
        color: '#00f',
      },
    },
    pieces: [
      { id: 'k1', owner: 'human', type: PieceType.King, position: { x: 5, y: 0 } },
      { id: 'k2', owner: 'bot_1', type: PieceType.King, position: { x: 5, y: 10 } },
    ],
  }) as GameState;

describe('web gameplay helpers contract', () => {
  it('returns legal move highlights for selected own piece', () => {
    const state = makeState();
    const moves = computeSelectableMoves(state, 'human', { x: 5, y: 0 });
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.some((move) => move.x === 5 && move.y === 1)).toBe(true);
  });

  it('builds a drop action when a drop piece is selected', () => {
    const state = makeState();
    const selection: GameplaySelection = {
      selectedCoord: null,
      selectedDrop: PieceType.Knight,
      validMoves: [],
    };
    const result = computeActionFromBoardClick(state, 'human', selection, {
      x: 4,
      y: 4,
    });

    expect(result.action).toStrictEqual({
      type: 'drop',
      playerId: 'human',
      pieceType: PieceType.Knight,
      to: { x: 4, y: 4 },
    });
  });

  it('builds a move action when clicking a highlighted destination', () => {
    const state = makeState();
    const selection: GameplaySelection = {
      selectedCoord: { x: 5, y: 0 },
      selectedDrop: null,
      validMoves: [{ x: 5, y: 1 }],
    };
    const result = computeActionFromBoardClick(state, 'human', selection, {
      x: 5,
      y: 1,
    });

    expect(result.action).toStrictEqual({
      type: 'move',
      pieceId: 'k1',
      from: { x: 5, y: 0 },
      to: { x: 5, y: 1 },
    });
  });

  it('toggles reserve selection when clicking the same drop piece twice', () => {
    const initial: GameplaySelection = {
      selectedCoord: { x: 5, y: 0 },
      selectedDrop: null,
      validMoves: [{ x: 5, y: 1 }],
    };
    const selected = toggleDropSelection(initial, PieceType.Knight);
    const unselected = toggleDropSelection(selected, PieceType.Knight);

    expect(selected.selectedDrop).toBe(PieceType.Knight);
    expect(selected.selectedCoord).toBeNull();
    expect(selected.validMoves).toStrictEqual([]);
    expect(unselected.selectedDrop).toBeNull();
  });

  it('resets board selection after submitting an action', () => {
    const dirty: GameplaySelection = {
      selectedCoord: { x: 5, y: 0 },
      selectedDrop: PieceType.Knight,
      validMoves: [{ x: 5, y: 1 }],
    };
    expect(resetSelectionAfterSubmit(dirty)).toStrictEqual({
      selectedCoord: null,
      selectedDrop: null,
      validMoves: [],
    });
  });
});
