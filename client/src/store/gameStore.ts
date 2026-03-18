import { create } from 'zustand';
import type { Piece, Position } from '@/types';

interface GameState {
  board: (Piece | null)[][];
  currentTurn: 'red' | 'blue';
  gameStatus: 'waiting' | 'deploying' | 'playing' | 'finished';
  selectedPiece: Position | null;
  deployedPieces: { red: number; blue: number };
  setBoard: (board: (Piece | null)[][]) => void;
  selectPiece: (pos: Position | null) => void;
  setTurn: (turn: 'red' | 'blue') => void;
  setGameStatus: (status: GameState['gameStatus']) => void;
  deployPiece: (piece: Piece, pos: Position) => void;
}

function createEmptyBoard(): (Piece | null)[][] {
  return Array(8)
    .fill(null)
    .map(() =>
      Array(9)
        .fill(null)
        .map(() => null)
    );
}

export const useGameStore = create<GameState>((set) => ({
  board: createEmptyBoard(),
  currentTurn: 'red',
  gameStatus: 'waiting',
  selectedPiece: null,
  deployedPieces: { red: 0, blue: 0 },

  setBoard: (board) => set({ board }),

  selectPiece: (pos) => set({ selectedPiece: pos }),

  setTurn: (turn) => set({ currentTurn: turn }),

  setGameStatus: (status) => set({ gameStatus: status }),

  deployPiece: (piece, pos) =>
    set((state) => {
      const newBoard = state.board.map((row) => [...row]);
      newBoard[pos.row][pos.col] = piece;
      const newDeployed = { ...state.deployedPieces };
      newDeployed[piece.owner]++;
      return { board: newBoard, deployedPieces: newDeployed };
    }),
}));
