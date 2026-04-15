import { SetupState } from './setup';
import { defaultBotDifficultyList, defaultBotFormationList } from './setup-defaults';

export const SETUP_STORAGE_KEY = 'tdc.setup.v1';

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const isSetupState = (value: unknown): value is SetupState => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as SetupState;
  return (
    typeof candidate.playerId === 'string' &&
    typeof candidate.playerCount === 'number' &&
    typeof candidate.humanFormationId === 'string' &&
    Array.isArray(candidate.botFormationIds) &&
    Array.isArray(candidate.botDifficulties) &&
    typeof candidate.maxFocusPerTarget === 'number'
  );
};

export const loadSetupState = (storage?: Pick<StorageLike, 'getItem'>): SetupState | null => {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SETUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isSetupState(parsed) ? normalizePersistedSetup(parsed) : null;
  } catch {
    return null;
  }
};

export const saveSetupState = (
  setup: SetupState,
  storage?: Pick<StorageLike, 'setItem'>,
): void => {
  if (!storage) return;
  storage.setItem(SETUP_STORAGE_KEY, JSON.stringify(setup));
};

export const normalizePersistedSetup = (setup: SetupState): SetupState => {
  const targetBotCount = Math.max(0, setup.playerCount - 1);
  const normalizedDifficulties = [
    ...setup.botDifficulties,
    ...defaultBotDifficultyList(setup.playerCount),
  ].slice(0, targetBotCount);
  const normalizedFormations = [
    ...setup.botFormationIds,
    ...defaultBotFormationList(setup.playerCount),
  ].slice(0, targetBotCount);

  return {
    ...setup,
    botDifficulties: normalizedDifficulties,
    botFormationIds: normalizedFormations,
  };
};
