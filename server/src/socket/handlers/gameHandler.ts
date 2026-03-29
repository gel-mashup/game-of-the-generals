import { Server, Socket } from 'socket.io';
import { rooms } from '../rooms';
import type { Room, Piece, Player } from '../../types';
import { PIECE_CONFIG } from '../../types';
import {
  isValidDeployment,
  canMove,
  applyMove,
  generateAutoDeploy,
  checkWinCondition,
  applyBotMove,
} from '../../game/engine';
import { findBestMove } from '../../game/botAI';

/**
 * Trigger bot to make a move. Called after deploy:complete and after human moves.
 * Uses setImmediate to not block the event loop.
 */
function triggerBotMove(io: Server, room: Room, roomId: string) {
  if (!room.isBotGame || !room.botSide) return;
  if (room.status !== 'playing') return;
  if (room.currentTurn !== room.botSide) return;

  const botSide = room.botSide;

  setImmediate(() => {
    io.to(roomId).emit('bot:thinking-start', {});

    const move = findBestMove(room.board, botSide, 3000);

    if (!move) {
      // Bot has no valid moves — check if game should end
      const winResult = checkWinCondition(room);
      if (winResult.gameOver) {
        room.status = 'finished';
        room.scores.gamesPlayed++;
        if (winResult.winner === 'red') room.scores.red++;
        else if (winResult.winner === 'blue') room.scores.blue++;
        else room.scores.draws++;

        // Reveal all pieces on game over
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 9; c++) {
            if (room.board[r][c]) room.board[r][c]!.revealed = true;
          }
        }

        io.to(roomId).emit('game:over', {
          winner: winResult.winner,
          reason: winResult.reason,
          board: room.board,
          scores: room.scores,
        });
      }
      io.to(roomId).emit('bot:thinking-end', {});
      return;
    }

    // Get pieces BEFORE mutating board
    const attacker = room.board[move.from.row][move.from.col] ?? null;
    const defender = room.board[move.to.row][move.to.col] ?? null;

    // Apply bot move
    const { battleOutcome } = applyBotMove(room.board, move.from, move.to);

    // Toggle turn
    room.currentTurn = room.currentTurn === 'red' ? 'blue' : 'red';

    // Check win condition
    const winResult = checkWinCondition(room);

    if (winResult.gameOver) {
      room.status = 'finished';
      room.scores.gamesPlayed++;
      if (winResult.winner === 'red') room.scores.red++;
      else if (winResult.winner === 'blue') room.scores.blue++;
      else room.scores.draws++;

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 9; c++) {
          if (room.board[r][c]) room.board[r][c]!.revealed = true;
        }
      }

      io.to(roomId).emit('bot:thinking-end', {});
      io.to(roomId).emit('game:over', {
        winner: winResult.winner,
        reason: winResult.reason,
        scores: room.scores,
        board: room.board,
      });
      io.to(roomId).emit('scores:update', { scores: room.scores });
      return;
    }

    io.to(roomId).emit('bot:thinking-end', {});
    io.to(roomId).emit('move:result', {
      move: { from: move.from, to: move.to },
      outcome: battleOutcome,
      attacker,
      defender,
      attackerPosition: move.from,
      defenderPosition: move.to,
      board: room.board,
      currentTurn: room.currentTurn,
    });
  });
}

function getPlayerSide(socketId: string, room: Room): 'red' | 'blue' | null {
  const player = room.players.find((p) => p.id === socketId);
  return player?.side ?? null;
}

function getPlayerFromSocket(socketId: string, room: Room): Player | null {
  return room.players.find((p) => p.id === socketId) ?? null;
}

function createPiece(type: string, owner: 'red' | 'blue', rank: number): Piece {
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 8)}`,
    type: type as Piece['type'],
    owner,
    rank: rank as Piece['rank'],
    revealed: false,
  };
}

export function gameHandler(io: Server, socket: Socket) {
  /**
   * sync-game-state — client requests current game state on page load.
   * Useful when client joins after events were already emitted.
   */
  socket.on('sync-game-state', () => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.some((p) => p.id === socket.id)) {
        console.log(`[SERVER] sync-game-state: emitting game:started with status=${room.status} for room ${roomId}`);
        socket.emit('game:started', {
          board: room.board,
          currentTurn: room.currentTurn,
          status: room.status,
        });
        console.log(`Synced game state to ${socket.id} for room ${roomId}`);
        return;
      }
    }
  });

  /**
   * game:started — auto-emitted when second player joins (or bot joins).
   * Transitions room to 'deploying' and broadcasts game start to all players.
   * For bot games, triggers bot auto-deployment.
   */
  socket.on('game:started', () => {
    // Find the room this socket belongs to
    let room: Room | undefined;
    let roomId: string | undefined;
    for (const [id, r] of rooms.entries()) {
      if (r.players.some((p) => p.id === socket.id)) {
        room = r;
        roomId = id;
        break;
      }
    }

    if (!room || !roomId) return;

    // Transition to deploying
    room.status = 'deploying';
    room.deployedPieces = { red: new Set<string>(), blue: new Set<string>() };
    room.readyPlayers = new Set<string>();

    // Emit to ALL players in the room
    io.to(roomId).emit('game:started', {
      board: room.board,
      currentTurn: 'red',
      status: 'deploying',
    });

    console.log(`Game started in room ${roomId}`);

    // For bot games: trigger bot auto-deployment
    if (room.isBotGame && room.botSide) {
      const botPlayer = room.players.find((p) => p.side === room.botSide);
      if (botPlayer && botPlayer.id === socket.id) {
        // Bot's socket received game:started — auto-deploy bot
        socket.emit('auto-deploy');
      }
    }
  });

  /**
   * deploy-piece — deploy a single piece to the board.
   * Payload: { pieceId: string, row: number, col: number }
   */
  socket.on('deploy-piece', ({ pieceId, row, col }: { pieceId: string; row: number; col: number }) => {
    let room: Room | undefined;
    let roomId: string | undefined;
    for (const [id, r] of rooms.entries()) {
      if (r.players.some((p) => p.id === socket.id)) {
        room = r;
        roomId = id;
        break;
      }
    }

    if (!room || !roomId) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const player = getPlayerFromSocket(socket.id, room);
    if (!player) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }

    // Cannot deploy if already ready
    if (room.readyPlayers.has(socket.id)) {
      socket.emit('error', { message: 'Already ready — cannot deploy more pieces' });
      return;
    }

    // Validate deployment using engine
    const validation = isValidDeployment(room, socket.id, pieceId, row, col);
    if (!validation.valid) {
      socket.emit('error', { message: validation.error ?? 'Invalid deployment' });
      return;
    }

    // Extract piece type from pieceId
    const pieceTypeMatch = pieceId.match(/^(.+?)(?:-\d+.*)?$/);
    if (!pieceTypeMatch) {
      socket.emit('error', { message: 'Invalid piece ID format' });
      return;
    }
    const pieceType = pieceTypeMatch[1];

    // Create piece and place on board
    const config = PIECE_CONFIG.find((p) => p.type === pieceType);
    if (!config) {
      socket.emit('error', { message: 'Unknown piece type' });
      return;
    }

    const piece = createPiece(pieceType, player.side, config.rank);
    room.board[row][col] = piece;
    room.deployedPieces[player.side].add(piece.id);

    const deployedCount = room.deployedPieces[player.side].size;

    // Broadcast to ALL in room
    io.to(roomId).emit('piece:deployed', {
      piece,
      row,
      col,
      deployedCount,
      board: room.board,
    });
  });

  /**
   * auto-deploy — randomly deploy all 21 pieces in the player's deployment zone.
   */
  socket.on('auto-deploy', () => {
    let room: Room | undefined;
    let roomId: string | undefined;
    for (const [id, r] of rooms.entries()) {
      if (r.players.some((p) => p.id === socket.id)) {
        room = r;
        roomId = id;
        break;
      }
    }

    if (!room || !roomId) {
      return;
    }

    const player = getPlayerFromSocket(socket.id, room);
    if (!player) {
      return;
    }

    // Cannot auto-deploy if already ready
    if (room.readyPlayers.has(socket.id)) return;

    // Must be in deploying phase
    if (room.status !== 'deploying') return;

    const playerSide = player.side;

    // Clear existing deployed pieces in player's deployment zone before auto-deploying
    const rowStart = playerSide === 'red' ? 0 : 5;
    const rowEnd = playerSide === 'red' ? 2 : 7;
    for (let r = rowStart; r <= rowEnd; r++) {
      for (let c = 0; c < 9; c++) {
        if (room.board[r][c] && room.board[r][c]?.owner === playerSide) {
          room.board[r][c] = null;
        }
      }
    }
    // Clear the deployed pieces set for this player
    room.deployedPieces[playerSide].clear();

    const positions = generateAutoDeploy(playerSide);

    let isLast = false;
    const entries = Array.from(positions.entries());
    entries.forEach(([, position], index) => {
      if (index === entries.length - 1) isLast = true;
    });

    let idx = 0;
    for (const [typeKey, position] of positions) {
      const { row, col } = position;
      const pieceType = typeKey.replace(/-\d+$/, '');
      const config = PIECE_CONFIG.find((p) => p.type === pieceType);
      if (!config) continue;

      const piece = createPiece(pieceType, playerSide, config.rank);
      room.board[row][col] = piece;
      room.deployedPieces[playerSide].add(piece.id);

      idx++;
      const isLastPiece = idx === entries.length;

      io.to(roomId!).emit('piece:deployed', {
        piece,
        row,
        col,
        deployedCount: room.deployedPieces[playerSide].size,
        board: room.board,
        autoDeployComplete: isLastPiece,
      });
    }
  });

  /**
   * ready — signal that the player has finished deploying and is ready to play.
   * When both players are ready, starts a 3-second countdown.
   */
  socket.on('ready', () => {
    let room: Room | undefined;
    let roomId: string | undefined;
    for (const [id, r] of rooms.entries()) {
      if (r.players.some((p) => p.id === socket.id)) {
        room = r;
        roomId = id;
        break;
      }
    }

    if (!room || !roomId) return;

    const player = getPlayerFromSocket(socket.id, room);
    if (!player) return;

    // Must be in deploying phase
    if (room.status !== 'deploying') {
      socket.emit('error', { message: 'Game is not in deployment phase' });
      return;
    }

    // Cannot ready if already ready
    if (room.readyPlayers.has(socket.id)) {
      socket.emit('error', { message: 'Already ready' });
      return;
    }

    // Must have all 21 pieces deployed
    if (room.deployedPieces[player.side].size !== 21) {
      socket.emit('error', { message: 'Deploy all 21 pieces before readying' });
      return;
    }

    // Mark player as ready
    room.readyPlayers.add(socket.id);

    // Broadcast to ALL in room
    io.to(roomId).emit('player:ready', { playerId: socket.id });

    console.log(`Player ${socket.id} ready in room ${roomId}. Ready count: ${room.readyPlayers.size}`);

    // For bot games: auto-ready bot when human player clicks Ready
    if (room.isBotGame && room.botSide) {
      const humanSide = player.side;
      const botSide = room.botSide;
      if (humanSide !== botSide) {
        const botPlayer = room.players.find((p) => p.side === botSide);
        if (botPlayer) {
          // Bot auto-readies (it already auto-deployed via game:started)
          room.readyPlayers.add(botPlayer.id);
          io.to(roomId).emit('player:ready', { playerId: botPlayer.id });
        }
      }
    }

    // Check if both players are ready
    if (room.readyPlayers.size >= 2) {
      // Start 3-second countdown
      let seconds = 3;
      const tick = () => {
        io.to(roomId!).emit('countdown:update', { seconds });
        if (seconds === 1) {
          // Transition to playing phase
          room!.status = 'playing';
          io.to(roomId!).emit('deploy:complete', {
            board: room!.board,
            currentTurn: 'red',
          });
          console.log(`Room ${roomId} countdown complete — game now in 'playing' phase`);
        } else {
          seconds--;
          setTimeout(tick, 1000);
        }
      };
      setTimeout(tick, 1000);
    }
  });

  /**
   * make-move — execute a move on the board.
   * Payload: { from: { row, col }, to: { row, col } }
   */
  socket.on('make-move', ({ from, to }: { from: { row: number; col: number }; to: { row: number; col: number } }) => {
    let room: Room | undefined;
    let roomId: string | undefined;
    for (const [id, r] of rooms.entries()) {
      if (r.players.some((p) => p.id === socket.id)) {
        room = r;
        roomId = id;
        break;
      }
    }

    if (!room || !roomId) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const playerSide = getPlayerSide(socket.id, room);
    if (!playerSide) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }

    // Must be in playing phase
    if (room.status !== 'playing') {
      socket.emit('error', { message: 'Game is not in playing phase' });
      return;
    }

    // Must be player's turn
    if (room.currentTurn !== playerSide) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    // Validate move using engine
    const validation = canMove(room, playerSide, from, to);
    if (!validation.valid) {
      socket.emit('error', { message: validation.error ?? 'Invalid move' });
      return;
    }

    // Capture attacker and defender pieces BEFORE applyMove modifies the board
    const attacker = room.board[from.row][from.col];
    const defender = room.board[to.row][to.col];

    // Apply move and resolve battle
    const { room: updatedRoom, battleOutcome } = applyMove(room, from, to);

    // Update room state
    room.board = updatedRoom.board;
    room.currentTurn = updatedRoom.currentTurn;
    room.deployedPieces = updatedRoom.deployedPieces;

    // Check win conditions after the move
    const winResult = checkWinCondition(room);

    if (winResult.gameOver) {
      // Update scores
      room.status = 'finished';
      room.scores.gamesPlayed++;
      if (winResult.winner === 'red') room.scores.red++;
      else if (winResult.winner === 'blue') room.scores.blue++;
      else room.scores.draws++;

      // Reveal all pieces on the board
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 9; c++) {
          if (room.board[r][c]) {
            room.board[r][c]!.revealed = true;
          }
        }
      }

      // Emit game:over FIRST — return early, do NOT emit move:result
      io.to(roomId!).emit('game:over', {
        winner: winResult.winner,
        reason: winResult.reason,
        scores: room.scores,
        board: room.board,
      });
      io.to(roomId!).emit('scores:update', { scores: room.scores });

      console.log(`Game over in room ${roomId}: ${winResult.winner} wins by ${winResult.reason}`);
      return;
    }

    // Broadcast move result to ALL in room — includes attacker/defender for BattleReveal
    io.to(roomId).emit('move:result', {
      move: { from, to },
      outcome: battleOutcome,
      attacker,
      defender,
      attackerPosition: from,
      defenderPosition: to,
      board: room.board,
      currentTurn: room.currentTurn,
    });

    // For bot games: trigger bot to make its move
    if (room.isBotGame && room.botSide && room.currentTurn === room.botSide) {
      triggerBotMove(io, room, roomId);
    }

    console.log(
      `Move in room ${roomId}: (${from.row},${from.col}) → (${to.row},${to.col}), battle: ${battleOutcome ? JSON.stringify(battleOutcome) : 'none'}`
    );
  });
}
