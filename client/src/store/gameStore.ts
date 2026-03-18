import { create } from 'zustand';
import type { Piece, Position } from '@/types';

export type BattleOutcomeResult = 'attacker_wins' | 'defender_wins' | 'tie';

export interface BattleOutcome {
  attacker: Piece;
  defender: Piece;
  attackerPosition: Position;
  defenderPosition: Position;
  result: BattleOutcomeResult;
}

interface GameState {
  board: (Piece | null)[][];
  currentTurn: 'red' | 'blue';
  gameStatus: 'waiting' | 'deploying' | 'playing' | 'finished';
  selectedPiece: Position | null;
  deployedPieces: { red: number; blue: number };
  validMoves: Position[];
  playerReady: boolean;
  opponentReady: boolean;
  countdownSeconds: number | null;
  battleOutcome: BattleOutcome | null;
  setBoard: (board: (Piece | null)[][]) => void;
  selectPiece: (pos: Position | null) => void;
  setTurn: (turn: 'red' | 'blue') => void;
  setGameStatus: (status: GameState['gameStatus']) => void;
  deployPiece: (piece: Piece, pos: Position) => void;
  makeMove: (from: Position, to: Position) => void;
  setReady: () => void;
  setOpponentReady: (ready: boolean) => void;
  setCountdownSeconds: (seconds: number | null) => void;
  setBattleOutcome: (outcome: BattleOutcome | null) => void;
  clearBattleOutcome: () => void;
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
  validMoves: [],
  playerReady: false,
  opponentReady: false,
  countdownSeconds: null,
  battleOutcome: null,

  setBoard: (board) => set({ board }),

  selectPiece: (pos) =>
    set((state) => {
      if (!pos) return { selectedPiece: null, validMoves: [] };

      // Only allow selecting own pieces during own turn in playing phase
      if (state.gameStatus !== 'playing') return { selectedPiece: null, validMoves: [] };

      const piece = state.board[pos.row]?.[pos.col];
      if (!piece || piece.owner !== state.currentTurn) {
        return { selectedPiece: null, validMoves: [] };
      }

      // Compute valid moves (orthogonal, within bounds, not occupied by own piece)
      const moves: Position[] = [];
      const directions = [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 },
      ];
      for (const dir of directions) {
        const newRow = pos.row + dir.row;
        const newCol = pos.col + dir.col;
        if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 9) continue;
        const target = state.board[newRow][newCol];
        if (!target || target.owner !== state.currentTurn) {
          moves.push({ row: newRow, col: newCol });
        }
      }
      return { selectedPiece: pos, validMoves: moves };
    }),

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

  makeMove: (from, to) =>
    set((state) => {
      const newBoard = state.board.map((row) => [...row]);
      const piece = newBoard[from.row][from.col];
      if (!piece) return {};
      // Capture opponent piece if any
      const target = newBoard[to.row][to.col];
      newBoard[to.row][to.col] = piece;
      newBoard[from.row][from.col] = null;
      return {
        board: newBoard,
        selectedPiece: null,
        validMoves: [],
        currentTurn: state.currentTurn === 'red' ? 'blue' : 'red',
      };
    }),

  setReady: () => set({ playerReady: true }),

  setOpponentReady: (ready) => set({ opponentReady: ready }),

  setCountdownSeconds: (seconds) => set({ countdownSeconds: seconds }),

  setBattleOutcome: (outcome) => set({ battleOutcome: outcome }),

  clearBattleOutcome: () => set({ battleOutcome: null }),
}));
