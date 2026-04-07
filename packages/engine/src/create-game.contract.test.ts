import { describe, expect, it } from 'vitest';
import { createGame } from './board';
import { GameConfig } from './types';
import { DEFAULT_FORMATION_TEMPLATES } from './formation';

const baseConfig: GameConfig = {
  playerCount: 4,
  boardSize: 13,
  enabledRules: [],
  scoring: {
    centerControl: 1,
    captureValue: {} as any,
    survivalBonus: 0,
  },
  turnSystem: {
    type: 'simultaneous',
    maxRounds: 40,
    timerSeconds: 30,
  },
};

const byPlayerCountBoardSize = (playerCount: number): number => {
  if (playerCount === 2) return 11;
  if (playerCount <= 4) return 13;
  return 15;
};

describe('createGame contract', () => {
  it('creates a valid initial state for each player count from 2 to 8', () => {
    for (let playerCount = 2; playerCount <= 8; playerCount++) {
      const players = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);
      const state = createGame(
        {
          ...baseConfig,
          playerCount: playerCount as GameConfig['playerCount'],
          boardSize: byPlayerCountBoardSize(playerCount),
        },
        players,
      );

      expect(Object.keys(state.players)).toHaveLength(playerCount);
      expect(state.status).toBe('playing');
      expect(state.round).toBe(1);
    }
  });

  it('derives board size from player count and ignores mismatched boardSize input', () => {
    const twoPlayers = createGame(
      {
        ...baseConfig,
        playerCount: 2,
        boardSize: 15,
      },
      ['p1', 'p2'],
    );
    const fourPlayers = createGame(
      {
        ...baseConfig,
        playerCount: 4,
        boardSize: 11,
      },
      ['p1', 'p2', 'p3', 'p4'],
    );
    const eightPlayers = createGame(
      {
        ...baseConfig,
        playerCount: 8,
        boardSize: 11,
      },
      ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'],
    );

    expect(twoPlayers.config.boardSize).toBe(11);
    expect(fourPlayers.config.boardSize).toBe(13);
    expect(eightPlayers.config.boardSize).toBe(15);
  });

  it('rejects invalid playerCount values at runtime', () => {
    const createWithInvalidConfig = () =>
      createGame(
        {
          ...baseConfig,
          playerCount: 9 as GameConfig['playerCount'],
          boardSize: 15,
        },
        ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
      );

    expect(createWithInvalidConfig).toThrowError(/playerCount/i);
  });

  it('rejects mismatched number of player ids and configured player count', () => {
    const createWithMismatchedPlayers = () =>
      createGame(
        {
          ...baseConfig,
          playerCount: 4,
          boardSize: 13,
        },
        ['p1', 'p2', 'p3'],
      );

    expect(createWithMismatchedPlayers).toThrowError(/player count/i);
  });

  it('is deterministic for same input config and players', () => {
    const players = ['p1', 'p2', 'p3', 'p4'];
    const first = createGame(baseConfig, players);
    const second = createGame(baseConfig, players);

    expect(second).toStrictEqual(first);
  });

  it('rejects game creation when formation selection is required but missing', () => {
    const players = ['p1', 'p2', 'p3', 'p4'];
    const createWithoutSelections = () =>
      createGame(
        {
          ...baseConfig,
          formation: {
            enabled: true,
            required: true,
            templates: DEFAULT_FORMATION_TEMPLATES,
          },
        },
        players,
      );

    expect(createWithoutSelections).toThrowError(/formation/i);
  });

  it('applies selected formation templates per player before game starts', () => {
    const players = ['p1', 'p2', 'p3', 'p4'];
    const aggressive = DEFAULT_FORMATION_TEMPLATES.find((t) => t.id === 'aggressive-front')!;
    const fortress = DEFAULT_FORMATION_TEMPLATES.find((t) => t.id === 'fortress-guard')!;

    const state = createGame(
      {
        ...baseConfig,
        formation: {
          enabled: true,
          required: true,
          templates: DEFAULT_FORMATION_TEMPLATES,
        },
      },
      players,
      {
        formationSelections: {
          p1: aggressive.id,
          p2: fortress.id,
          p3: aggressive.id,
          p4: fortress.id,
        },
      },
    );

    const p1Army = state.pieces.filter((piece) => piece.owner === 'p1').map((piece) => piece.type);
    const p2Army = state.pieces.filter((piece) => piece.owner === 'p2').map((piece) => piece.type);

    expect([...p1Army].sort()).toStrictEqual([...aggressive.pieces].sort());
    expect([...p2Army].sort()).toStrictEqual([...fortress.pieces].sort());
  });

  it('rejects unknown selected formation ids', () => {
    const players = ['p1', 'p2', 'p3', 'p4'];
    const createWithUnknownFormation = () =>
      createGame(
        {
          ...baseConfig,
          formation: {
            enabled: true,
            required: true,
            templates: DEFAULT_FORMATION_TEMPLATES,
          },
        },
        players,
        {
          formationSelections: {
            p1: 'unknown-formation',
            p2: DEFAULT_FORMATION_TEMPLATES[0].id,
            p3: DEFAULT_FORMATION_TEMPLATES[0].id,
            p4: DEFAULT_FORMATION_TEMPLATES[0].id,
          },
        },
      );

    expect(createWithUnknownFormation).toThrowError(/unknown formation/i);
  });
});
