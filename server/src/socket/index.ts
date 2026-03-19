import { Server } from 'socket.io';
import { roomHandler } from './handlers/roomHandler';
import { gameHandler } from './handlers/gameHandler';
import { rematchHandler } from './handlers/rematchHandler';
import { rooms } from './rooms';

export function setupSocket(io: Server) {
  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    roomHandler(io, socket);
    gameHandler(io, socket);
    rematchHandler(io, socket);

    socket.on('disconnect', () => {
      // Find room and clear rematch timeout if present
      for (const [, r] of rooms.entries()) {
        if (r.players.some((p) => p.id === socket.id)) {
          if (r.rematchTimeout) {
            clearTimeout(r.rematchTimeout);
            r.rematchTimeout = null;
          }
          break;
        }
      }
      console.log(`Player disconnected: ${socket.id}`);
    });
  });
}
