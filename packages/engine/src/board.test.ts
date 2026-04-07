import { describe, expect, it } from 'vitest';
import { createGame } from './board';
import { GameConfig, PieceType } from './types';

const mockConfig: GameConfig = {
  playerCount: 4,
  boardSize: 13,
  enabledRules: [],
  scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
  turnSystem: { type: 'simultaneous', maxRounds: 40, timerSeconds: 30 },
};

describe('Board Initialization', () => {
  it('should initialize a 4-player game with correct number of pieces', () => {
    const players = ['p1', 'p2', 'p3', 'p4'];
    const state = createGame(mockConfig, players);

    expect(state.config.boardSize).toBe(13);
    expect(Object.keys(state.players).length).toBe(4);

    // Each player in 4p has 10 pieces (K, G, R, N, B, Px5)
    expect(state.pieces.length).toBe(40);
  });

  it('should verify exact composition of Player 1 army (NW corner)', () => {
    const state = createGame(mockConfig, ['p1', 'p2', 'p3', 'p4']);

    // Player 1 pieces
    const army = state.pieces.filter((p) => p.owner === 'p1');
    expect(army.length).toBe(10);

    const kings = army.filter((p) => p.type === PieceType.King);
    expect(kings.length).toBe(1);

    const pawns = army.filter((p) => p.type === PieceType.Pawn);
    expect(pawns.length).toBe(5);
  });

  it('should derive the standard board size from the player count', () => {
    const twoPlayerState = createGame(
      { ...mockConfig, playerCount: 2, boardSize: 15 },
      ['p1', 'p2'],
    );
    const fourPlayerState = createGame(
      { ...mockConfig, playerCount: 4, boardSize: 11 },
      ['p1', 'p2', 'p3', 'p4'],
    );
    const eightPlayerState = createGame(
      { ...mockConfig, playerCount: 8, boardSize: 11 },
      ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'],
    );

    expect(twoPlayerState.config.boardSize).toBe(11);
    expect(fourPlayerState.config.boardSize).toBe(13);
    expect(eightPlayerState.config.boardSize).toBe(15);
  });

  it('should reject mismatched player ids and configured player count', () => {
    expect(() => createGame(mockConfig, ['p1', 'p2', 'p3'])).toThrowError(
      /player count/i,
    );
  });

  it('should not place two starting pieces on the same square', () => {
    const state = createGame(mockConfig, ['p1', 'p2', 'p3', 'p4']);
    const occupied = new Set(
      state.pieces.map((piece) => `${piece.position.x},${piece.position.y}`),
    );

    expect(occupied.size).toBe(state.pieces.length);
  });

  it('should create the same initial state for the same config and players', () => {
    const players = ['p1', 'p2', 'p3', 'p4'];
    const first = createGame(mockConfig, players);
    const second = createGame(mockConfig, players);

    expect(second).toStrictEqual(first);
  });
});
