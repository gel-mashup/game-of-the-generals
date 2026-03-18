import { create } from 'zustand';
import type { Player } from '@/types';

interface RoomState {
  roomId: string | null;
  playerId: string | null;
  playerSide: 'red' | 'blue' | null;
  players: Player[];
  isHost: boolean;
  isBotGame: boolean;
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
}

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  playerId: null,
  playerSide: null,
  players: [],
  isHost: false,
  isBotGame: false,

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
    }),
}));
