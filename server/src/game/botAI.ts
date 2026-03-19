import { Piece, Position, Room } from '../types';
import { getValidMoves, resolveBattle, checkWinCondition } from './engine';

export interface Move {
  from: Position;
  to: Position;
}

export interface UndoInfo {
  from: Position;
  to: Position;
  captured: Piece | null;
}

const FLAG_VALUE = 100;
const MOBILITY_BONUS = 2; // per valid move
const WIN_BONUS = 10000;
const LOSS_PENALTY = -10000;
const MAX_DEPTH = 3;
const MAX_TIME_MS = 3000;

/**
 * Apply a move to the board in-place. Returns undo information.
 */
export function makeMove(board: (Piece | null)[][], from: Position, to: Position): UndoInfo {
  const piece = board[from.row][from.col]!;
  const captured = board[to.row][to.col];
  board[to.row][to.col] = piece;
  board[from.row][from.col] = null;
  return { from, to, captured };
}

/**
 * Reverse a move using undo information.
 */
export function unmakeMove(board: (Piece | null)[][], undo: UndoInfo): void {
  const piece = board[undo.to.row][undo.to.col]!;
  board[undo.from.row][undo.from.col] = piece;
  board[undo.to.row][undo.to.col] = undo.captured;
}

/**
 * Sort moves so captures come first (helps alpha-beta pruning).
 */
export function orderMoves(moves: Move[], board: (Piece | null)[][]): Move[] {
  return [...moves].sort((a, b) => {
    const aCaptures = board[a.to.row][a.to.col] !== null;
    const bCaptures = board[b.to.row][b.to.col] !== null;
    if (aCaptures && !bCaptures) return -1;
    if (!aCaptures && bCaptures) return 1;
    return 0;
  });
}

/**
 * Collect all valid moves for a player.
 * Flags are excluded — they cannot move.
 */
export function getAllMovesForPlayer(board: (Piece | null)[][], playerSide: 'red' | 'blue'): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece?.owner !== playerSide) continue;
      if (piece.type === 'flag') continue;
      const destinations = getValidMoves(board, piece);
      for (const dest of destinations) {
        moves.push({ from: { row: r, col: c }, to: dest });
      }
    }
  }
  return moves;
}

/**
 * Evaluate board from bot's perspective.
 * Higher score = better for bot.
 */
export function evaluateBoard(board: (Piece | null)[][], botSide: 'red' | 'blue'): number {
  const rankValue: Record<number, number> = {
    11: 11, 10: 10, 9: 9, 8: 8, 7: 7, 6: 6, 5: 5, 4: 4, 3: 3, 2: 2, 1: 1, 0: 0,
    [-1]: 1,   // private: conservative unknown value
    [-2]: 0.5, // spy
    [-3]: 0,   // flag: not material
  };

  let botMaterial = 0;
  let oppMaterial = 0;
  let botMobility = 0;
  let oppMobility = 0;
  const opponent = botSide === 'blue' ? 'red' : 'blue';

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const value = rankValue[piece.rank] ?? 1;

      if (piece.owner === botSide) {
        botMaterial += value;
        if (piece.type !== 'flag') {
          botMobility += getValidMoves(board, piece).length;
        }
      } else {
        // Unknown enemy pieces: count conservatively (private=1)
        oppMaterial += piece.revealed ? value : 1;
        if (piece.type !== 'flag') {
          oppMobility += getValidMoves(board, piece).length;
        }
      }
    }
  }

  let score = botMaterial - oppMaterial;
  score += (botMobility - oppMobility) * MOBILITY_BONUS;
  return score;
}

/**
 * Alpha-beta pruning search.
 */
function alphaBeta(
  board: (Piece | null)[][],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  currentPlayer: 'red' | 'blue',
  botSide: 'red' | 'blue',
  startTime: number,
  maxTime: number
): number {
  // Time check at recursion start
  if (Date.now() - startTime >= maxTime) {
    return isMaximizing ? -Infinity : Infinity;
  }

  // Terminal depth
  if (depth === 0) {
    const tempRoom: Room = {
      board,
      players: [],
      status: 'playing',
      id: 'T',
      hostId: '',
      currentTurn: currentPlayer,
      isBotGame: false,
      botSide: null,
      scores: { red: 0, blue: 0, draws: 0, gamesPlayed: 0 },
      deployedPieces: { red: new Set<string>(), blue: new Set<string>() },
      readyPlayers: new Set<string>(),
      rematchRequests: new Set<string>(),
      rematchTimeout: null,
    };
    const win = checkWinCondition(tempRoom);
    if (win.gameOver) {
      return win.winner === botSide ? WIN_BONUS : win.winner === null ? 0 : LOSS_PENALTY;
    }
    return isMaximizing ? evaluateBoard(board, botSide) : -evaluateBoard(board, botSide);
  }

  const moves = getAllMovesForPlayer(board, currentPlayer);
  if (moves.length === 0) {
    const tempRoom: Room = {
      board,
      players: [],
      status: 'playing',
      id: 'T',
      hostId: '',
      currentTurn: currentPlayer,
      isBotGame: false,
      botSide: null,
      scores: { red: 0, blue: 0, draws: 0, gamesPlayed: 0 },
      deployedPieces: { red: new Set<string>(), blue: new Set<string>() },
      readyPlayers: new Set<string>(),
      rematchRequests: new Set<string>(),
      rematchTimeout: null,
    };
    const win = checkWinCondition(tempRoom);
    if (win.gameOver) {
      return win.winner === botSide ? WIN_BONUS : LOSS_PENALTY;
    }
    return isMaximizing ? -evaluateBoard(board, botSide) : evaluateBoard(board, botSide);
  }

  const ordered = orderMoves(moves, board);
  const nextPlayer = currentPlayer === 'red' ? 'blue' : 'red';

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of ordered) {
      if (Date.now() - startTime >= maxTime) break;
      const undo = makeMove(board, move.from, move.to);
      // Apply battle outcome
      const target = board[move.to.row][move.to.col];
      if (target && target.owner !== botSide) {
        const attacker = board[move.to.row][move.to.col]!;
        const defender = board[undo.from.row][undo.from.col]!;
        const outcome = resolveBattle(attacker, defender);
        // Remove captured pieces from board
        for (const id of outcome.capturedPieceIds) {
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 9; c++) {
              if (board[r][c]?.id === id) board[r][c] = null;
            }
          }
        }
      }
      const eval_ = alphaBeta(board, depth - 1, alpha, beta, false, nextPlayer, botSide, startTime, maxTime);
      unmakeMove(board, undo);
      if (eval_ > maxEval) maxEval = eval_;
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of ordered) {
      if (Date.now() - startTime >= maxTime) break;
      const undo = makeMove(board, move.from, move.to);
      const eval_ = alphaBeta(board, depth - 1, alpha, beta, true, nextPlayer, botSide, startTime, maxTime);
      unmakeMove(board, undo);
      if (eval_ < minEval) minEval = eval_;
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minEval;
  }
}

/**
 * Find the best move for the bot using iterative deepening.
 * Iterates depth 1→3, respecting maxTimeMs.
 */
export function findBestMove(
  board: (Piece | null)[][],
  botSide: 'red' | 'blue',
  maxTimeMs: number = MAX_TIME_MS
): Move | null {
  const startTime = Date.now();
  const opponent = botSide === 'red' ? 'blue' : 'red';
  let bestMove: Move | null = null;
  let bestScore = -Infinity;

  for (let depth = 1; depth <= MAX_DEPTH; depth++) {
    if (Date.now() - startTime >= maxTimeMs) break;

    const moves = getAllMovesForPlayer(board, botSide);
    if (moves.length === 0) return null;

    const ordered = orderMoves(moves, board);

    for (const move of ordered) {
      if (Date.now() - startTime >= maxTimeMs) break;

      const undo = makeMove(board, move.from, move.to);
      // Apply battle outcome for this move
      const target = board[move.to.row][move.to.col];
      if (target && target.owner !== botSide) {
        const attacker = board[move.to.row][move.to.col]!;
        const defender = board[undo.from.row][undo.from.col]!;
        const outcome = resolveBattle(attacker, defender);
        for (const id of outcome.capturedPieceIds) {
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 9; c++) {
              if (board[r][c]?.id === id) board[r][c] = null;
            }
          }
        }
      }
      const score = alphaBeta(board, depth - 1, -Infinity, Infinity, false, opponent, botSide, startTime, maxTimeMs);
      unmakeMove(board, undo);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  return bestMove;
}
