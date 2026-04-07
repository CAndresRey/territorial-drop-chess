import {
  DEFAULT_FORMATION_TEMPLATES,
  GameConfig,
  PlayerCount,
  PlayerId,
} from '@tdc/engine';
import {
  DIFFICULTY_LEVELS,
  DifficultyLevel,
} from '../../../packages/difficulty/src/index';

export interface CreateGameRequestPayload {
  playerId: PlayerId;
  config: Partial<GameConfig>;
  setup: {
    botDifficulties: DifficultyLevel[];
    formationSelections: Record<string, string>;
    maxFocusPerTarget: number;
  };
}

export interface BotSetting {
  id: PlayerId;
  difficulty: DifficultyLevel;
}

export interface NormalizedCreateGameRequest {
  playerId: PlayerId;
  config: GameConfig;
  playerIds: PlayerId[];
  botSettings: BotSetting[];
  formationSelections: Record<PlayerId, string>;
  maxFocusPerTarget: number;
}

const deriveBoardSize = (playerCount: number): number => {
  if (playerCount === 2) return 11;
  if (playerCount <= 4) return 13;
  return 15;
};

const deriveRounds = (playerCount: number): number => (playerCount <= 4 ? 30 : 40);

const isDifficulty = (value: string): value is DifficultyLevel =>
  (DIFFICULTY_LEVELS as string[]).includes(value);

const normalizePlayerCount = (count: number): PlayerCount => {
  if (count < 2 || count > 8) {
    throw new Error('Invalid player count');
  }
  return count as PlayerCount;
};

export const normalizeCreateGameRequest = (
  payload: CreateGameRequestPayload,
): NormalizedCreateGameRequest => {
  const rawPlayerCount = payload.config.playerCount;
  if (rawPlayerCount === undefined) {
    throw new Error('Missing player count');
  }
  const playerCount = normalizePlayerCount(rawPlayerCount);
  const playerIds: PlayerId[] = [payload.playerId];
  for (let i = 1; i < playerCount; i++) {
    playerIds.push(`bot_${i}`);
  }

  const botCount = playerCount - 1;
  const setup = payload.setup ?? ({} as CreateGameRequestPayload['setup']);
  const botSettings: BotSetting[] = [];
  for (let i = 0; i < botCount; i++) {
    const id = `bot_${i + 1}`;
    const raw = setup.botDifficulties?.[i] ?? 'normal';
    if (!isDifficulty(raw)) {
      throw new Error(`Invalid difficulty "${raw}"`);
    }
    botSettings.push({ id, difficulty: raw });
  }

  const formationSelections = setup.formationSelections ?? {};
  for (const playerId of playerIds) {
    if (!formationSelections[playerId]) {
      throw new Error(`Missing formation selection for player "${playerId}"`);
    }
  }

  const config: GameConfig = {
    ...payload.config,
    playerCount,
    boardSize: deriveBoardSize(playerCount),
    turnSystem: payload.config.turnSystem ?? {
      type: 'simultaneous',
      maxRounds: deriveRounds(playerCount),
      timerSeconds: 30,
    },
    scoring: payload.config.scoring ?? {
      centerControl: 1,
      captureValue: {} as any,
      survivalBonus: 5,
    },
    enabledRules:
      payload.config.enabledRules ?? ['multi-threat', 'center-bonus', 'territory-control'],
    formation: {
      enabled: playerCount > 2,
      required: playerCount > 2,
      templates:
        payload.config.formation?.templates?.length
          ? payload.config.formation.templates
          : DEFAULT_FORMATION_TEMPLATES,
    },
  };

  return {
    playerId: payload.playerId,
    config,
    playerIds,
    botSettings,
    formationSelections: formationSelections as Record<PlayerId, string>,
    maxFocusPerTarget: setup.maxFocusPerTarget ?? 1,
  };
};
