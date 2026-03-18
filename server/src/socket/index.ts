import { Server } from 'socket.io';
import { roomHandler } from './handlers/roomHandler';
import { gameHandler } from './handlers/gameHandler';

export function setupSocket(io: Server) {
  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    roomHandler(io, socket);
    gameHandler(io, socket);

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
    });
  });
}
