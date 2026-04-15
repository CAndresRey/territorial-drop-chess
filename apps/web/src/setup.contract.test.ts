import { describe, expect, it } from 'vitest';
import { DEFAULT_FORMATION_TEMPLATES } from '@tdc/engine';
import {
  buildCreateGameRequest,
  deriveBoardSize,
  deriveDefaultRounds,
  SetupState,
} from './setup';

const baseSetup = (): SetupState => ({
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

describe('web setup contract', () => {
  it('derives board size from player count', () => {
    expect(deriveBoardSize(2)).toBe(11);
    expect(deriveBoardSize(4)).toBe(13);
    expect(deriveBoardSize(8)).toBe(15);
  });

  it('derives default rounds from player count', () => {
    expect(deriveDefaultRounds(2)).toBe(30);
    expect(deriveDefaultRounds(4)).toBe(30);
    expect(deriveDefaultRounds(5)).toBe(40);
  });

  it('builds a createGame request with per-player formations and per-bot difficulty', () => {
    const request = buildCreateGameRequest(baseSetup());

    expect(request.playerId).toBe('human');
    expect(request.config.playerCount).toBe(4);
    expect(request.setup.botDifficulties).toStrictEqual(['easy', 'normal', 'hard']);
    expect(request.setup.formationSelections).toStrictEqual({
      human: DEFAULT_FORMATION_TEMPLATES[0].id,
      bot_1: DEFAULT_FORMATION_TEMPLATES[1].id,
      bot_2: DEFAULT_FORMATION_TEMPLATES[2].id,
      bot_3: DEFAULT_FORMATION_TEMPLATES[0].id,
    });
    expect(request.setup.maxFocusPerTarget).toBe(1);
  });

  it('rejects mismatched bot setup lengths', () => {
    const invalid = () =>
      buildCreateGameRequest({
        ...baseSetup(),
        botFormationIds: [DEFAULT_FORMATION_TEMPLATES[0].id],
      });

    expect(invalid).toThrowError(/bot formations/i);
  });

  it('clamps anti-collusion cap to supported range [1,2]', () => {
    const low = buildCreateGameRequest({
      ...baseSetup(),
      maxFocusPerTarget: 0,
    });
    const high = buildCreateGameRequest({
      ...baseSetup(),
      maxFocusPerTarget: 5,
    });

    expect(low.setup.maxFocusPerTarget).toBe(1);
    expect(high.setup.maxFocusPerTarget).toBe(2);
  });
});
