import { describe, expect, it } from 'vitest';
import { loadSetupState, normalizePersistedSetup, saveSetupState } from './setup-storage';
import { SetupState } from './setup';

const sampleSetup: SetupState = {
  playerId: 'human',
  playerCount: 4,
  humanFormationId: 'balanced-core',
  botFormationIds: ['fortress-guard', 'tempo-scout', 'balanced-core'],
  botDifficulties: ['easy', 'normal', 'hard'],
  maxFocusPerTarget: 1,
};

describe('setup storage contract', () => {
  it('round-trips setup state to storage', () => {
    const storage = new Map<string, string>();
    saveSetupState(sampleSetup, {
      setItem: (key, value) => storage.set(key, value),
    });

    const loaded = loadSetupState({
      getItem: (key) => storage.get(key) ?? null,
    });
    expect(loaded).toStrictEqual(sampleSetup);
  });

  it('returns null when storage is missing or invalid', () => {
    expect(loadSetupState(undefined)).toBeNull();
    expect(
      loadSetupState({
        getItem: () => '{not-json',
      }),
    ).toBeNull();
  });

  it('normalizes persisted setup bot arrays to match playerCount-1', () => {
    const normalized = normalizePersistedSetup({
      ...sampleSetup,
      playerCount: 3,
      botFormationIds: ['fortress-guard', 'tempo-scout', 'balanced-core', 'extra'],
      botDifficulties: ['easy'],
    });

    expect(normalized.playerCount).toBe(3);
    expect(normalized.botFormationIds).toHaveLength(2);
    expect(normalized.botDifficulties).toHaveLength(2);
  });
});
