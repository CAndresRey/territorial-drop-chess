import { DEFAULT_FORMATION_TEMPLATES } from '@tdc/engine';
import { BotDifficulty } from './setup';

export const clampPlayerCount = (value: number): 2 | 3 | 4 | 5 | 6 | 7 | 8 =>
  Math.min(8, Math.max(2, value)) as 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const defaultBotDifficultyList = (playerCount: number): BotDifficulty[] =>
  Array.from({ length: Math.max(0, playerCount - 1) }, () => 'normal');

export const defaultBotFormationList = (playerCount: number): string[] =>
  Array.from(
    { length: Math.max(0, playerCount - 1) },
    (_, idx) =>
      DEFAULT_FORMATION_TEMPLATES[(idx + 1) % DEFAULT_FORMATION_TEMPLATES.length].id,
  );

