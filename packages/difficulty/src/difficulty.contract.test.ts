import { describe, expect, it } from 'vitest';
import {
  DIFFICULTY_LEVELS,
  getDifficultyProfile,
  listDifficultyLevels,
} from './index';

describe('difficulty profiles contract', () => {
  it('exports all supported difficulty levels in deterministic order', () => {
    expect(DIFFICULTY_LEVELS).toStrictEqual(['easy', 'normal', 'hard']);
    expect(listDifficultyLevels()).toStrictEqual(['easy', 'normal', 'hard']);
  });

  it('returns normalized personality values for every level', () => {
    for (const level of DIFFICULTY_LEVELS) {
      const profile = getDifficultyProfile(level);
      expect(profile.aggression).toBeGreaterThanOrEqual(0);
      expect(profile.aggression).toBeLessThanOrEqual(1);
      expect(profile.greed).toBeGreaterThanOrEqual(0);
      expect(profile.greed).toBeLessThanOrEqual(1);
      expect(profile.riskTolerance).toBeGreaterThanOrEqual(0);
      expect(profile.riskTolerance).toBeLessThanOrEqual(1);
      expect(profile.focusBias).toBeGreaterThanOrEqual(0);
      expect(profile.focusBias).toBeLessThanOrEqual(1);
      expect(profile.randomness).toBeGreaterThanOrEqual(0);
      expect(profile.randomness).toBeLessThanOrEqual(1);
    }
  });

  it('hard mode is less random and more focused than easy mode', () => {
    const easy = getDifficultyProfile('easy');
    const hard = getDifficultyProfile('hard');

    expect(hard.randomness).toBeLessThan(easy.randomness);
    expect(hard.focusBias).toBeGreaterThanOrEqual(easy.focusBias);
  });
});

