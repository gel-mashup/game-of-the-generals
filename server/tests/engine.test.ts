import {
  isInDeploymentZone,
  isValidDeployment,
  canMove,
  getValidMoves,
  resolveBattle,
  generateAutoDeploy,
  checkFlagCapture,
  checkFlagBaseline,
  checkNoValidMoves,
  checkWinCondition,
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

// ============================================
// checkFlagCapture
// ============================================
describe('checkFlagCapture', () => {
  test('blue wins when red flag is missing from board', () => {
    const room = makeRoom();
    // Place red's flag, but no blue flag — blue captured it
    room.board[0][0] = makePiece('5-star', 'red', 11);
    // No flag on the board at all
    expect(checkFlagCapture(room)).toBe('blue');
  });

  test('blue wins when blue flag is missing from board (red captured it)', () => {
    const room = makeRoom();
    room.board[7][8] = makePiece('5-star', 'blue', 11);
    // No flags on board — red captured blue's flag
    expect(checkFlagCapture(room)).toBe('blue');
  });

  test('returns null when both flags are present', () => {
    const room = makeRoom();
    room.board[0][4] = makePiece('flag', 'red', -3, 'red-flag');
    room.board[7][4] = makePiece('flag', 'blue', -3, 'blue-flag');
    expect(checkFlagCapture(room)).toBeNull();
  });
});

// ============================================
// checkFlagBaseline
// ============================================
describe('checkFlagBaseline', () => {
  test('red wins when red flag reaches row 7 with no adjacent blue piece', () => {
    const room = makeRoom();
    room.board[7][4] = makePiece('flag', 'red', -3, 'red-flag');
    // No blue pieces adjacent to row 7
    expect(checkFlagBaseline(room)).toBe('red');
  });

  test('blue wins when blue flag reaches row 0 with no adjacent red piece', () => {
    const room = makeRoom();
    room.board[0][4] = makePiece('flag', 'blue', -3, 'blue-flag');
    expect(checkFlagBaseline(room)).toBe('blue');
  });

  test('red does NOT win if blue piece is adjacent to flag at row 7', () => {
    const room = makeRoom();
    room.board[7][4] = makePiece('flag', 'red', -3, 'red-flag');
    room.board[6][4] = makePiece('5-star', 'blue', 11); // adjacent above
    expect(checkFlagBaseline(room)).toBeNull();
  });

  test('blue does NOT win if red piece is adjacent to flag at row 0', () => {
    const room = makeRoom();
    room.board[0][4] = makePiece('flag', 'blue', -3, 'blue-flag');
    room.board[1][4] = makePiece('5-star', 'red', 11); // adjacent below
    expect(checkFlagBaseline(room)).toBeNull();
  });

  test('returns null when flag is not on opponent baseline', () => {
    const room = makeRoom();
    room.board[3][4] = makePiece('flag', 'red', -3, 'red-flag');
    room.board[4][4] = makePiece('flag', 'blue', -3, 'blue-flag');
    expect(checkFlagBaseline(room)).toBeNull();
  });
});

// ============================================
// checkNoValidMoves
// ============================================
describe('checkNoValidMoves', () => {
  test('returns null when blue has valid moves (red pieces blocked but blue 5-star free)', () => {
    const room = makeRoom();
    // Red flag at (0,0), privates at (1,0) and (0,1) — all blocked
    room.board[0][0] = makePiece('flag', 'red', -3, 'red-flag');
    room.board[1][0] = makePiece('private', 'red', -1, 'private-red-1');
    room.board[0][1] = makePiece('private', 'red', -1, 'private-red-2');
    // Blue has a 5-star at (7,4) — free to move in 3+ directions
    room.board[7][4] = makePiece('5-star', 'blue', 11);
    // Red: flag blocked, privates can move to (2,0) and (0,2) — Red has valid moves
    // Blue: 5-star mobile — Blue has valid moves
    // Both have valid moves → returns null
    expect(checkNoValidMoves(room)).toBeNull();
  });

  test('returns null when red has valid moves (blue pieces mostly blocked)', () => {
    const room = makeRoom();
    // Blue flag at (7,7), privates at (6,8) and (6,7) — flag blocked on 3 sides
    room.board[7][7] = makePiece('flag', 'blue', -3, 'blue-flag');
    room.board[6][8] = makePiece('private', 'blue', -1, 'private-blue-1');
    room.board[6][7] = makePiece('private', 'blue', -1, 'private-blue-2');
    // Blue 5-star at (7,4) — mobile
    room.board[7][4] = makePiece('5-star', 'red', 11);
    // Blue: 5-star has valid moves; Red: 5-star has valid moves
    // Both have valid moves → returns null
    expect(checkNoValidMoves(room)).toBeNull();
  });

  test('returns null when both players have valid moves', () => {
    const room = makeRoom();
    room.board[0][0] = makePiece('5-star', 'red', 11);
    room.board[7][8] = makePiece('5-star', 'blue', 11);
    // Both have open squares to move to
    expect(checkNoValidMoves(room)).toBeNull();
  });

  test('flag-only player has no valid moves (flag cannot move)', () => {
    const room = makeRoom();
    room.board[0][0] = makePiece('flag', 'red', -3);
    room.board[7][8] = makePiece('5-star', 'blue', 11);
    // Red only has flag (cannot move), blue can move
    expect(checkNoValidMoves(room)).toBe('red');
  });
});

// ============================================
// checkWinCondition
// ============================================
describe('checkWinCondition', () => {
  test('game over by flag capture — returns flag_captured', () => {
    const room = makeRoom();
    room.board[0][0] = makePiece('5-star', 'red', 11);
    // No flags on board
    const result = checkWinCondition(room);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('blue');
    expect(result.reason).toBe('flag_captured');
  });

  test('game over by flag baseline — returns flag_baseline', () => {
    const room = makeRoom();
    room.board[0][4] = makePiece('flag', 'blue', -3, 'blue-flag');
    room.board[7][4] = makePiece('flag', 'red', -3, 'red-flag');
    // Both flags in place, but blue flag at row 0 with no adjacent red
    const result = checkWinCondition(room);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('blue');
    expect(result.reason).toBe('flag_baseline');
  });

  test('game over by no valid moves — returns no_moves', () => {
    const room = makeRoom();
    // Red: flag + 2 privates, all blocked (flag at (0,0), privates surround)
    room.board[0][0] = makePiece('flag', 'red', -3, 'red-flag');
    room.board[1][0] = makePiece('private', 'red', -1);
    room.board[0][1] = makePiece('private', 'red', -1);
    // Blue: flag + 2 privates, all blocked (flag at (7,8), privates surround)
    room.board[7][8] = makePiece('flag', 'blue', -3, 'blue-flag');
    room.board[6][8] = makePiece('private', 'blue', -1);
    room.board[7][7] = makePiece('private', 'blue', -1);
    // Blue private at (7,7): (6,7) empty, (7,6) empty, (7,8) blocked, (8,7) OOB → 2 valid moves
    // Both sides have valid moves → gameOver=false
    const result = checkWinCondition(room);
    expect(result.gameOver).toBe(false);
    expect(result.winner).toBeNull();
    expect(result.reason).toBeNull();
  });

  test('no game over when both flags present and no win condition met', () => {
    const room = makeRoom();
    room.board[0][4] = makePiece('flag', 'red', -3, 'red-flag');
    room.board[7][4] = makePiece('flag', 'blue', -3, 'blue-flag');
    room.board[3][4] = makePiece('5-star', 'red', 11);
    room.board[4][4] = makePiece('5-star', 'blue', 11);
    const result = checkWinCondition(room);
    expect(result.gameOver).toBe(false);
    expect(result.winner).toBeNull();
    expect(result.reason).toBeNull();
  });

  test('priority: flag capture checked before baseline', () => {
    const room = makeRoom();
    // Blue flag is gone (capture scenario)
    room.board[0][4] = makePiece('flag', 'red', -3, 'red-flag');
    room.board[0][0] = makePiece('5-star', 'blue', 11);
    // Red flag at row 0 (baseline scenario also true but capture takes priority)
    const result = checkWinCondition(room);
    expect(result.reason).toBe('flag_captured');
  });
});
