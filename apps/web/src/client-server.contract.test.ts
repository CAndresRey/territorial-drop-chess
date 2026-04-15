import { describe, expect, it } from 'vitest';
import { DEFAULT_FORMATION_TEMPLATES } from '@tdc/engine';
import { buildCreateGameRequest, SetupState } from './setup';
import { normalizeCreateGameRequest } from '../../server/src/setup';

const makeSetup = (): SetupState => ({
  playerId: 'human',
  playerCount: 4,
  humanFormationId: DEFAULT_FORMATION_TEMPLATES[0].id,
  botFormationIds: [
    DEFAULT_FORMATION_TEMPLATES[1].id,
    DEFAULT_FORMATION_TEMPLATES[2].id,
    DEFAULT_FORMATION_TEMPLATES[0].id,
  ],
  botDifficulties: ['easy', 'normal', 'hard'],
  maxFocusPerTarget: 1,
});

describe('web->server setup contract', () => {
  it('normalizes a web payload without losing bot/formation setup', () => {
    const payload = buildCreateGameRequest(makeSetup());
    const normalized = normalizeCreateGameRequest(payload as any);

    expect(normalized.playerIds).toStrictEqual(['human', 'bot_1', 'bot_2', 'bot_3']);
    expect(normalized.botSettings).toStrictEqual([
      { id: 'bot_1', difficulty: 'easy' },
      { id: 'bot_2', difficulty: 'normal' },
      { id: 'bot_3', difficulty: 'hard' },
    ]);
    expect(normalized.formationSelections).toStrictEqual({
      human: DEFAULT_FORMATION_TEMPLATES[0].id,
      bot_1: DEFAULT_FORMATION_TEMPLATES[1].id,
      bot_2: DEFAULT_FORMATION_TEMPLATES[2].id,
      bot_3: DEFAULT_FORMATION_TEMPLATES[0].id,
    });
    expect(normalized.maxFocusPerTarget).toBe(1);
    expect(normalized.config.playerCount).toBe(4);
    expect(normalized.config.boardSize).toBe(13);
  });

  it('keeps rules coherent for 2-player mode (formation disabled)', () => {
    const payload = buildCreateGameRequest({
      ...makeSetup(),
      playerCount: 2,
      botFormationIds: [DEFAULT_FORMATION_TEMPLATES[0].id],
      botDifficulties: ['easy'],
    });
    const normalized = normalizeCreateGameRequest(payload as any);

    expect(normalized.playerIds).toStrictEqual(['human', 'bot_1']);
    expect(normalized.config.playerCount).toBe(2);
    expect(normalized.config.boardSize).toBe(11);
    expect(normalized.config.formation.enabled).toBe(false);
    expect(normalized.config.formation.required).toBe(false);
  });
});

