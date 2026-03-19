import { Piece, Position } from '../types';
import { Room } from '../types';

export interface Move {
  from: Position;
  to: Position;
}

export interface UndoInfo {
  from: Position;
  to: Position;
  captured: Piece | null;
}

export function makeMove(board: (Piece | null)[][], from: Position, to: Position): UndoInfo {
  throw new Error('Not implemented');
}

export function unmakeMove(board: (Piece | null)[][], undo: UndoInfo): void {
  throw new Error('Not implemented');
}

export function orderMoves(moves: Move[], board: (Piece | null)[][]): Move[] {
  throw new Error('Not implemented');
}

export function getAllMovesForPlayer(board: (Piece | null)[][], playerSide: 'red' | 'blue'): Move[] {
  throw new Error('Not implemented');
}

export function evaluateBoard(board: (Piece | null)[][], botSide: 'red' | 'blue'): number {
  throw new Error('Not implemented');
}

export function findBestMove(
  board: (Piece | null)[][],
  botSide: 'red' | 'blue',
  maxTimeMs?: number
): Move | null {
  throw new Error('Not implemented');
}
