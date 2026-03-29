import { Server, Socket } from 'socket.io';
import { customAlphabet } from 'nanoid';
import { rooms, publicRooms, addToPublicRooms, updatePublicRoom, removeFromPublicRooms } from '../rooms';
import type { Room, Player, Piece } from '../../types';
import { generateAutoDeploy } from '../../game/engine';
import { PIECE_CONFIG } from '../../types';

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
    console.log('[DEBUG] create-room received', { hostName, isBotMode, socketId: socket.id });
    const roomId = generateRoomCode().toUpperCase();

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
      rematchRequests: new Set<string>(),
      rematchTimeout: null,
    };

    rooms.set(roomId, room);
    socket.join(roomId);

    // Add to public room list
    addToPublicRooms(room);
    io.emit('rooms:list', Array.from(publicRooms.values()));

    socket.emit('room:created', {
      roomId,
      playerId: socket.id,
      playerSide: 'red',
      isBotGame: room.isBotGame,
    });

    console.log(`Room ${roomId} created by ${hostName} (${socket.id}), bot mode: ${room.isBotGame}`);

    // For bot games: add synthetic bot player, auto-deploy bot, start game
    if (room.isBotGame) {
      // Add synthetic bot player to room (needed by ready handler to find bot)
      const botPlayer: Player = { id: `bot-${roomId}`, name: 'Bot', side: 'blue' };
      room.players.push(botPlayer);

      // Bot auto-deploys: generate positions and emit piece:deployed for each piece
      const botPositions = generateAutoDeploy('blue');
      for (const [typeKey, position] of botPositions) {
        const pieceType = typeKey.replace(/-\d+$/, '');
        const config = PIECE_CONFIG.find((p) => p.type === pieceType);
        if (!config) continue;

        const piece: Piece = {
          id: `${typeKey}-bot-${Math.random().toString(36).slice(2, 8)}`,
          type: pieceType as Piece['type'],
          owner: 'blue',
          rank: config.rank as Piece['rank'],
          revealed: false,
        };

        room.board[position.row][position.col] = piece;
        room.deployedPieces.blue.add(piece.id);

        io.to(roomId).emit('piece:deployed', {
          piece,
          row: position.row,
          col: position.col,
          deployedCount: room.deployedPieces.blue.size,
          board: room.board,
          autoDeployComplete: room.deployedPieces.blue.size === 21,
        });
      }

      // Transition to deploying and emit game:started
      room.status = 'deploying';
      removeFromPublicRooms(roomId);
      io.emit('rooms:list', Array.from(publicRooms.values()));
      io.to(roomId).emit('game:started', {
        board: room.board,
        currentTurn: 'red',
        status: 'deploying',
      });

      console.log(`Bot game ${roomId}: bot auto-deployed, game started in deploying phase`);
    }
  });

  socket.on('get-rooms', () => {
    socket.emit('rooms:list', Array.from(publicRooms.values()));
  });

  socket.on('join-room', ({ roomId, playerName }: { roomId: string; playerName: string }) => {
    // Normalize room code to uppercase for consistent lookup
    const normalizedRoomId = roomId.trim().toUpperCase();
    const room = rooms.get(normalizedRoomId);

    if (!room) {
      socket.emit('error', { message: 'Room not found. Check the code and try again.' });
      return;
    }

    // Check if socket is already in this room (e.g., host rejoining)
    const existingPlayer = room.players.find(p => p.id === socket.id);
    if (existingPlayer) {
      // Already in room - just emit room:joined again with existing data
      socket.emit('room:joined', {
        roomId: normalizedRoomId,
        playerId: socket.id,
        playerSide: existingPlayer.side,
        isHost: socket.id === room.hostId,
      });
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
      isHost: false,
    });

    socket.to(roomId).emit('player:joined', { player });

    console.log(`${playerName} (${socket.id}) joined room ${roomId}`);

    // Trigger game:started when both players are present
    if (room.players.length === 2) {
      // Set room status to deploying before emitting game:started
      room.status = 'deploying';
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

    // Update public rooms
    updatePublicRoom(room);
    io.emit('rooms:list', Array.from(publicRooms.values()));
  });

  socket.on('join-room-by-id', ({ roomId, playerName }: { roomId: string; playerName: string }) => {
    console.log(`[SERVER] join-room-by-id received: ${playerName} -> ${roomId}, socket: ${socket.id}`);
    const normalizedRoomId = roomId.trim().toUpperCase();
    const room = rooms.get(normalizedRoomId);

    if (!room) {
      socket.emit('error', { message: 'Room not found.' });
      return;
    }

    // Check if socket is already in this room
    const existingPlayer = room.players.find(p => p.id === socket.id);
    if (existingPlayer) {
      socket.emit('room:joined', {
        roomId: normalizedRoomId,
        playerId: socket.id,
        playerSide: existingPlayer.side,
      });
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

    if (room.status !== 'waiting') {
      socket.emit('error', { message: 'Game already in progress.' });
      return;
    }

    const player: Player = {
      id: socket.id,
      name: playerName,
      side: 'blue',
    };

    room.players.push(player);
    socket.join(normalizedRoomId);

    socket.emit('room:joined', {
      roomId: normalizedRoomId,
      playerId: socket.id,
      playerSide: 'blue',
      isHost: false,
    });

    socket.to(normalizedRoomId).emit('player:joined', { player });

    // Update public rooms
    updatePublicRoom(room);
    io.emit('rooms:list', Array.from(publicRooms.values()));

    // Start game if now full
    if (room.players.length === 2) {
      room.status = 'deploying';
      removeFromPublicRooms(normalizedRoomId);
      io.emit('rooms:list', Array.from(publicRooms.values()));
      io.to(normalizedRoomId).emit('game:started', {
        board: room.board,
        currentTurn: 'red',
        status: 'deploying',
      });
    }
  });

  socket.on('add-bot', ({ roomId }: { roomId?: string }) => {
    // If roomId provided, use that; otherwise find the room where socket is host
    let targetRoomId = roomId;
    
    if (!targetRoomId) {
      // Find room where socket is host
      for (const [id, room] of rooms.entries()) {
        if (room.hostId === socket.id && room.status === 'waiting') {
          targetRoomId = id;
          break;
        }
      }
    }

    if (!targetRoomId) {
      socket.emit('error', { message: 'No room found.' });
      return;
    }

    const room = rooms.get(targetRoomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found.' });
      return;
    }

    if (room.hostId !== socket.id) {
      socket.emit('error', { message: 'You are not the host.' });
      return;
    }

    if (room.status !== 'waiting') {
      socket.emit('error', { message: 'Game already in progress.' });
      return;
    }

    if (room.players.length >= 2 || room.isBotGame) {
      socket.emit('error', { message: 'Room is already full.' });
      return;
    }

    // Add synthetic bot player
    const botPlayer: Player = { id: `bot-${targetRoomId}`, name: 'Bot', side: 'blue' };
    room.players.push(botPlayer);
    room.isBotGame = true;
    room.botSide = 'blue';

    // Update public rooms
    updatePublicRoom(room);
    removeFromPublicRooms(targetRoomId);
    io.emit('rooms:list', Array.from(publicRooms.values()));

    // Auto-start game for PVB
    room.status = 'deploying';

    // Bot auto-deploy (reusing existing function)
    const botPositions = generateAutoDeploy('blue');
    for (const [typeKey, position] of botPositions) {
      const pieceType = typeKey.replace(/-\d+$/, '');
      const config = PIECE_CONFIG.find((p) => p.type === pieceType);
      if (!config) continue;

      const piece: Piece = {
        id: `${typeKey}-bot-${Math.random().toString(36).slice(2, 8)}`,
        type: pieceType as Piece['type'],
        owner: 'blue',
        rank: config.rank as Piece['rank'],
        revealed: false,
      };

      room.board[position.row][position.col] = piece;
      room.deployedPieces.blue.add(piece.id);

      io.to(targetRoomId).emit('piece:deployed', {
        piece,
        row: position.row,
        col: position.col,
        deployedCount: room.deployedPieces.blue.size,
        board: room.board,
        autoDeployComplete: room.deployedPieces.blue.size === 21,
      });
    }

    io.to(targetRoomId).emit('game:started', {
      board: room.board,
      currentTurn: 'red',
      status: 'deploying',
    });

    console.log(`Host ${socket.id} added bot to room ${targetRoomId}`);
  });

  socket.on('start-game', () => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.hostId === socket.id && room.players.length === 2 && room.status === 'waiting') {
        room.status = 'deploying';

        // Remove from public list
        removeFromPublicRooms(roomId);
        io.emit('rooms:list', Array.from(publicRooms.values()));

        io.to(roomId).emit('game:started', {
          board: room.board,
          currentTurn: 'red',
          status: 'deploying',
        });

        console.log(`Host ${socket.id} started game in room ${roomId}`);
        break;
      }
    }
  });

  socket.on('leave-room', () => {
    // Find which room this socket is in
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.some((p) => p.id === socket.id)) {
        const player = room.players.find((p) => p.id === socket.id);
        room.players = room.players.filter((p) => p.id !== socket.id);
        socket.leave(roomId);

        // Update public rooms if room still exists
        if (room) {
          if (room.players.length === 0) {
            removeFromPublicRooms(roomId);
          } else {
            updatePublicRoom(room);
          }
          io.emit('rooms:list', Array.from(publicRooms.values()));
        }

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
