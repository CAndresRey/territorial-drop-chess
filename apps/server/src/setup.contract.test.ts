import { describe, expect, it } from 'vitest';
import { DEFAULT_FORMATION_TEMPLATES } from '@tdc/engine';
import { DifficultyLevel } from './domain-adapters';
import {
  CreateGameRequestPayload,
  normalizeCreateGameRequest,
} from './setup';

const makePayload = (): CreateGameRequestPayload => ({
  playerId: 'human',
  config: {
    playerCount: 4,
    boardSize: 13,
    enabledRules: ['multi-threat', 'center-bonus', 'territory-control'],
    scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 5 },
    turnSystem: { type: 'simultaneous', maxRounds: 30, timerSeconds: 30 },
  },
  setup: {
    botDifficulties: ['easy', 'normal', 'hard'],
    formationSelections: {
      human: DEFAULT_FORMATION_TEMPLATES[0].id,
      bot_1: DEFAULT_FORMATION_TEMPLATES[1].id,
      bot_2: DEFAULT_FORMATION_TEMPLATES[2].id,
      bot_3: DEFAULT_FORMATION_TEMPLATES[0].id,
    },
    maxFocusPerTarget: 1,
  },
});

describe('server setup normalization contract', () => {
  it('normalizes player ids and bot settings from createGame request', () => {
    const normalized = normalizeCreateGameRequest(makePayload());
    expect(normalized.playerIds).toStrictEqual(['human', 'bot_1', 'bot_2', 'bot_3']);
    expect(normalized.botSettings).toStrictEqual([
      { id: 'bot_1', difficulty: 'easy' },
      { id: 'bot_2', difficulty: 'normal' },
      { id: 'bot_3', difficulty: 'hard' },
    ]);
    expect(normalized.maxFocusPerTarget).toBe(1);
  });

  it('fills missing bot difficulties with normal by default', () => {
    const payload = makePayload();
    payload.setup.botDifficulties = ['hard'];

    const normalized = normalizeCreateGameRequest(payload);
    expect(normalized.botSettings.map((setting) => setting.difficulty)).toStrictEqual([
      'hard',
      'normal',
      'normal',
    ]);
  });

  it('rejects missing required formation selections', () => {
    const payload = makePayload();
    delete payload.setup.formationSelections.bot_2;

    expect(() => normalizeCreateGameRequest(payload)).toThrowError(/formation/i);
  });

  it('rejects invalid difficulty labels', () => {
    const payload = makePayload();
    payload.setup.botDifficulties = ['legendary' as DifficultyLevel];

    expect(() => normalizeCreateGameRequest(payload)).toThrowError(/difficulty/i);
  });
});
