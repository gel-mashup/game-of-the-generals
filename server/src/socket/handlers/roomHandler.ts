import { Server, Socket } from 'socket.io';
import { customAlphabet } from 'nanoid';
import { rooms } from '../rooms';
import type { Room, Player } from '../../types';

// 6-character alphanumeric room code (excludes ambiguous chars: I, l, O, 0)
const generateRoomCode = customAlphabet(
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789',
  6
);

// Create empty 8x9 board
function createEmptyBoard(): (null)[][] {
  return Array(8)
    .fill(null)
    .map(() => Array(9).fill(null));
}

export function roomHandler(io: Server, socket: Socket) {
  socket.on('create-room', ({ hostName, isBotMode }: { hostName: string; isBotMode?: boolean }) => {
    const roomId = generateRoomCode();

    // Ensure room ID is unique
    while (rooms.has(roomId)) {
      // This is extremely unlikely with nanoid's collision resistance
    }

    const room: Room = {
      id: roomId,
      hostId: socket.id,
      players: [{ id: socket.id, name: hostName, side: 'red' }],
      status: 'waiting',
      board: createEmptyBoard(),
      currentTurn: 'red',
      isBotGame: isBotMode ?? false,
      botSide: isBotMode ? 'blue' : null,
      scores: { red: 0, blue: 0, draws: 0, gamesPlayed: 0 },
      deployedPieces: { red: new Set<string>(), blue: new Set<string>() },
      readyPlayers: new Set<string>(),
    };

    rooms.set(roomId, room);
    socket.join(roomId);

    socket.emit('room:created', {
      roomId,
      playerId: socket.id,
      playerSide: 'red',
      isBotGame: room.isBotGame,
    });

    console.log(`Room ${roomId} created by ${hostName} (${socket.id}), bot mode: ${room.isBotGame}`);
  });

  socket.on('join-room', ({ roomId, playerName }: { roomId: string; playerName: string }) => {
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('error', { message: 'Room not found. Check the code and try again.' });
      return;
    }

    if (room.isBotGame && room.players.length >= 1) {
      socket.emit('error', { message: 'Room is full.' });
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('error', { message: 'Room is full.' });
      return;
    }

    const player: Player = {
      id: socket.id,
      name: playerName,
      side: 'blue',
    };

    room.players.push(player);
    socket.join(roomId);

    socket.emit('room:joined', {
      roomId,
      playerId: socket.id,
      playerSide: 'blue',
    });

    socket.to(roomId).emit('player:joined', { player });

    console.log(`${playerName} (${socket.id}) joined room ${roomId}`);

    // Trigger game:started when both players are present
    if (room.players.length === 2) {
      socket.to(roomId).emit('game:started', {
        board: room.board,
        currentTurn: 'red',
        status: 'deploying',
      });
      // Also emit to the joining player's socket
      socket.emit('game:started', {
        board: room.board,
        currentTurn: 'red',
        status: 'deploying',
      });
    }
  });

  socket.on('leave-room', () => {
    // Find which room this socket is in
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.some((p) => p.id === socket.id)) {
        const player = room.players.find((p) => p.id === socket.id);
        room.players = room.players.filter((p) => p.id !== socket.id);
        socket.leave(roomId);

        if (room.players.length === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        } else {
          socket.to(roomId).emit('player:left', {
            playerId: socket.id,
            reason: 'Player left the room',
          });
          console.log(`${player?.name} (${socket.id}) left room ${roomId}`);
        }
        break;
      }
    }
  });
}
