import { afterEach, describe, expect, it } from 'vitest';
import { io as createClient, Socket } from 'socket.io-client';
import { DEFAULT_FORMATION_TEMPLATES } from '@tdc/engine';
import { createRealtimeServer, RealtimeServer } from './server';

const waitForSocketEvent = <T = unknown>(
  socket: Socket,
  event: string,
  timeoutMs: number = 5000,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for socket event "${event}"`));
    }, timeoutMs);

    socket.once(event, (payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });

describe('Server E2E contract', () => {
  let server: RealtimeServer | null = null;
  let client: Socket | null = null;

  afterEach(async () => {
    if (client) {
      client.disconnect();
      client = null;
    }
    if (server) {
      await server.stop();
      server = null;
    }
  });

  it(
    'runs playable flow: create game, receive turn, submit action and resolve round',
    async () => {
      server = createRealtimeServer({ port: 0 });
      const port = await server.start();

      const health = await fetch(`http://127.0.0.1:${port}/health`).then((response) =>
        response.json(),
      );
      expect(health).toStrictEqual({ status: 'ok', roomsCount: 0 });

      client = createClient(`http://127.0.0.1:${port}`, {
        transports: ['websocket'],
        reconnection: false,
      });
      await waitForSocketEvent(client, 'connect');

      const gameStatePromise = waitForSocketEvent<any>(client, 'gameState');
      const turnStartedPromise = waitForSocketEvent<any>(client, 'turnStarted');

      client.emit('createGame', {
        playerId: 'human',
        config: {
          playerCount: 2,
          turnSystem: { type: 'simultaneous', maxRounds: 5, timerSeconds: 30 },
          enabledRules: [],
          scoring: { centerControl: 1, captureValue: {}, survivalBonus: 0 },
        },
        setup: {
          botDifficulties: ['easy'],
          formationSelections: {
            human: DEFAULT_FORMATION_TEMPLATES[0].id,
            bot_1: DEFAULT_FORMATION_TEMPLATES[0].id,
          },
          maxFocusPerTarget: 1,
        },
      });

      const gameState = await gameStatePromise;
      expect(gameState.status).toBe('playing');
      expect(gameState.config.playerCount).toBe(2);

      const turnStarted = await turnStartedPromise;
      expect(turnStarted.round).toBe(1);
      expect(turnStarted.duration).toBeGreaterThan(0);

      const roundResolvedPromise = waitForSocketEvent<any>(client, 'roundResolved');
      client.emit('submitAction', null);

      const roundResolved = await roundResolvedPromise;
      expect(roundResolved).toEqual(
        expect.objectContaining({
          state: expect.any(Object),
          events: expect.any(Array),
          gameOver: expect.any(Object),
        }),
      );
      expect(roundResolved.state.round).toBeGreaterThan(1);
    },
    15000,
  );

  it('emits roomCreated and removes empty room on disconnect', async () => {
    server = createRealtimeServer({ port: 0 });
    const port = await server.start();

    client = createClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      reconnection: false,
    });
    await waitForSocketEvent(client, 'connect');

    const roomCreatedPromise = waitForSocketEvent<{ roomId: string }>(
      client,
      'roomCreated',
    );
    client.emit('createGame', {
      playerId: 'human',
      config: {
        playerCount: 2,
      },
      setup: {
        botDifficulties: ['easy'],
        formationSelections: {
          human: DEFAULT_FORMATION_TEMPLATES[0].id,
          bot_1: DEFAULT_FORMATION_TEMPLATES[0].id,
        },
        maxFocusPerTarget: 1,
      },
    });

    const roomCreated = await roomCreatedPromise;
    expect(roomCreated.roomId).toMatch(/^room_/);

    const duringGame = await fetch(`http://127.0.0.1:${port}/health`).then((response) =>
      response.json(),
    );
    expect(duringGame.roomsCount).toBe(1);

    client.disconnect();
    client = null;

    await new Promise((resolve) => setTimeout(resolve, 50));
    const afterDisconnect = await fetch(`http://127.0.0.1:${port}/health`).then((response) =>
      response.json(),
    );
    expect(afterDisconnect.roomsCount).toBe(0);
  });

  it(
    'applies advanced setup (formations + bot difficulties) into initial game state',
    async () => {
      server = createRealtimeServer({ port: 0 });
      const port = await server.start();

      client = createClient(`http://127.0.0.1:${port}`, {
        transports: ['websocket'],
        reconnection: false,
      });
      await waitForSocketEvent(client, 'connect');

      const gameStatePromise = waitForSocketEvent<any>(client, 'gameState');
      const roomCreatedPromise = waitForSocketEvent<{ roomId: string }>(
        client,
        'roomCreated',
      );

      client.emit('createGame', {
        playerId: 'human',
        config: {
          playerCount: 4,
          turnSystem: { type: 'simultaneous', maxRounds: 30, timerSeconds: 30 },
          enabledRules: ['multi-threat', 'center-bonus', 'territory-control'],
          scoring: { centerControl: 1, captureValue: {}, survivalBonus: 5 },
          formation: {
            enabled: true,
            required: true,
            templates: DEFAULT_FORMATION_TEMPLATES,
          },
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

      const roomCreated = await roomCreatedPromise;
      expect(roomCreated.roomId).toMatch(/^room_/);

      const gameState = await gameStatePromise;
      expect(gameState.status).toBe('playing');
      expect(gameState.config.playerCount).toBe(4);
      expect(gameState.config.boardSize).toBe(13);
      expect(gameState.config.formation.enabled).toBe(true);
      expect(Object.keys(gameState.players).sort()).toStrictEqual([
        'bot_1',
        'bot_2',
        'bot_3',
        'human',
      ]);

      const byOwner = Object.fromEntries(
        Object.keys(gameState.players).map((id) => [
          id,
          gameState.pieces.filter((piece: any) => piece.owner === id).length,
        ]),
      );
      expect(byOwner.human).toBeGreaterThan(0);
      expect(byOwner.bot_1).toBeGreaterThan(0);
      expect(byOwner.bot_2).toBeGreaterThan(0);
      expect(byOwner.bot_3).toBeGreaterThan(0);
    },
    15000,
  );
});
