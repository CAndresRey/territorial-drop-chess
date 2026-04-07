import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Room } from './Room';
import { CreateGameRequestPayload } from './setup';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const rooms = new Map<string, Room>();

// Helper to get or create a room
const getOrCreateRoom = (roomId: string): Room => {
  if (!rooms.has(roomId)) {
    console.log(`[Server] Created room: ${roomId}`);
    rooms.set(roomId, new Room(roomId, io));
  }
  return rooms.get(roomId)!;
};

app.get('/health', (req, res) => {
  res.send({ status: 'ok', roomsCount: rooms.size });
});

io.on('connection', (socket: Socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // When a player joins a lobby
  socket.on('joinRoom', (data: { roomId: string; playerId: string }) => {
    const { roomId, playerId } = data;
    const room = getOrCreateRoom(roomId);
    
    // Store metadata on socket
    socket.data.roomId = roomId;
    socket.data.playerId = playerId;

    const joined = room.join(socket, playerId);
    if (!joined) {
      socket.emit('error', 'Cannot join game in progress');
    } else {
      console.log(`[Socket] ${playerId} joined room ${roomId}`);
    }
  });

  // Create a new game
  socket.on('createGame', (data: CreateGameRequestPayload) => {
    const roomId = `room_${Math.random().toString(36).substring(7)}`;
    const room = getOrCreateRoom(roomId);
    
    socket.data.roomId = roomId;
    socket.data.playerId = data.playerId;

    room.join(socket, data.playerId);
    room.start(data);
    console.log(`[Server] Game created in room ${roomId} by ${data.playerId}`);
  });

  // Receive game action
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
    console.log(`[Socket] Disconnected: ${socket.id}`);
    const roomId = socket.data.roomId;
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.leave(socket.id);
        // Clean up empty rooms
        if (room.playerSockets.size === 0) {
          console.log(`[Server] Room ${roomId} empty, removing.`);
          rooms.delete(roomId);
        }
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
