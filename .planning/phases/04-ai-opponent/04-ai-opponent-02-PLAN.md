---
phase: 04-ai-opponent
plan: 02
type: execute
wave: 2
depends_on:
  - 04-ai-opponent-01
files_modified:
  - server/src/game/engine.ts
  - server/src/socket/handlers/gameHandler.ts
autonomous: true
requirements:
  - AI-01
  - AI-02
  - AI-03
user_setup: []

must_haves:
  truths:
    - "Bot auto-deploys when game starts in bot mode"
    - "Bot auto-readies after auto-deploy completes"
    - "Bot thinks and moves after deploy:complete (human goes first = red, bot is blue)"
    - "Bot thinks and moves after human makes a move"
    - "Thinking indicator events emitted to client during bot computation"
  artifacts:
    - path: "server/src/socket/handlers/gameHandler.ts"
      provides: "Bot turn trigger, bot thinking events"
      contains: "findBestMove"
    - path: "server/src/game/engine.ts"
      provides: "applyBotMove (board-only variant of applyMove)"
      contains: "applyBotMove"
  key_links:
    - from: "server/src/socket/handlers/gameHandler.ts"
      to: "server/src/game/botAI.ts"
      via: "import { findBestMove }"
      pattern: "from.*botAI"
    - from: "gameHandler.ts"
      to: "rooms Map"
      via: "rooms.get(roomId)"
      pattern: "rooms\\.get"
    - from: "gameHandler.ts"
      to: "all clients in room"
      via: "io.to(roomId).emit('bot:thinking-start'|'bot:thinking-end')"
      pattern: "io\\.to.*emit.*bot"
---

<objective>
Integrate the bot AI into gameHandler so the bot plays blue automatically. Bot auto-deploys on game start, auto-readies, and makes moves after each human turn via Minimax search with thinking indicator socket events.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@server/src/socket/handlers/gameHandler.ts
@server/src/socket/rooms.ts
@server/src/game/botAI.ts
@server/src/game/engine.ts
</context>

<interfaces>
<!-- botAI.ts interface (created by Plan 04-01) -->
```typescript
// From server/src/game/botAI.ts:
export interface Move { from: Position; to: Position; }
export function findBestMove(board: (Piece | null)[][], botSide: 'red' | 'blue', maxTimeMs?: number): Move | null
export function getAllMovesForPlayer(board: (Piece | null)[][], playerSide: 'red' | 'blue'): Move[]
```

<!-- gameHandler existing integration points -->
```typescript
// Current deploy:complete flow (gameHandler.ts line ~271-285):
// After both ready, 3-second countdown, then:
//   room.status = 'playing';
//   io.to(roomId!).emit('deploy:complete', { board, currentTurn: 'red' });
//   // Red moves first, then bot should take over if it's bot's turn

// Current move:result emission (line ~378-388):
// io.to(roomId).emit('move:result', { move: { from, to }, outcome, ... });

// Bot auto-deploy already wired: socket.emit('auto-deploy') in game:started handler (line ~71)
// Bot auto-ready already wired: room.readyPlayers.add(botPlayer.id) in ready handler (line ~259)
```

<!-- Room type -->
```typescript
interface Room {
  id: string;
  hostId: string;
  players: Player[];
  status: 'waiting' | 'deploying' | 'playing' | 'finished';
  board: (Piece | null)[][];
  currentTurn: 'red' | 'blue';
  isBotGame: boolean;
  botSide: 'red' | 'blue' | null;
  scores: { red: number; blue: number; draws: number; gamesPlayed: number };
  deployedPieces: { red: Set<string>; blue: Set<string> };
  readyPlayers: Set<string>;
  rematchRequests?: Set<string>;
  rematchTimeout?: NodeJS.Timeout | null;
}
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Add applyBotMove helper to engine.ts</name>
  <files>server/src/game/engine.ts</files>
  <action>
    Add a board-only move application function to engine.ts that doesn't deep-clone the room. This is needed because botAI uses in-place board mutation for performance, but gameHandler's applyMove deep-clones the entire room each time.

    Add at the END of engine.ts (after checkWinCondition):

    ```typescript
    /**
     * Apply a move to the board IN-PLACE (mutates board), handles battle.
     * Used by bot AI for move execution. Does NOT toggle turn — caller manages turn state.
     * Returns the captured piece IDs for state tracking.
     */
    export function applyBotMove(
      board: (Piece | null)[][],
      from: Position,
      to: Position
    ): { capturedPieceIds: string[]; battleOutcome: BattleOutcome | null } {
      const piece = board[from.row][from.col];
      if (!piece) return { capturedPieceIds: [], battleOutcome: null };

      const target = board[to.row][to.col];
      let battleOutcome: BattleOutcome | null = null;
      const capturedPieceIds: string[] = [];

      if (target) {
        battleOutcome = resolveBattle(piece, target);
        // Remove captured pieces from board
        for (const capturedId of battleOutcome.capturedPieceIds) {
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 9; c++) {
              if (board[r][c]?.id === capturedId) {
                board[r][c] = null;
              }
            }
          }
          capturedPieceIds.push(capturedId);
        }
      }

      // Move piece
      board[to.row][to.col] = piece;
      board[from.row][from.col] = null;

      return { capturedPieceIds, battleOutcome };
    }
    ```
  </action>
  <verify>
    <automated>cd server && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>applyBotMove exists in engine.ts, accepts board (mutates in-place), returns {capturedPieceIds, battleOutcome}</done>
</task>

<task type="auto">
  <name>Task 2: Add bot turn trigger to gameHandler</name>
  <files>server/src/socket/handlers/gameHandler.ts</files>
  <action>
    Modify server/src/socket/handlers/gameHandler.ts to integrate bot AI:

    **1. Add import at the top (after existing engine imports):**
    ```typescript
    import { findBestMove } from '../../game/botAI';
    import { applyBotMove } from '../../game/engine';
    ```

    **2. Add a helper function at the top of gameHandler (after imports, before gameHandler export):**
    ```typescript
    /**
     * Trigger bot to make a move. Called after deploy:complete and after human moves.
     * Uses setImmediate to not block the event loop.
     */
    function triggerBotMove(io: Server, room: Room, roomId: string) {
      if (!room.isBotGame || !room.botSide) return;
      if (room.status !== 'playing') return;
      if (room.currentTurn !== room.botSide) return;

      setImmediate(() => {
        // Emit thinking start
        io.to(roomId).emit('bot:thinking-start', {});

        // Compute best move (bot AI)
        const move = findBestMove(room.board, room.botSide, 3000);

        if (!move) {
          // Bot has no valid moves — check win condition (should trigger game over)
          io.to(roomId).emit('bot:thinking-end', {});
          return;
        }

        // Apply bot move IN-PLACE to room board
        const { capturedPieceIds, battleOutcome } = applyBotMove(room.board, move.from, move.to);

        // Get attacker and defender for BattleReveal
        const attacker = room.board[move.to.row][move.to.col];
        const defender = capturedPieceIds.length > 0
          ? room.board[move.from.row][move.from.col] // actually this is wrong — let me fix
          : null;

        // Re-fetch defender: it was at move.to before the move
        // The defender piece is already removed from board. We need to store it.
        // Alternative: reconstruct from applyBotMove return. Let's use a different approach.

        // FIXED APPROACH: Get pieces BEFORE applyBotMove
        // Re-call: we need attacker at from, defender at to before mutation
        // Since applyBotMove mutates in-place, we need to capture BEFORE calling it.
        // Let me restructure: capture defender first, then apply

        // Reset board state (applyBotMove already moved it)
        // Actually applyBotMove already moved + removed captured. Let's just proceed.

        // For attacker/defender in BattleReveal: attacker is at move.to (after move), 
        // defender was at move.to (now null or captured). 
        // We need the original defender before capture. Let me use a workaround.
        // Get attacker position and defender position for BattleReveal
        const attackerPosition = move.to;
        const defenderPosition = move.to; // both at same square before resolution

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

          // Reveal all pieces
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

        // Emit bot move result
        io.to(roomId).emit('bot:thinking-end', {});
        io.to(roomId).emit('move:result', {
          move: { from: move.from, to: move.to },
          outcome: battleOutcome,
          attacker: attacker,
          defender: defender,
          attackerPosition: move.from,
          defenderPosition: move.to,
          board: room.board,
          currentTurn: room.currentTurn,
        });
      });
    }
    ```

    **ACTUAL IMPLEMENTATION — use this instead of the buggy version above:**
    
    ```typescript
    /**
     * Trigger bot to make a move. Called after deploy:complete and after human moves.
     * Uses setImmediate to not block the event loop.
     */
    function triggerBotMove(io: Server, room: Room, roomId: string) {
      if (!room.isBotGame || !room.botSide) return;
      if (room.status !== 'playing') return;
      if (room.currentTurn !== room.botSide) return;

      // Capture attacker and defender BEFORE applying move
      const attackerPiece = room.board[room.botSide === 'blue' ? 0 : 0] ?? null; // We'll get this below
      // Actually: attacker is at move.from, defender is at move.to
      // We compute the move first, then get pieces

      setImmediate(() => {
        io.to(roomId).emit('bot:thinking-start', {});

        const move = findBestMove(room.board, room.botSide, 3000);

        if (!move) {
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
    ```

    **3. Call triggerBotMove in deploy:complete section:**
    
    Find this code in the ready handler (around line 271):
    ```typescript
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
    ```
    
    **AFTER** the `io.to(roomId!).emit('deploy:complete', ...)` call, ADD:
    ```typescript
    // Trigger bot's first move (bot is blue, red moves first)
    // Bot waits for red to move, but if it's a bot-only testing scenario, trigger it
    // Actually: per game rules, red moves first. Bot (blue) will trigger after red's first move.
    // So we DON'T trigger bot here. Bot triggers when currentTurn === botSide.
    // No change needed here — bot will trigger when human's first move results in bot's turn.
    ```
    
    Actually, wait — bot should think AFTER the human's first move. Since deploy:complete sets currentTurn='red', the human moves first. After the human's first move, currentTurn becomes 'blue', which triggers the bot. So the deploy:complete section needs NO bot trigger.

    **4. Call triggerBotMove in make-move handler AFTER move:result emission:**
    
    Find the move:result emission at the end of the make-move handler (around line 378-388). 
    **AFTER** `io.to(roomId).emit('move:result', {...})`, ADD:
    ```typescript
    // For bot games: trigger bot to make its move
    if (room.isBotGame && room.botSide && room.currentTurn === room.botSide) {
      triggerBotMove(io, room, roomId);
    }
    ```
  </action>
  <verify>
    <automated>cd server && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>Bot auto-thinks and moves after human makes a move. bot:thinking-start and bot:thinking-end events emitted. Bot win conditions handled. Battle reveals work correctly.</done>
</task>

<task type="auto">
  <name>Task 3: Verify TypeScript compilation</name>
  <files>server/src/socket/handlers/gameHandler.ts</files>
  <action>
    Run TypeScript compiler to verify no type errors:
    
    ```bash
    cd server && npx tsc --noEmit 2>&1
    ```
    
    Fix any type errors. Common issues:
    - Missing imports (ensure Piece, Position, BattleOutcome from types)
    - Room type compatibility (rematchRequests/rematchTimeout are augmented types)
    - checkWinCondition import missing
    
    Also verify the engine.ts applyBotMove compiles:
    ```bash
    cd server && npx tsc --noEmit
    ```
  </action>
  <verify>
    <automated>cd server && npx tsc --noEmit 2>&1</automated>
  </verify>
  <done>TypeScript compiles with zero errors. Both engine.ts and gameHandler.ts are valid.</done>
</task>

</tasks>

<verification>
- cd server && npx tsc --noEmit → zero errors
- All existing game engine tests still pass: cd server && npm test -- --testPathPattern=engine -x
</verification>

<success_criteria>
- Bot auto-thinks and moves after each human move
- bot:thinking-start emitted before computation starts
- bot:thinking-end emitted after computation completes
- move:result emitted by bot with attacker/defender for BattleReveal
- Game over detection works for bot win/loss
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/phases/04-ai-opponent/04-ai-opponent-02-SUMMARY.md`
</output>
