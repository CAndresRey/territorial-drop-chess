import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_FORMATION_TEMPLATES } from '@tdc/engine';
import { Room, TURN_DURATION_MS } from './Room';

const makeFakeIO = () => {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { to, emit };
};

const makeSocket = (id: string) =>
  ({
    id,
    join: vi.fn(),
  }) as any;

describe('Room contract', () => {
  it('starts game and emits gameState + turnStarted', () => {
    vi.useFakeTimers();
    try {
      const io = makeFakeIO();
      const room = new Room('room_1', io as any);
      const socket = makeSocket('s1');
      room.join(socket, 'human');

      room.start({
        playerId: 'human',
        config: {
          playerCount: 4,
          boardSize: 13,
          enabledRules: ['multi-threat', 'center-bonus', 'territory-control'],
          scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 5 },
          turnSystem: { type: 'simultaneous', maxRounds: 30, timerSeconds: 30 },
          formation: {
            enabled: true,
            required: true,
            templates: DEFAULT_FORMATION_TEMPLATES,
          },
        } as any,
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
      } as any);

      expect(io.to).toHaveBeenCalledWith('room_1');
      expect(io.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
      expect(io.emit).toHaveBeenCalledWith(
        'turnStarted',
        expect.objectContaining({ duration: TURN_DURATION_MS, round: 1 }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('resolves round as soon as all active human actions are submitted', () => {
    vi.useFakeTimers();
    try {
      const io = makeFakeIO();
      const room = new Room('room_2', io as any);
      const socket = makeSocket('s1');
      room.join(socket, 'human');

      room.start({
        playerId: 'human',
        config: {
          playerCount: 2,
          boardSize: 11,
          enabledRules: [],
          scoring: { centerControl: 1, captureValue: {} as any, survivalBonus: 0 },
          turnSystem: { type: 'simultaneous', maxRounds: 5, timerSeconds: 30 },
        } as any,
        setup: {
          botDifficulties: ['easy'],
          formationSelections: { human: DEFAULT_FORMATION_TEMPLATES[0].id, bot_1: DEFAULT_FORMATION_TEMPLATES[0].id },
          maxFocusPerTarget: 1,
        },
      } as any);

      room.submitAction('human', null);

      expect(io.emit).toHaveBeenCalledWith(
        'roundResolved',
        expect.objectContaining({
          state: expect.any(Object),
          events: expect.any(Array),
          gameOver: expect.any(Object),
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

