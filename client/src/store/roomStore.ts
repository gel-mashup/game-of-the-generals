import { create } from 'zustand';
import type { Player, PublicRoom } from '@/types';

interface RoomState {
  roomId: string | null;
  playerId: string | null;
  playerSide: 'red' | 'blue' | null;
  players: Player[];
  isHost: boolean;
  isBotGame: boolean;
  scores: { red: number; blue: number; draws: number; gamesPlayed: number };
  opponentWantsRematch: boolean;
  iWantRematch: boolean;
  setRoom: (
    roomId: string,
    playerId: string,
    playerSide: 'red' | 'blue',
    isHost: boolean,
    isBotGame?: boolean
  ) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  clearRoom: () => void;
  setScores: (scores: { red: number; blue: number; draws: number; gamesPlayed: number }) => void;
  setOpponentWantsRematch: (value: boolean) => void;
  setIWantRematch: (value: boolean) => void;
  rooms: PublicRoom[];
  setRooms: (rooms: PublicRoom[]) => void;
  updateRoom: (room: PublicRoom) => void;
  removeRoom: (roomId: string) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  playerId: null,
  playerSide: null,
  players: [],
  isHost: false,
  isBotGame: false,

  scores: { red: 0, blue: 0, draws: 0, gamesPlayed: 0 },
  opponentWantsRematch: false,
  iWantRematch: false,

  setRoom: (roomId, playerId, playerSide, isHost, isBotGame = false) =>
    set({ roomId, playerId, playerSide, isHost, isBotGame }),

  addPlayer: (player) =>
    set((state) => ({
      players: state.players.some((p) => p.id === player.id)
        ? state.players
        : [...state.players, player],
    })),

  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    })),

  clearRoom: () =>
    set({
      roomId: null,
      playerId: null,
      playerSide: null,
      players: [],
      isHost: false,
      isBotGame: false,
      scores: { red: 0, blue: 0, draws: 0, gamesPlayed: 0 },
      opponentWantsRematch: false,
      iWantRematch: false,
    }),

  setScores: (scores) => set({ scores }),

  setOpponentWantsRematch: (value) => set({ opponentWantsRematch: value }),

  setIWantRematch: (value) => set({ iWantRematch: value }),

  rooms: [],

  setRooms: (rooms) => set({ rooms }),

  updateRoom: (room) =>
    set((state) => {
      const index = state.rooms.findIndex((r) => r.roomId === room.roomId);
      if (index === -1) return state;
      const newRooms = [...state.rooms];
      newRooms[index] = room;
      return { rooms: newRooms };
    }),

  removeRoom: (roomId) =>
    set((state) => ({
      rooms: state.rooms.filter((r) => r.roomId !== roomId),
    })),
}));
