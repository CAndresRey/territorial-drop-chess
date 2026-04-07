import { DEFAULT_FORMATION_TEMPLATES, GameConfig, PlayerCount } from '@tdc/engine';

export type BotDifficulty = 'easy' | 'normal' | 'hard';

export interface SetupState {
  playerId: string;
  playerCount: PlayerCount;
  humanFormationId: string;
  botFormationIds: string[];
  botDifficulties: BotDifficulty[];
  maxFocusPerTarget: number;
}

export interface CreateGameRequestPayload {
  playerId: string;
  config: Partial<GameConfig>;
  setup: {
    botDifficulties: BotDifficulty[];
    formationSelections: Record<string, string>;
    maxFocusPerTarget: number;
  };
}

export const deriveBoardSize = (playerCount: number): number => {
  if (playerCount === 2) return 11;
  if (playerCount <= 4) return 13;
  return 15;
};

export const deriveDefaultRounds = (playerCount: number): number =>
  playerCount <= 4 ? 30 : 40;

export const buildCreateGameRequest = (
  setup: SetupState,
): CreateGameRequestPayload => {
  const botCount = setup.playerCount - 1;
  if (setup.botFormationIds.length !== botCount) {
    throw new Error(
      `Invalid bot formations length: expected ${botCount}, got ${setup.botFormationIds.length}`,
    );
  }
  if (setup.botDifficulties.length !== botCount) {
    throw new Error(
      `Invalid bot difficulties length: expected ${botCount}, got ${setup.botDifficulties.length}`,
    );
  }

  const formationSelections: Record<string, string> = {
    [setup.playerId]: setup.humanFormationId,
  };
  for (let i = 0; i < botCount; i++) {
    formationSelections[`bot_${i + 1}`] = setup.botFormationIds[i];
  }

  return {
    playerId: setup.playerId,
    config: {
      playerCount: setup.playerCount,
      boardSize: deriveBoardSize(setup.playerCount),
      turnSystem: {
        type: 'simultaneous',
        maxRounds: deriveDefaultRounds(setup.playerCount),
        timerSeconds: 30,
      },
      scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 5 },
      enabledRules: ['multi-threat', 'center-bonus', 'territory-control'],
      formation: {
        enabled: setup.playerCount > 2,
        required: setup.playerCount > 2,
        templates: DEFAULT_FORMATION_TEMPLATES,
      },
    },
    setup: {
      botDifficulties: [...setup.botDifficulties],
      formationSelections,
      maxFocusPerTarget: setup.maxFocusPerTarget,
    },
  };
};
