import { Room, Piece, Position, PieceConfig, PIECE_CONFIG, BattleOutcome } from '../types';

/**
 * Check if a row is within a player's deployment zone.
 * Red: rows 0-2, Blue: rows 5-7
 */
export function isInDeploymentZone(player: 'red' | 'blue', row: number): boolean {
  if (player === 'red') {
    return row >= 0 && row <= 2;
  }
  return row >= 5 && row <= 7;
}

/**
 * Validate a piece deployment.
 */
export function isValidDeployment(
  room: Room,
  playerId: string,
  pieceId: string,
  row: number,
  col: number
): { valid: boolean; error?: string } {
  // Player must own the piece (must NOT be in deployedPieces yet)
  const playerSide = room.players.find(p => p.id === playerId)?.side;
  if (!playerSide) {
    return { valid: false, error: 'Player not found in room' };
  }

  const deployed = room.deployedPieces[playerSide] || new Set<string>();
  if (deployed.has(pieceId)) {
    return { valid: false, error: 'Piece already deployed' };
  }

  // Check board bounds
  if (row < 0 || row >= 8 || col < 0 || col >= 9) {
    return { valid: false, error: 'Position out of bounds' };
  }

  // Must be in deployment zone
  if (!isInDeploymentZone(playerSide, row)) {
    return { valid: false, error: 'Not in deployment zone' };
  }

  // Target cell must be empty
  if (room.board[row][col] !== null) {
    return { valid: false, error: 'Cell already occupied' };
  }

  // Extract piece type from pieceId (e.g. '5-star', 'private-0', 'flag')
  const pieceTypeMatch = pieceId.match(/^([a-zA-Z0-9][a-zA-Z0-9-]*)(?:-\d+)?$/);
  if (!pieceTypeMatch) {
    return { valid: false, error: 'Invalid piece ID format' };
  }
  const pieceType = pieceTypeMatch[1] as PieceConfig['type'];

  const config = PIECE_CONFIG.find(p => p.type === pieceType);
  if (!config) {
    return { valid: false, error: 'Unknown piece type' };
  }

  // Count how many of this type are already deployed
  const deployedOfType = Array.from(deployed).filter(id => {
    const m = id.match(/^([a-z-]+)(?:-\d+)?$/);
    return m && m[1] === pieceType;
  }).length;

  if (deployedOfType >= config.count) {
    return { valid: false, error: `Already deployed maximum ${config.count} of ${pieceType}` };
  }

  return { valid: true };
}

/**
 * Check if a move is valid for a piece.
 */
export function canMove(
  room: Room,
  playerSide: 'red' | 'blue',
  from: Position,
  to: Position
): { valid: boolean; error?: string } {
  const { row: fr, col: fc } = from;
  const { row: tr, col: tc } = to;

  // Source must have a piece owned by playerSide
  const sourcePiece = room.board[fr]?.[fc];
  if (!sourcePiece) {
    return { valid: false, error: 'No piece at source' };
  }
  if (sourcePiece.owner !== playerSide) {
    return { valid: false, error: 'Piece does not belong to player' };
  }

  // Target must be within board bounds
  if (tr < 0 || tr >= 8 || tc < 0 || tc >= 9) {
    return { valid: false, error: 'Target out of bounds' };
  }

  // Must be exactly 1 square orthogonal (no diagonal, no distance > 1)
  const rowDiff = Math.abs(fr - tr);
  const colDiff = Math.abs(fc - tc);
  if (!((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1))) {
    return { valid: false, error: 'Must move exactly 1 square orthogonally' };
  }

  // Target cannot have own piece
  const targetPiece = room.board[tr][tc];
  if (targetPiece && targetPiece.owner === playerSide) {
    return { valid: false, error: 'Cannot move to own piece' };
  }

  // Flag cannot move
  if (sourcePiece.type === 'flag') {
    return { valid: false, error: 'Flag cannot move' };
  }

  return { valid: true };
}

/**
 * Get all valid move destinations for a piece on the board.
 */
export function getValidMoves(board: (Piece | null)[][], piece: Piece): Position[] {
  // Find piece's current position on the board
  let pieceRow = -1;
  let pieceCol = -1;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c]?.id === piece.id) {
        pieceRow = r;
        pieceCol = c;
        break;
      }
    }
    if (pieceRow !== -1) break;
  }

  if (pieceRow === -1) return [];

  const directions: Position[] = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  const moves: Position[] = [];
  for (const dir of directions) {
    const nr = pieceRow + dir.row;
    const nc = pieceCol + dir.col;
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 9) continue;
    const occupant = board[nr][nc];
    if (occupant && occupant.owner === piece.owner) continue;
    moves.push({ row: nr, col: nc });
  }

  return moves;
}

/**
 * Resolve a battle between attacker and defender.
 * Priority order (MUST be followed exactly):
 * 1. Flag capture (any piece captures flag)
 * 2. Spy vs Private (private beats spy when attacking, spy loses)
 * 3. Equal rank (tie — both eliminated)
 * 4. Higher rank wins
 */
export function resolveBattle(attacker: Piece, defender: Piece): BattleOutcome {
  // Rule 1: Flag capture
  if (defender.type === 'flag') {
    return {
      winner: attacker.owner,
      capturedPieceIds: [defender.id],
      attackerWins: true,
      attackerRevealed: true,
      defenderRevealed: true,
    };
  }

  // Rule 2: Spy vs Private (must come before rank comparison)
  if (attacker.type === 'spy' && defender.type === 'private') {
    return {
      winner: defender.owner,
      capturedPieceIds: [attacker.id],
      attackerWins: false,
      attackerRevealed: true,
      defenderRevealed: true,
    };
  }
  if (attacker.type === 'private' && defender.type === 'spy') {
    return {
      winner: attacker.owner,
      capturedPieceIds: [defender.id],
      attackerWins: true,
      attackerRevealed: true,
      defenderRevealed: true,
    };
  }
  // Spy beats all officers (rank >= 0) — comes after spy/private checks
  if (attacker.type === 'spy' && defender.rank >= 0) {
    return {
      winner: attacker.owner,
      capturedPieceIds: [defender.id],
      attackerWins: true,
      attackerRevealed: true,
      defenderRevealed: true,
    };
  }
  // Any officer (rank >= 0) loses to spy when attacking
  if (defender.type === 'spy' && attacker.rank >= 0) {
    return {
      winner: defender.owner,
      capturedPieceIds: [attacker.id],
      attackerWins: false,
      attackerRevealed: true,
      defenderRevealed: true,
    };
  }

  // Rule 3: Equal rank — both eliminated
  if (attacker.rank === defender.rank) {
    return {
      winner: 'tie',
      capturedPieceIds: [attacker.id, defender.id],
      attackerWins: null,
      attackerRevealed: true,
      defenderRevealed: true,
    };
  }

  // Rule 4: Higher rank wins
  if (attacker.rank > defender.rank) {
    return {
      winner: attacker.owner,
      capturedPieceIds: [defender.id],
      attackerWins: true,
      attackerRevealed: true,
      defenderRevealed: true,
    };
  }

  return {
    winner: defender.owner,
    capturedPieceIds: [attacker.id],
    attackerWins: false,
    attackerRevealed: true,
    defenderRevealed: true,
  };
}

/**
 * Generate a random auto-deployment for a player.
 * Red: rows 0-2, columns 0-8
 * Blue: rows 5-7, columns 0-8
 * Returns Map where key is piece type (+ suffix for multiples) and value is position.
 */
export function generateAutoDeploy(player: 'red' | 'blue'): Map<string, Position> {
  const result = new Map<string, Position>();

  // Generate all available positions in the deployment zone
  const rowStart = player === 'red' ? 0 : 5;
  const rowEnd = player === 'red' ? 2 : 7;
  const positions: Position[] = [];
  for (let r = rowStart; r <= rowEnd; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push({ row: r, col: c });
    }
  }

  // Fisher-Yates shuffle
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  let posIndex = 0;
  for (const config of PIECE_CONFIG) {
    for (let i = 0; i < config.count; i++) {
      const typeKey = config.count === 1 ? config.type : `${config.type}-${i}`;
      result.set(typeKey, positions[posIndex++]);
    }
  }

  return result;
}

/**
 * Apply a move to the board, handling battles.
 */
export function applyMove(
  room: Room,
  from: Position,
  to: Position
): { room: Room; battleOutcome: BattleOutcome | null } {
  // Deep clone room to avoid mutation
  const newRoom: Room = JSON.parse(JSON.stringify(room));
  // Reconstruct Sets (they don't survive JSON)
  newRoom.deployedPieces = {
    red: new Set(room.deployedPieces.red),
    blue: new Set(room.deployedPieces.blue),
  };
  newRoom.readyPlayers = new Set(room.readyPlayers);

  const piece = newRoom.board[from.row][from.col];
  if (!piece) {
    return { room: newRoom, battleOutcome: null };
  }

  const target = newRoom.board[to.row][to.col];
  let battleOutcome: BattleOutcome | null = null;

  if (target) {
    // Battle!
    battleOutcome = resolveBattle(piece, target);
    // Remove captured pieces
    for (const capturedId of battleOutcome.capturedPieceIds) {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 9; c++) {
          if (newRoom.board[r][c]?.id === capturedId) {
            newRoom.board[r][c] = null;
          }
        }
      }
    }
  }

  // Move piece to new position
  newRoom.board[to.row][to.col] = piece;
  newRoom.board[from.row][from.col] = null;

  // Toggle turn
  newRoom.currentTurn = newRoom.currentTurn === 'red' ? 'blue' : 'red';

  return { room: newRoom, battleOutcome };
}

export interface WinResult {
  gameOver: boolean;
  winner: 'red' | 'blue' | null;
  reason: 'flag_captured' | 'flag_baseline' | 'no_moves' | null;
}

/**
 * WIN-01: Check if either flag has been captured.
 * Returns the opponent of the player whose flag is missing.
 */
export function checkFlagCapture(room: Room): 'red' | 'blue' | null {
  let redHasFlag = false;
  let blueHasFlag = false;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = room.board[r][c];
      if (piece?.type === 'flag') {
        if (piece.owner === 'red') redHasFlag = true;
        else blueHasFlag = true;
      }
    }
  }
  if (!redHasFlag) return 'blue';   // blue captured red's flag
  if (!blueHasFlag) return 'red';   // red captured blue's flag
  return null;
}

/**
 * Check if a position has an adjacent enemy piece.
 */
function hasAdjacentEnemy(board: (Piece | null)[][], row: number, col: number, enemySide: 'red' | 'blue'): boolean {
  const directions: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 9) continue;
    const occupant = board[nr][nc];
    if (occupant?.owner === enemySide) return true;
  }
  return false;
}

/**
 * WIN-02: Check if a flag has reached the opposite baseline with no adjacent enemies.
 * Red flag at row 7 = red wins. Blue flag at row 0 = blue wins.
 */
export function checkFlagBaseline(room: Room): 'red' | 'blue' | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = room.board[r][c];
      if (piece?.type === 'flag') {
        if (piece.owner === 'red' && r === 7) {
          if (!hasAdjacentEnemy(room.board, r, c, 'blue')) return 'red';
        }
        if (piece.owner === 'blue' && r === 0) {
          if (!hasAdjacentEnemy(room.board, r, c, 'red')) return 'blue';
        }
      }
    }
  }
  return null;
}

/**
 * Check if a player has any valid moves on the board.
 */
function playerHasValidMove(board: (Piece | null)[][], playerSide: 'red' | 'blue'): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece?.owner === playerSide) {
        const moves = getValidMoves(board, piece);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}

/**
 * WIN-03: Check if a player has no valid moves.
 * Returns the player who has no moves (they lose — opponent wins).
 */
export function checkNoValidMoves(room: Room): 'red' | 'blue' | null {
  for (const player of ['red', 'blue'] as const) {
    if (!playerHasValidMove(room.board, player)) return player;
  }
  return null;
}

/**
 * Master win condition checker — call after every move.
 * Priority: flag capture > flag baseline > no valid moves.
 */
export function checkWinCondition(room: Room): WinResult {
  // WIN-01: Flag capture
  const flagWinner = checkFlagCapture(room);
  if (flagWinner) {
    return { gameOver: true, winner: flagWinner, reason: 'flag_captured' };
  }
  // WIN-02: Flag at baseline
  const baselineWinner = checkFlagBaseline(room);
  if (baselineWinner) {
    return { gameOver: true, winner: baselineWinner, reason: 'flag_baseline' };
  }
  // WIN-03: No valid moves
  const noMovesPlayer = checkNoValidMoves(room);
  if (noMovesPlayer) {
    const winner = noMovesPlayer === 'red' ? 'blue' : 'red';
    return { gameOver: true, winner, reason: 'no_moves' };
  }
  return { gameOver: false, winner: null, reason: null };
}
