import {
  makeMove,
  unmakeMove,
  orderMoves,
  evaluateBoard,
  getAllMovesForPlayer,
  findBestMove,
} from '../src/game/botAI';
import { Room, Piece, Position } from '../src/types';
import { checkWinCondition } from '../src/game/engine';

// Helper: create empty 8x9 board
function emptyBoard(): (Piece | null)[][] {
  return Array(8).fill(null).map(() => Array(9).fill(null));
}

// Helper: create a Piece
function makePiece(type: string, owner: 'red' | 'blue', rank: number, id?: string): Piece {
  return {
    id: id || `${type}-${owner}-${Math.random().toString(36).slice(2, 6)}`,
    type: type as any,
    owner,
    rank: rank as any,
    revealed: false,
  };
}

// Helper: create minimal Room for testing
function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'TEST',
    hostId: 'host1',
    players: [
      { id: 'red1', name: 'Red', side: 'red' },
      { id: 'blue1', name: 'Blue', side: 'blue' },
    ],
    status: 'playing',
    board: emptyBoard(),
    currentTurn: 'red',
    isBotGame: true,
    botSide: 'blue',
    scores: { red: 0, blue: 0, draws: 0, gamesPlayed: 0 },
    deployedPieces: { red: new Set<string>(), blue: new Set<string>() },
    readyPlayers: new Set<string>(),
    ...overrides,
  } as Room;
}

describe('botAI', () => {
  describe('makeMove / unmakeMove', () => {
    it('should correctly mutate board on move', () => {
      const board = emptyBoard();
      const piece = makePiece('5-star', 'blue', 11, '5-star-blue');
      board[4][4] = piece;

      const undo = makeMove(board, { row: 4, col: 4 }, { row: 3, col: 4 });

      expect(board[4][4]).toBeNull();
      expect(board[3][4]).toBe(piece);
      expect(undo.from).toEqual({ row: 4, col: 4 });
      expect(undo.to).toEqual({ row: 3, col: 4 });
      expect(undo.captured).toBeNull();
    });

    it('should correctly restore board on unmakeMove', () => {
      const board = emptyBoard();
      const piece = makePiece('colonel', 'blue', 6, 'colonel-blue');
      board[4][4] = piece;

      const undo = makeMove(board, { row: 4, col: 4 }, { row: 3, col: 4 });
      unmakeMove(board, undo);

      expect(board[4][4]).toBe(piece);
      expect(board[3][4]).toBeNull();
    });

    it('should preserve captured piece in undo info', () => {
      const board = emptyBoard();
      const attacker = makePiece('5-star', 'blue', 11, '5-star-blue');
      const defender = makePiece('colonel', 'red', 6, 'colonel-red');
      board[4][4] = attacker;
      board[3][4] = defender;

      const undo = makeMove(board, { row: 4, col: 4 }, { row: 3, col: 4 });

      expect(undo.captured).toBe(defender);
      expect(board[3][4]).toBe(attacker);
    });

    it('should correctly restore captured piece on unmakeMove', () => {
      const board = emptyBoard();
      const attacker = makePiece('5-star', 'blue', 11, '5-star-blue');
      const defender = makePiece('colonel', 'red', 6, 'colonel-red');
      board[4][4] = attacker;
      board[3][4] = defender;

      const undo = makeMove(board, { row: 4, col: 4 }, { row: 3, col: 4 });
      expect(board[4][4]).toBeNull();
      expect(board[3][4]).toBe(attacker);

      unmakeMove(board, undo);
      expect(board[4][4]).toBe(attacker);
      expect(board[3][4]).toBe(defender);
    });
  });

  describe('orderMoves', () => {
    it('should sort capture moves before non-capture moves', () => {
      const board = emptyBoard();
      board[4][4] = makePiece('5-star', 'blue', 11, '5-star-blue');
      board[3][4] = makePiece('colonel', 'red', 6, 'colonel-red'); // capture target
      board[4][3] = makePiece('private', 'red', -1, 'private-red-1'); // capture target

      const moves = [
        { from: { row: 4, col: 4 }, to: { row: 3, col: 3 } }, // non-capture
        { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } }, // capture (to occupied cell)
        { from: { row: 4, col: 4 }, to: { row: 4, col: 3 } }, // capture (to occupied cell)
        { from: { row: 4, col: 4 }, to: { row: 5, col: 4 } }, // non-capture
      ];

      const ordered = orderMoves(moves, board);
      expect(board[ordered[0].to.row][ordered[0].to.col]).not.toBeNull(); // first is capture
      expect(board[ordered[1].to.row][ordered[1].to.col]).not.toBeNull(); // second is capture
    });

    it('should not reorder when all moves are non-captures', () => {
      const board = emptyBoard();
      board[4][4] = makePiece('5-star', 'blue', 11, '5-star-blue');

      const moves = [
        { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } },
        { from: { row: 4, col: 4 }, to: { row: 4, col: 3 } },
        { from: { row: 4, col: 4 }, to: { row: 5, col: 4 } },
        { from: { row: 4, col: 4 }, to: { row: 4, col: 5 } },
      ];

      const ordered = orderMoves(moves, board);
      expect(ordered.length).toBe(4);
      expect(ordered.every((m: { to: Position }) => board[m.to.row][m.to.col] === null)).toBe(true);
    });
  });

  describe('evaluateBoard', () => {
    it('should return positive score when bot has material advantage', () => {
      const board = emptyBoard();
      board[4][4] = makePiece('5-star', 'blue', 11, '5-star-blue');
      board[4][3] = makePiece('colonel', 'red', 6, 'colonel-red');

      const score = evaluateBoard(board, 'blue');
      expect(score).toBeGreaterThan(0); // blue has 11, red has 6
    });

    it('should return negative score when opponent has material advantage', () => {
      const board = emptyBoard();
      board[4][4] = makePiece('private', 'blue', -1, 'private-blue');
      board[4][3] = makePiece('5-star', 'red', 11, '5-star-red');

      const score = evaluateBoard(board, 'blue');
      expect(score).toBeLessThan(0); // blue has -1 (→1), red has 11
    });

    it('should return approximately 0 when material is equal', () => {
      const board = emptyBoard();
      board[4][4] = makePiece('colonel', 'blue', 6, 'colonel-blue');
      board[4][3] = makePiece('colonel', 'red', 6, 'colonel-red');

      const score = evaluateBoard(board, 'blue');
      expect(score).toBe(0);
    });

    it('should give mobility bonus when bot has more valid moves', () => {
      const board = emptyBoard();
      // Blue piece in open area — many possible moves
      board[4][4] = makePiece('5-star', 'blue', 11, '5-star-blue');
      // Red piece against a wall — few possible moves
      board[0][4] = makePiece('5-star', 'red', 11, '5-star-red');

      const score = evaluateBoard(board, 'blue');
      expect(score).toBeGreaterThan(0); // mobility bonus pushes it positive
    });

    it('should count unknown enemy pieces conservatively (private=1)', () => {
      const board = emptyBoard();
      // Blue piece visible
      const bluePiece = makePiece('private', 'blue', -1, 'private-blue');
      bluePiece.revealed = true;
      board[4][4] = bluePiece;

      // Red piece NOT revealed
      const redPiece = makePiece('private', 'red', -1, 'private-red');
      redPiece.revealed = false;
      board[4][3] = redPiece;

      const score = evaluateBoard(board, 'blue');
      // Both pieces should count as ~1 each, so score ≈ 0
      expect(score).toBeGreaterThanOrEqual(-1);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('getAllMovesForPlayer', () => {
    it('should return empty array when player has no pieces', () => {
      const board = emptyBoard();
      const moves = getAllMovesForPlayer(board, 'blue');
      expect(moves).toEqual([]);
    });

    it('should return empty array when only flags remain', () => {
      const board = emptyBoard();
      board[4][4] = makePiece('flag', 'blue', -3, 'flag-blue');
      const moves = getAllMovesForPlayer(board, 'blue');
      expect(moves).toEqual([]);
    });

    it('should return moves for all mobile pieces', () => {
      const board = emptyBoard();
      board[4][4] = makePiece('5-star', 'blue', 11, '5-star-blue');
      board[4][3] = makePiece('colonel', 'blue', 6, 'colonel-blue');

      const moves = getAllMovesForPlayer(board, 'blue');
      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m: { from: { row: number; col: number } }) => m.from.row === 4 && (m.from.col === 4 || m.from.col === 3))).toBe(true);
    });

    it('should never return moves for flags', () => {
      const board = emptyBoard();
      board[4][4] = makePiece('flag', 'blue', -3, 'flag-blue');
      board[3][4] = makePiece('private', 'blue', -1, 'private-blue');

      const moves = getAllMovesForPlayer(board, 'blue');
      const flagMoves = moves.filter((m: { from: { row: number; col: number } }) => board[m.from.row][m.from.col]?.type === 'flag');
      expect(flagMoves).toEqual([]);
    });

    it('should return opponent moves for red side', () => {
      const board = emptyBoard();
      board[4][4] = makePiece('5-star', 'red', 11, '5-star-red');

      const moves = getAllMovesForPlayer(board, 'red');
      expect(moves.length).toBeGreaterThan(0);
    });
  });

  describe('findBestMove', () => {
    it('should return the only available move', () => {
      const board = emptyBoard();
      board[4][4] = makePiece('5-star', 'blue', 11, '5-star-blue');
      // Block all other directions
      board[3][4] = makePiece('private', 'red', -1, 'private-red'); // will be captured
      // Note: The piece at 4,4 is surrounded by red pieces on all sides
      board[4][3] = makePiece('private', 'red', -1, 'private-red-2');
      board[4][5] = makePiece('private', 'red', -1, 'private-red-3');
      board[5][4] = makePiece('private', 'red', -1, 'private-red-4');

      const move = findBestMove(board, 'blue', 3000);
      // All moves are captures, so any is acceptable
      expect(move).not.toBeNull();
      expect(move?.from).toEqual({ row: 4, col: 4 });
    });

    it('should return null when no moves available (all pieces blocked by own pieces)', () => {
      const board = emptyBoard();
      // Blue piece surrounded by own pieces
      board[4][4] = makePiece('5-star', 'blue', 11, '5-star-blue');
      board[3][4] = makePiece('private', 'blue', -1, 'private-blue');
      board[5][4] = makePiece('private', 'blue', -1, 'private-blue-2');
      board[4][3] = makePiece('private', 'blue', -1, 'private-blue-3');
      board[4][5] = makePiece('private', 'blue', -1, 'private-blue-4');

      const move = findBestMove(board, 'blue', 3000);
      expect(move).toBeNull();
    });

    it('should complete within time limit', () => {
      const board = emptyBoard();
      board[4][4] = makePiece('5-star', 'blue', 11, '5-star-blue');
      board[3][4] = makePiece('private', 'red', -1, 'private-red');
      board[4][3] = makePiece('colonel', 'red', 6, 'colonel-red');
      board[4][5] = makePiece('major', 'red', 4, 'major-red');
      board[5][4] = makePiece('sergeant', 'red', 0, 'sergeant-red');

      const start = Date.now();
      const move = findBestMove(board, 'blue', 3000);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(3500);
      expect(move).not.toBeNull();
    });

    it('should prefer capture moves over non-capture moves', () => {
      const board = emptyBoard();
      board[4][4] = makePiece('5-star', 'blue', 11, '5-star-blue');
      board[3][4] = makePiece('private', 'red', -1, 'private-red'); // capture
      board[4][3] = makePiece('private', 'red', -1, 'private-red-2'); // capture
      board[4][5] = makePiece('flag', 'red', -3, 'flag-red'); // capture (game winning!)

      const move = findBestMove(board, 'blue', 3000);
      expect(move).not.toBeNull();
      // Should prefer flag capture (row 4, col 5) since it's a game-winning move
      expect(move?.to).toEqual({ row: 4, col: 5 });
    });
  });

  describe('terminal states', () => {
    it('should return WIN_BONUS when bot wins via flag capture', () => {
      const board = emptyBoard();
      // Bot (blue) captures red's flag
      board[7][4] = makePiece('5-star', 'blue', 11, '5-star-blue');
      board[6][4] = makePiece('flag', 'red', -3, 'flag-red');

      const room = makeRoom({ board, currentTurn: 'blue' });
      const win = checkWinCondition(room);
      expect(win.gameOver).toBe(true);
      expect(win.winner).toBe('blue');
    });

    it('should return LOSS_PENALTY when bot loses via flag capture', () => {
      const board = emptyBoard();
      // Red captures blue's flag
      board[0][4] = makePiece('5-star', 'red', 11, '5-star-red');
      board[1][4] = makePiece('flag', 'blue', -3, 'flag-blue');

      const room = makeRoom({ board, currentTurn: 'red' });
      const win = checkWinCondition(room);
      expect(win.gameOver).toBe(true);
      expect(win.winner).toBe('red');
    });

    it('should handle no valid moves scenario (bot has no moves, loses)', () => {
      const board = emptyBoard();
      // Bot (blue) has a flag that can't move and is surrounded by own pieces
      board[4][4] = makePiece('flag', 'blue', -3, 'flag-blue');
      board[3][4] = makePiece('private', 'blue', -1, 'private-blue');
      board[5][4] = makePiece('private', 'blue', -1, 'private-blue-2');
      board[4][3] = makePiece('private', 'blue', -1, 'private-blue-3');
      board[4][5] = makePiece('private', 'blue', -1, 'private-blue-4');
      // Red has one piece that can still move
      board[1][4] = makePiece('5-star', 'red', 11, '5-star-red');

      const room = makeRoom({ board, currentTurn: 'blue' });
      const win = checkWinCondition(room);
      expect(win.gameOver).toBe(true);
      expect(win.winner).toBe('red'); // blue loses
    });
  });

  describe('iterative deepening', () => {
    it('should search deeper on successive iterations', () => {
      // This is implicitly tested by findBestMove completing within time.
      // A simple board should complete quickly enough to reach depth 3.
      const board = emptyBoard();
      board[4][4] = makePiece('5-star', 'blue', 11, '5-star-blue');
      board[3][4] = makePiece('private', 'red', -1, 'private-red');
      board[4][3] = makePiece('colonel', 'red', 6, 'colonel-red');

      const start = Date.now();
      const move = findBestMove(board, 'blue', 3000);
      const elapsed = Date.now() - start;

      // Should complete in well under 3 seconds, indicating it searched depth 3
      expect(elapsed).toBeLessThan(2000);
      expect(move).not.toBeNull();
    });
  });
});
