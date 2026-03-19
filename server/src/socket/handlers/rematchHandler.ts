import { Server, Socket } from 'socket.io';
import { rooms } from '../rooms';
import type { Room, Piece } from '../../types';

// Extend Room interface for rematch state (in-memory only, not persisted)
declare module '../../types' {
  interface Room {
    rematchRequests: Set<string>;
    rematchTimeout: NodeJS.Timeout | null;
  }
}

function createEmptyBoard(): (Piece | null)[][] {
  return Array(8).fill(null).map(() => Array(9).fill(null));
}

export function rematchHandler(io: Server, socket: Socket) {
  /**
   * rematch — player requests a rematch after game ends.
   * Both players must confirm. First request starts 30s timeout.
   * Both confirmed = reset room for fresh deployment.
   */
  socket.on('rematch', () => {
    let room: Room | undefined;
    let roomId: string | undefined;
    for (const [id, r] of rooms.entries()) {
      if (r.players.some((p) => p.id === socket.id)) {
        room = r;
        roomId = id;
        break;
      }
    }

    if (!room || !roomId) return;

    // Initialize rematch state if not present
    if (!room.rematchRequests) {
      room.rematchRequests = new Set<string>();
    }

    room.rematchRequests.add(socket.id);
    const bothReady = room.rematchRequests.size >= 2;
    io.to(roomId).emit('rematch:ready', { bothReady });

    // For bot games: auto-confirm rematch on bot side
    if (room.isBotGame && room.rematchRequests.size === 1) {
      const humanPlayer = room.players.find((p) => p.id === socket.id);
      const botPlayer = room.players.find((p) => p.side !== humanPlayer?.side);
      if (botPlayer && !room.rematchRequests.has(botPlayer.id)) {
        room.rematchRequests.add(botPlayer.id);
        io.to(roomId).emit('rematch:ready', { bothReady: true });
      }
    }

    // Start 30s timeout on first rematch request
    if (room.rematchRequests.size === 1 && !room.rematchTimeout) {
      room.rematchTimeout = setTimeout(() => {
        if (room.rematchRequests && room.rematchRequests.size < 2) {
          room.rematchRequests.clear();
          io.to(roomId!).emit('rematch:ready', { bothReady: false });
          io.to(roomId!).emit('rematch:timeout', {});
        }
      }, 30000);
    }

    // Both confirmed — start fresh deployment
    if (room.rematchRequests.size >= 2) {
      if (room.rematchTimeout) {
        clearTimeout(room.rematchTimeout);
        room.rematchTimeout = null;
      }

      // Reset room for fresh deployment — scores persist
      room.board = createEmptyBoard();
      room.status = 'deploying';
      room.currentTurn = 'red';
      room.deployedPieces = { red: new Set<string>(), blue: new Set<string>() };
      room.readyPlayers = new Set<string>();
      room.rematchRequests.clear();

      io.to(roomId!).emit('rematch:confirmed', {
        board: room.board,
        scores: room.scores,
      });

      // For bot games: trigger bot auto-deploy
      if (room.isBotGame && room.botSide) {
        const botPlayer = room.players.find((p) => p.side === room.botSide);
        if (botPlayer) {
          setTimeout(() => {
            io.to(roomId!).emit('bot:auto-deploy', {});
          }, 500);
        }
      }

      console.log(`Rematch started in room ${roomId}`);
    }
  });

  /**
   * reset-scores — host resets session scores to zero.
   * Only the host can call this.
   */
  socket.on('reset-scores', () => {
    let room: Room | undefined;
    let roomId: string | undefined;
    for (const [id, r] of rooms.entries()) {
      if (r.players.some((p) => p.id === socket.id)) {
        room = r;
        roomId = id;
        break;
      }
    }

    if (!room || !roomId) return;

    if (room.hostId !== socket.id) {
      socket.emit('error', { message: 'Only the host can reset scores' });
      return;
    }

    room.scores = { red: 0, blue: 0, draws: 0, gamesPlayed: 0 };
    io.to(roomId).emit('scores:update', { scores: room.scores });
    console.log(`Scores reset in room ${roomId}`);
  });
}
