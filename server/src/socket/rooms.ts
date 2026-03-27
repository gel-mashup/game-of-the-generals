import type { Room, PublicRoom } from '../types';

export const rooms = new Map<string, Room>();
export const publicRooms = new Map<string, PublicRoom>();

export function addToPublicRooms(room: Room): void {
  const hostName = room.players.find(p => p.id === room.hostId)?.name || 'Unknown';
  publicRooms.set(room.id, {
    roomId: room.id,
    hostName,
    playerCount: room.players.length,
    isFull: room.players.length >= 2,
    isBotGame: room.isBotGame,
    status: room.status,
  });
}

export function updatePublicRoom(room: Room): void {
  const existing = publicRooms.get(room.id);
  if (!existing) return;
  
  publicRooms.set(room.id, {
    ...existing,
    playerCount: room.players.length,
    isFull: room.players.length >= 2,
    status: room.status,
  });
}

export function removeFromPublicRooms(roomId: string): void {
  publicRooms.delete(roomId);
}
