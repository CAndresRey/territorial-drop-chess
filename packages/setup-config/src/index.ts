import { DIFFICULTY_LEVELS, DifficultyLevel } from '@tdc/difficulty';
import { DEFAULT_FORMATION_TEMPLATES } from '@tdc/engine';

/**
 * Shared game configuration and setup utilities
 * Used by both server and web apps
 */

export type BotDifficulty = DifficultyLevel;

/**
 * Derives board size based on player count
 */
export const deriveBoardSize = (playerCount: number): number => {
  if (playerCount === 2) return 11;
  if (playerCount <= 4) return 13;
  return 15;
};

/**
 * Derives default number of rounds based on player count
 */
export const deriveDefaultRounds = (playerCount: number): number =>
  playerCount <= 4 ? 30 : 40;

/**
 * Default game config constants
 */
export const DEFAULT_GAME_CONFIG = {
  scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 5 },
  enabledRules: ['multi-threat', 'center-bonus', 'territory-control'],
  turnSystem: {
    type: 'simultaneous' as const,
    timerSeconds: 30,
  },
  formationTemplates: DEFAULT_FORMATION_TEMPLATES,
};

/**
 * Validates if a string is a valid BotDifficulty
 */
export const isValidDifficulty = (value: string): value is BotDifficulty => {
  return (DIFFICULTY_LEVELS as string[]).includes(value);
};

/**
 * Default difficulty level for bots
 */
export const DEFAULT_BOT_DIFFICULTY: BotDifficulty = 'normal';
