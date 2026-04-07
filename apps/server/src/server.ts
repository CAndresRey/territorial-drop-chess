import express from 'express';
import { createServer, Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Room } from './Room';
import { CreateGameRequestPayload } from './setup';

export interface RealtimeServer {
  app: express.Express;
  httpServer: HttpServer;
  io: Server;
  start: () => Promise<number>;
  stop: () => Promise<void>;
}

export interface CreateRealtimeServerOptions {
  port?: number;
  log?: boolean;
}

const randomRoomId = (): string => `room_${Math.random().toString(36).substring(7)}`;

export const createRealtimeServer = (
  options?: CreateRealtimeServerOptions,
): RealtimeServer => {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  const logEnabled = options?.log ?? false;
  const logger = (...args: unknown[]) => {
    if (logEnabled) console.log(...args);
  };

  const rooms = new Map<string, Room>();
  const getOrCreateRoom = (roomId: string): Room => {
    if (!rooms.has(roomId)) {
      logger(`[Server] Created room: ${roomId}`);
      rooms.set(roomId, new Room(roomId, io));
    }
    return rooms.get(roomId)!;
  };

  app.get('/health', (_req, res) => {
    res.send({ status: 'ok', roomsCount: rooms.size });
  });

  io.on('connection', (socket: Socket) => {
    logger(`[Socket] Connected: ${socket.id}`);

    socket.on('joinRoom', (data: { roomId: string; playerId: string }) => {
      const { roomId, playerId } = data;
      const room = getOrCreateRoom(roomId);

      socket.data.roomId = roomId;
      socket.data.playerId = playerId;

      const joined = room.join(socket, playerId);
      if (!joined) {
        socket.emit('error', 'Cannot join game in progress');
      } else {
        logger(`[Socket] ${playerId} joined room ${roomId}`);
      }
    });

    socket.on('createGame', (data: CreateGameRequestPayload) => {
      const roomId = randomRoomId();
      const room = getOrCreateRoom(roomId);

      socket.data.roomId = roomId;
      socket.data.playerId = data.playerId;

      room.join(socket, data.playerId);
      room.start(data);
      socket.emit('roomCreated', { roomId });
      logger(`[Server] Game created in room ${roomId} by ${data.playerId}`);
    });

    socket.on('submitAction', (action: any) => {
      const roomId = socket.data.roomId;
      const playerId = socket.data.playerId;
      if (!roomId || !playerId) return;

      const room = rooms.get(roomId);
      if (room && room.isPlaying) {
        room.submitAction(playerId, action);
      }
    });

    socket.on('disconnect', () => {
      logger(`[Socket] Disconnected: ${socket.id}`);
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;
      room.leave(socket.id);
      if (room.playerSockets.size === 0) {
        logger(`[Server] Room ${roomId} empty, removing.`);
        rooms.delete(roomId);
      }
    });
  });

  const start = async (): Promise<number> =>
    new Promise((resolve, reject) => {
      const requestedPort = options?.port ?? 3001;
      httpServer.once('error', reject);
      httpServer.listen(requestedPort, () => {
        httpServer.off('error', reject);
        const address = httpServer.address();
        const boundPort =
          typeof address === 'object' && address !== null ? address.port : requestedPort;
        resolve(boundPort);
      });
    });

  const stop = async (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!httpServer.listening) {
        resolve();
        return;
      }
      io.close(() => {
        httpServer.close((error) => {
          if (error) {
            if (error.message.includes('not running')) {
              resolve();
              return;
            }
            reject(error);
            return;
          }
          resolve();
        });
      });
    });

  return {
    app,
    httpServer,
    io,
    start,
    stop,
  };
};
