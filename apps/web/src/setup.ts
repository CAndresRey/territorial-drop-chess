import { GameConfig, PlayerCount } from '@tdc/engine';
import {
  BotDifficulty,
  DEFAULT_GAME_CONFIG,
  deriveBoardSize,
  deriveDefaultRounds,
} from '@tdc/setup-config';

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

  const normalizedMaxFocusPerTarget = Math.max(
    1,
    Math.min(2, Math.floor(setup.maxFocusPerTarget)),
  );

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
      scoring: DEFAULT_GAME_CONFIG.scoring,
      enabledRules: DEFAULT_GAME_CONFIG.enabledRules,
      formation: {
        enabled: setup.playerCount > 2,
        required: setup.playerCount > 2,
        templates: DEFAULT_GAME_CONFIG.formationTemplates,
      },
    },
    setup: {
      botDifficulties: [...setup.botDifficulties],
      formationSelections,
      maxFocusPerTarget: normalizedMaxFocusPerTarget,
    },
  };
};

export {
  BotDifficulty,
  DEFAULT_GAME_CONFIG,
  deriveBoardSize,
  deriveDefaultRounds,
};
