import {
  isInDeploymentZone,
  isValidDeployment,
  canMove,
  getValidMoves,
  resolveBattle,
  generateAutoDeploy,
} from '../src/game/engine';
import { Room, Piece, Position, PIECE_CONFIG } from '../src/types';

// Helper: create empty 8x9 board
function emptyBoard(): (Piece | null)[][] {
  return Array(8).fill(null).map(() => Array(9).fill(null));
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
    status: 'deploying',
    board: emptyBoard(),
    currentTurn: 'red',
    isBotGame: false,
    botSide: null,
    scores: { red: 0, blue: 0, draws: 0, gamesPlayed: 0 },
    deployedPieces: { red: new Set<string>(), blue: new Set<string>() },
    readyPlayers: new Set<string>(),
    ...overrides,
  } as Room;
}

// Helper: create a Piece
function makePiece(type: string, owner: 'red' | 'blue', rank: number, id?: string): Piece {
  return {
    id: id || `${type}-${owner}`,
    type: type as any,
    owner,
    rank: rank as any,
    revealed: false,
  };
}

// ============================================
// isInDeploymentZone
// ============================================
describe('isInDeploymentZone', () => {
  test('red valid at row 0', () => {
    expect(isInDeploymentZone('red', 0)).toBe(true);
  });

  test('red valid at row 2', () => {
    expect(isInDeploymentZone('red', 2)).toBe(true);
  });

  test('red invalid at row 3 (middle zone)', () => {
    expect(isInDeploymentZone('red', 3)).toBe(false);
  });

  test('red invalid at row 4 (middle zone)', () => {
    expect(isInDeploymentZone('red', 4)).toBe(false);
  });

  test('red invalid at row 7', () => {
    expect(isInDeploymentZone('red', 7)).toBe(false);
  });

  test('blue valid at row 5', () => {
    expect(isInDeploymentZone('blue', 5)).toBe(true);
  });

  test('blue valid at row 7', () => {
    expect(isInDeploymentZone('blue', 7)).toBe(true);
  });

  test('blue invalid at row 4 (middle zone)', () => {
    expect(isInDeploymentZone('blue', 4)).toBe(false);
  });

  test('blue invalid at row 0', () => {
    expect(isInDeploymentZone('blue', 0)).toBe(false);
  });
});

// ============================================
// isValidDeployment
// ============================================
describe('isValidDeployment', () => {
  test('valid deployment in red zone at row 0', () => {
    const room = makeRoom();
    const result = isValidDeployment(room, 'red1', 'flag', 0, 0);
    expect(result.valid).toBe(true);
  });

  test('valid deployment in red zone at row 2', () => {
    const room = makeRoom();
    const result = isValidDeployment(room, 'red1', '5-star', 2, 8);
    expect(result.valid).toBe(true);
  });

  test('invalid: out of zone for red at row 3', () => {
    const room = makeRoom();
    const result = isValidDeployment(room, 'red1', 'flag', 3, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('zone');
  });

  test('invalid: out of zone for blue at row 4', () => {
    const room = makeRoom();
    const result = isValidDeployment(room, 'blue1', 'flag', 4, 4);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('zone');
  });

  test('invalid: cell already occupied', () => {
    const room = makeRoom();
    room.board[0][0] = makePiece('flag', 'red', -3, 'flag');
    const result = isValidDeployment(room, 'red1', '5-star', 0, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('occupied');
  });

  test('invalid: piece already deployed (exceeds count)', () => {
    const room = makeRoom();
    room.deployedPieces.red.add('flag');
    const result = isValidDeployment(room, 'red1', 'flag', 0, 1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('already deployed');
  });

  test('invalid: position out of bounds', () => {
    const room = makeRoom();
    const result = isValidDeployment(room, 'red1', 'flag', -1, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('bounds');
  });

  test('invalid: player not in room', () => {
    const room = makeRoom();
    const result = isValidDeployment(room, 'notauser', 'flag', 0, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not found');
  });
});

// ============================================
// canMove
// ============================================
describe('canMove', () => {
  test('valid: move up one row', () => {
    const room = makeRoom();
    room.board[3][4] = makePiece('5-star', 'red', 11, 'five-star-red');
    const result = canMove(room, 'red', { row: 3, col: 4 }, { row: 2, col: 4 });
    expect(result.valid).toBe(true);
  });

  test('valid: move down one row', () => {
    const room = makeRoom();
    room.board[3][4] = makePiece('5-star', 'red', 11);
    const result = canMove(room, 'red', { row: 3, col: 4 }, { row: 4, col: 4 });
    expect(result.valid).toBe(true);
  });

  test('valid: move left one column', () => {
    const room = makeRoom();
    room.board[3][4] = makePiece('5-star', 'red', 11);
    const result = canMove(room, 'red', { row: 3, col: 4 }, { row: 3, col: 3 });
    expect(result.valid).toBe(true);
  });

  test('valid: move right one column', () => {
    const room = makeRoom();
    room.board[3][4] = makePiece('5-star', 'red', 11);
    const result = canMove(room, 'red', { row: 3, col: 4 }, { row: 3, col: 5 });
    expect(result.valid).toBe(true);
  });

  test('invalid: diagonal move', () => {
    const room = makeRoom();
    room.board[3][4] = makePiece('5-star', 'red', 11);
    const result = canMove(room, 'red', { row: 3, col: 4 }, { row: 2, col: 5 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('orthogonally');
  });

  test('invalid: distance > 1', () => {
    const room = makeRoom();
    room.board[3][4] = makePiece('5-star', 'red', 11);
    const result = canMove(room, 'red', { row: 3, col: 4 }, { row: 1, col: 4 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('orthogonally');
  });

  test('invalid: own piece at destination', () => {
    const room = makeRoom();
    room.board[3][4] = makePiece('5-star', 'red', 11);
    room.board[3][5] = makePiece('4-star', 'red', 10);
    const result = canMove(room, 'red', { row: 3, col: 4 }, { row: 3, col: 5 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('own piece');
  });

  test('invalid: flag piece cannot move', () => {
    const room = makeRoom();
    room.board[0][4] = makePiece('flag', 'red', -3);
    const result = canMove(room, 'red', { row: 0, col: 4 }, { row: 1, col: 4 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Flag');
  });

  test('invalid: no piece at source', () => {
    const room = makeRoom();
    const result = canMove(room, 'red', { row: 3, col: 4 }, { row: 2, col: 4 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No piece');
  });

  test('invalid: piece belongs to opponent', () => {
    const room = makeRoom();
    room.board[3][4] = makePiece('5-star', 'blue', 11);
    const result = canMove(room, 'red', { row: 3, col: 4 }, { row: 2, col: 4 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('does not belong');
  });
});

// ============================================
// getValidMoves
// ============================================
describe('getValidMoves', () => {
  test('center piece returns up to 4 moves', () => {
    const board = emptyBoard();
    const piece = makePiece('5-star', 'red', 11, 'center-piece');
    board[3][4] = piece;
    const moves = getValidMoves(board, piece);
    expect(moves.length).toBe(4);
  });

  test('corner piece at [0,0] returns 2 moves', () => {
    const board = emptyBoard();
    const piece = makePiece('5-star', 'red', 11);
    board[0][0] = piece;
    const moves = getValidMoves(board, piece);
    expect(moves.length).toBe(2);
    expect(moves).toContainEqual({ row: 1, col: 0 });
    expect(moves).toContainEqual({ row: 0, col: 1 });
  });

  test('piece next to own piece excludes that direction', () => {
    const board = emptyBoard();
    const piece = makePiece('5-star', 'red', 11);
    board[3][4] = piece;
    board[2][4] = makePiece('4-star', 'red', 10);
    const moves = getValidMoves(board, piece);
    expect(moves.length).toBe(3);
    expect(moves).not.toContainEqual({ row: 2, col: 4 });
  });

  test('piece next to enemy includes that direction', () => {
    const board = emptyBoard();
    const piece = makePiece('5-star', 'red', 11);
    board[3][4] = piece;
    board[2][4] = makePiece('flag', 'blue', -3);
    const moves = getValidMoves(board, piece);
    expect(moves).toContainEqual({ row: 2, col: 4 });
  });

  test('edge piece at [0,4] returns 3 moves', () => {
    const board = emptyBoard();
    const piece = makePiece('5-star', 'red', 11);
    board[0][4] = piece;
    const moves = getValidMoves(board, piece);
    expect(moves.length).toBe(3);
  });

  test('piece not on board returns empty array', () => {
    const board = emptyBoard();
    const piece = makePiece('5-star', 'red', 11);
    const moves = getValidMoves(board, piece);
    expect(moves).toEqual([]);
  });
});

// ============================================
// resolveBattle (MOST CRITICAL)
// ============================================
describe('resolveBattle', () => {
  // Rule 1: Flag capture
  test('any piece captures flag', () => {
    const attacker = makePiece('private', 'red', -1);
    const defender = makePiece('flag', 'blue', -3);
    const outcome = resolveBattle(attacker, defender);
    expect(outcome.winner).toBe('red');
    expect(outcome.capturedPieceIds).toContain(defender.id);
    expect(outcome.attackerWins).toBe(true);
  });

  test('5-star captures blue flag', () => {
    const attacker = makePiece('5-star', 'blue', 11);
    const defender = makePiece('flag', 'red', -3);
    const outcome = resolveBattle(attacker, defender);
    expect(outcome.winner).toBe('blue');
    expect(outcome.capturedPieceIds).toContain(defender.id);
  });

  // Rule 2: Spy vs Private
  test('spy attacking private: private wins (defender)', () => {
    const attacker = makePiece('spy', 'red', -2);
    const defender = makePiece('private', 'blue', -1);
    const outcome = resolveBattle(attacker, defender);
    expect(outcome.winner).toBe('blue');
    expect(outcome.capturedPieceIds).toContain(attacker.id);
    expect(outcome.attackerWins).toBe(false);
  });

  test('private attacking spy: private wins (attacker)', () => {
    const attacker = makePiece('private', 'red', -1);
    const defender = makePiece('spy', 'blue', -2);
    const outcome = resolveBattle(attacker, defender);
    expect(outcome.winner).toBe('red');
    expect(outcome.capturedPieceIds).toContain(defender.id);
    expect(outcome.attackerWins).toBe(true);
  });

  test('spy vs sergeant: spy wins (officer rule)', () => {
    const attacker = makePiece('spy', 'red', -2);
    const defender = makePiece('sergeant', 'blue', 0);
    const outcome = resolveBattle(attacker, defender);
    expect(outcome.winner).toBe('red');
    expect(outcome.capturedPieceIds).toContain(defender.id);
    expect(outcome.attackerWins).toBe(true);
  });

  test('sergeant vs spy: spy wins (defender)', () => {
    const attacker = makePiece('sergeant', 'red', 0);
    const defender = makePiece('spy', 'blue', -2);
    const outcome = resolveBattle(attacker, defender);
    expect(outcome.winner).toBe('blue');
    expect(outcome.capturedPieceIds).toContain(attacker.id);
    expect(outcome.attackerWins).toBe(false);
  });

  // Rule 3: Equal rank
  test('equal rank tie: both eliminated', () => {
    const attacker = makePiece('3-star', 'red', 9);
    const defender = makePiece('3-star', 'blue', 9);
    const outcome = resolveBattle(attacker, defender);
    expect(outcome.winner).toBe('tie');
    expect(outcome.capturedPieceIds).toContain(attacker.id);
    expect(outcome.capturedPieceIds).toContain(defender.id);
    expect(outcome.attackerWins).toBeNull();
  });

  test('private vs private tie', () => {
    const attacker = makePiece('private', 'red', -1);
    const defender = makePiece('private', 'blue', -1);
    const outcome = resolveBattle(attacker, defender);
    expect(outcome.winner).toBe('tie');
    expect(outcome.capturedPieceIds).toHaveLength(2);
    expect(outcome.attackerWins).toBeNull();
  });

  // Rule 4: Higher rank
  test('5-star vs 4-star: 5-star wins', () => {
    const attacker = makePiece('5-star', 'red', 11);
    const defender = makePiece('4-star', 'blue', 10);
    const outcome = resolveBattle(attacker, defender);
    expect(outcome.winner).toBe('red');
    expect(outcome.capturedPieceIds).toContain(defender.id);
    expect(outcome.attackerWins).toBe(true);
  });

  test('captain vs major: major wins (defender)', () => {
    const attacker = makePiece('captain', 'red', 3);
    const defender = makePiece('major', 'blue', 4);
    const outcome = resolveBattle(attacker, defender);
    expect(outcome.winner).toBe('blue');
    expect(outcome.capturedPieceIds).toContain(attacker.id);
    expect(outcome.attackerWins).toBe(false);
  });

  test('revealed flags are always true', () => {
    const attacker = makePiece('private', 'red', -1);
    const defender = makePiece('flag', 'blue', -3);
    const outcome = resolveBattle(attacker, defender);
    expect(outcome.attackerRevealed).toBe(true);
    expect(outcome.defenderRevealed).toBe(true);
  });
});

// ============================================
// generateAutoDeploy
// ============================================
describe('generateAutoDeploy', () => {
  test('red generates exactly 21 pieces', () => {
    const deploy = generateAutoDeploy('red');
    expect(deploy.size).toBe(21);
  });

  test('blue generates exactly 21 pieces', () => {
    const deploy = generateAutoDeploy('blue');
    expect(deploy.size).toBe(21);
  });

  test('all red positions within rows 0-2', () => {
    const deploy = generateAutoDeploy('red');
    for (const [, pos] of deploy) {
      expect(pos.row).toBeGreaterThanOrEqual(0);
      expect(pos.row).toBeLessThanOrEqual(2);
      expect(pos.col).toBeGreaterThanOrEqual(0);
      expect(pos.col).toBeLessThanOrEqual(8);
    }
  });

  test('all blue positions within rows 5-7', () => {
    const deploy = generateAutoDeploy('blue');
    for (const [, pos] of deploy) {
      expect(pos.row).toBeGreaterThanOrEqual(5);
      expect(pos.row).toBeLessThanOrEqual(7);
      expect(pos.col).toBeGreaterThanOrEqual(0);
      expect(pos.col).toBeLessThanOrEqual(8);
    }
  });

  test('no duplicate positions for red', () => {
    const deploy = generateAutoDeploy('red');
    const positions = Array.from(deploy.values());
    const unique = new Set(positions.map(p => `${p.row},${p.col}`));
    expect(unique.size).toBe(21);
  });

  test('no duplicate positions for blue', () => {
    const deploy = generateAutoDeploy('blue');
    const positions = Array.from(deploy.values());
    const unique = new Set(positions.map(p => `${p.row},${p.col}`));
    expect(unique.size).toBe(21);
  });

  test('multiple calls produce different distributions (randomized)', () => {
    const deploy1 = generateAutoDeploy('red');
    const deploy2 = generateAutoDeploy('red');
    const deploy3 = generateAutoDeploy('red');
    // At least one should differ (extremely unlikely to be identical)
    const pos1 = Array.from(deploy1.values()).map(p => `${p.row},${p.col}`).sort().join('|');
    const pos2 = Array.from(deploy2.values()).map(p => `${p.row},${p.col}`).sort().join('|');
    const pos3 = Array.from(deploy3.values()).map(p => `${p.row},${p.col}`).sort().join('|');
    const allSame = pos1 === pos2 && pos2 === pos3;
    expect(allSame).toBe(false);
  });

  test('deploy has all piece types from PIECE_CONFIG', () => {
    const deploy = generateAutoDeploy('red');
    const pieceTypes = Array.from(deploy.keys()).map(k => k.replace(/-\d+$/, ''));
    const configTypes = PIECE_CONFIG.map(p => p.type);
    for (const type of configTypes) {
      expect(pieceTypes).toContain(type);
    }
  });
});
