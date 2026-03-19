import { Server, Socket } from 'socket.io';
import { rooms } from '../rooms';
import type { Room, Player, Piece } from '../../types';
import { generateAutoDeploy } from '../../game/engine';
import { PIECE_CONFIG } from '../../types';

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
    console.log(`Rematch requested by ${socket.id}`);
    let room: Room | undefined;
    let roomId: string | undefined;
    for (const [id, r] of rooms.entries()) {
      if (r.players.some((p) => p.id === socket.id)) {
        room = r;
        roomId = id;
        break;
      }
    }

    if (!room || !roomId) {
      console.log(`Rematch: no room found for socket ${socket.id}`);
      return;
    }

    console.log(`Rematch: room ${roomId}, isBot=${room.isBotGame}, requests=${room.rematchRequests?.size ?? 0}, botSide=${room.botSide}`);

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
        console.log(`Rematch: bot auto-confirmed, total requests=${room.rematchRequests.size}`);
        io.to(roomId).emit('rematch:ready', { bothReady: true });
      } else {
        console.log(`Rematch: bot player not found or already confirmed. botPlayer=${botPlayer?.id}, has=${room.rematchRequests.has(botPlayer?.id ?? '')}`);
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

      // For bot games: deploy bot pieces server-side directly
      if (room.isBotGame && room.botSide) {
        const botPositions = generateAutoDeploy(room.botSide);
        for (const [typeKey, position] of botPositions) {
          const pieceType = typeKey.replace(/-\d+$/, '');
          const config = PIECE_CONFIG.find((p) => p.type === pieceType);
          if (!config) continue;

          const piece: Piece = {
            id: `${typeKey}-bot-${Math.random().toString(36).slice(2, 8)}`,
            type: pieceType as Piece['type'],
            owner: room.botSide,
            rank: config.rank as Piece['rank'],
            revealed: false,
          };

          room.board[position.row][position.col] = piece;
          room.deployedPieces[room.botSide].add(piece.id);

          io.to(roomId!).emit('piece:deployed', {
            piece,
            row: position.row,
            col: position.col,
            deployedCount: room.deployedPieces[room.botSide].size,
            board: room.board,
            autoDeployComplete: room.deployedPieces[room.botSide].size === 21,
          });
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
