import { Server } from 'socket.io';
import { roomHandler } from './handlers/roomHandler';

export function setupSocket(io: Server) {
  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    roomHandler(io, socket);

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
    });
  });
}
