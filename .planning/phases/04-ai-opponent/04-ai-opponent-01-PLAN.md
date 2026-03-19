---
phase: 04-ai-opponent
plan: 01
type: tdd
wave: 1
depends_on: []
files_modified:
  - server/src/game/botAI.ts
  - server/tests/botAI.test.ts
autonomous: false
requirements:
  - AI-03
user_setup: []

must_haves:
  truths:
    - "Bot evaluates board positions based on material count"
    - "Bot uses alpha-beta pruning to search depth 1-3"
    - "Bot respects 3-second time limit via iterative deepening"
    - "Bot makes valid moves following game rules"
  artifacts:
    - path: "server/src/game/botAI.ts"
      provides: "Minimax AI with alpha-beta pruning"
      exports:
        - findBestMove
        - evaluateBoard
        - getAllMovesForPlayer
        - makeMove
        - unmakeMove
        - orderMoves
    - path: "server/tests/botAI.test.ts"
      provides: "Unit tests for bot AI"
      tests: 20+
  key_links:
    - from: "server/src/game/botAI.ts"
      to: "server/src/game/engine.ts"
      via: "import getValidMoves, applyMove, resolveBattle, checkWinCondition"
      pattern: "from.*engine"
    - from: "server/src/game/botAI.ts"
      to: "server/src/types/index.ts"
      via: "import Piece, Position, Room, BattleOutcome"
      pattern: "from.*types"
---

<objective>
Implement the core Minimax AI with alpha-beta pruning in botAI.ts using TDD. Bot plays blue vs human red. Implements iterative deepening (depth 1→3) with 3-second time limit, capture-first move ordering, and material-based evaluation.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-tdd-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@server/src/game/engine.ts
@server/src/types/index.ts
@server/tests/engine.test.ts
</context>

<interfaces>
<!-- Key types and contracts the bot AI will use. Extracted from existing codebase. -->

From server/src/types/index.ts:
```typescript
export interface Piece {
  id: string;
  type: PieceType;
  owner: 'red' | 'blue';
  rank: PieceRank; // 11 (5-star) down to -3 (flag)
  revealed: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface BattleOutcome {
  winner: 'red' | 'blue' | 'tie';
  capturedPieceIds: string[];
  attackerWins: boolean | null;
  attackerRevealed: boolean;
  defenderRevealed: boolean;
}

export type PieceRank = 11 | 10 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 | -1 | -2 | -3;
```

From server/src/game/engine.ts (key functions to import and reuse):
```typescript
// These are the exact signatures from engine.ts
export function getValidMoves(board: (Piece | null)[][], piece: Piece): Position[]
export function resolveBattle(attacker: Piece, defender: Piece): BattleOutcome
export function checkWinCondition(room: Room): WinResult
export interface WinResult {
  gameOver: boolean;
  winner: 'red' | 'blue' | null;
  reason: 'flag_captured' | 'flag_baseline' | 'no_moves' | null;
}
```

Piece rank mapping (from PIECE_CONFIG):
- 5-star=11, 4-star=10, 3-star=9, 2-star=8, 1-star=7
- colonel=6, lieutenant-colonel=5, major=4, captain=3, 1st-lieutenant=2, 2nd-lieutenant=1
- sergeant=0, private=-1, spy=-2, flag=-3
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task W0: Create botAI test scaffold</name>
  <files>server/tests/botAI.test.ts</files>
  <behavior>
    - Test: makeMove/unmakeMove correctly mutates and restores board
    - Test: orderMoves sorts captures first
    - Test: evaluateBoard returns higher score when bot has material advantage
    - Test: evaluateBoard counts revealed pieces only (unknown=1)
    - Test: getAllMovesForPlayer returns all valid moves for a player
    - Test: findBestMove returns null when no moves available
    - Test: findBestMove returns a move within time limit (≤3s)
    - Test: findBestMove completes at least depth 1 on timeout scenario
    - Test: alphaBeta returns score respecting alpha/beta bounds
    - Test: terminal positions (game over) return WIN_BONUS or LOSS_PENALTY
    - Test: mobility bonus increases score when bot has more moves
    - Test: iterative deepening increases depth on successive iterations
  </behavior>
  <action>
    Create server/tests/botAI.test.ts with the following test structure:
    
    1. **makeMove / unmakeMove tests** — Create a simple board with 1 piece, call makeMove, verify board changed, call unmakeMove, verify board restored. Test with a capture scenario.
    
    2. **orderMoves tests** — Generate moves on a board, some are captures, some are not. Assert captures appear before non-captures in sorted result.
    
    3. **evaluateBoard tests** — 
       - Bot (blue) has 5-star on board, opponent (red) has colonel → score > 0 for blue
       - Both sides equal material → score ≈ 0
       - Blue has mobility advantage (more valid moves) → score > 0 for blue
       - Unknown enemy pieces counted conservatively (value=1)
    
    4. **getAllMovesForPlayer tests** —
       - Return empty array when no pieces
       - Return moves for all mobile pieces
       - Never return moves for flags
    
    5. **findBestMove tests** —
       - Simple board with only one possible move → returns that move
       - Time limit: measure execution time, assert ≤ 3500ms
       - Returns null when no moves (e.g., all pieces blocked)
    
    6. **alphaBeta tests** —
       - Maximizing player gets higher score than minimizing
       - Alpha/beta bounds respected (score never exceeds beta on minimizing, never below alpha on maximizing)
    
    7. **Terminal state tests** —
       - checkWinCondition returns WIN_BONUS (10000) when bot wins
       - checkWinCondition returns LOSS_PENALTY (-10000) when bot loses
    
    Use helper functions:
    ```typescript
    function emptyBoard(): (Piece | null)[][] {
      return Array(8).fill(null).map(() => Array(9).fill(null));
    }
    function makePiece(type: string, owner: 'red' | 'blue', rank: number, id?: string): Piece {
      return { id: id || `${type}-${owner}-${Math.random().toString(36).slice(2,6)}`, type: type as any, owner, rank: rank as any, revealed: false };
    }
    function makeRoom(overrides: Partial<Room> = {}): Room {
      return { id: 'TEST', hostId: 'h', players: [{id:'r',name:'r',side:'red'},{id:'b',name:'b',side:'blue'}], status: 'playing', board: emptyBoard(), currentTurn: 'red', isBotGame: true, botSide: 'blue', scores: {red:0,blue:0,draws:0,gamesPlayed:0}, deployedPieces: {red:new Set(),blue:new Set()}, readyPlayers: new Set(), ...overrides } as Room;
    }
    ```
    
    **IMPORTANT:** Import from engine.ts uses `import { ... } from '../src/game/engine'`. Import Room, Piece from '../src/types'.
  </action>
  <verify>
    <automated>cd server && npm test -- --testPathPattern=botAI -x 2>&1 | head -30</automated>
  </verify>
  <done>Test file exists with ≥15 failing tests covering all core bot AI behaviors</done>
</task>

<task type="auto" tdd="true">
  <name>Task T1: Implement botAI.ts core functions</name>
  <files>server/src/game/botAI.ts</files>
  <behavior>
    - RED phase: Tests from Task W0 run and FAIL (tests describe expected behavior)
    - GREEN phase: Minimal implementation makes tests pass
    - REFACTOR phase: Clean up, add JSDoc comments
  </behavior>
  <action>
    Create server/src/game/botAI.ts implementing the following in order:

    **1. Types & Constants:**
    ```typescript
    import { Piece, Position, Room, BattleOutcome } from '../types';
    import { getValidMoves, resolveBattle, checkWinCondition } from './engine';

    export interface Move { from: Position; to: Position; }
    export interface UndoInfo { from: Position; to: Position; captured: Piece | null; }

    const FLAG_VALUE = 100;
    const MOBILITY_BONUS = 2;  // per valid move
    const WIN_BONUS = 10000;
    const LOSS_PENALTY = -10000;
    const MAX_DEPTH = 3;
    const MAX_TIME_MS = 3000;
    ```

    **2. makeMove / unmakeMove** — In-place board mutation (DO NOT deep clone):
    ```typescript
    export function makeMove(board: (Piece | null)[][], from: Position, to: Position): UndoInfo {
      const piece = board[from.row][from.col]!;
      const captured = board[to.row][to.col];
      board[to.row][to.col] = piece;
      board[from.row][from.col] = null;
      return { from, to, captured };
    }
    export function unmakeMove(board: (Piece | null)[][], undo: UndoInfo): void {
      const piece = board[undo.to.row][undo.to.col]!;
      board[undo.from.row][undo.from.col] = piece;
      board[undo.to.row][undo.to.col] = undo.captured;
    }
    ```

    **3. orderMoves** — Sort captures first, then forward advancement:
    ```typescript
    export function orderMoves(moves: Move[], board: (Piece | null)[][]): Move[] {
      return [...moves].sort((a, b) => {
        const aCaptures = board[a.to.row][a.to.col] !== null;
        const bCaptures = board[b.to.row][b.to.col] !== null;
        if (aCaptures && !bCaptures) return -1;
        if (!aCaptures && bCaptures) return 1;
        return 0;
      });
    }
    ```

    **4. getAllMovesForPlayer** — Collect all valid moves for a player:
    ```typescript
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
    ```

    **5. evaluateBoard** — Material count + mobility (hidden pieces = private=1):
    ```typescript
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
    ```

    **6. alphaBeta** — Recursive alpha-beta with time checking:
    ```typescript
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
      if (Date.now() - startTime >= maxTime) return isMaximizing ? -Infinity : Infinity;

      // Terminal depth
      if (depth === 0) {
        const tempRoom: Room = { board, players: [], status: 'playing', id: 'T', hostId: '', currentTurn: currentPlayer, isBotGame: false, botSide: null, scores: {red:0,blue:0,draws:0,gamesPlayed:0}, deployedPieces: {red: new Set(), blue: new Set()}, readyPlayers: new Set() } as Room;
        const win = checkWinCondition(tempRoom);
        if (win.gameOver) {
          return win.winner === botSide ? WIN_BONUS : (win.winner === null ? 0 : LOSS_PENALTY);
        }
        return isMaximizing ? evaluateBoard(board, botSide) : -evaluateBoard(board, botSide);
      }

      const moves = getAllMovesForPlayer(board, currentPlayer);
      if (moves.length === 0) {
        const tempRoom: Room = { board, players: [], status: 'playing', id: 'T', hostId: '', currentTurn: currentPlayer, isBotGame: false, botSide: null, scores: {red:0,blue:0,draws:0,gamesPlayed:0}, deployedPieces: {red: new Set(), blue: new Set()}, readyPlayers: new Set() } as Room;
        const win = checkWinCondition(tempRoom);
        if (win.gameOver) return win.winner === botSide ? WIN_BONUS : LOSS_PENALTY;
        return isMaximizing ? -evaluateBoard(board, botSide) : evaluateBoard(board, botSide);
      }

      const ordered = orderMoves(moves, board);
      const nextPlayer = currentPlayer === 'red' ? 'blue' : 'red';

      if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of ordered) {
          if (Date.now() - startTime >= maxTime) break;
          const undo = makeMove(board, move.from, move.to);
          // Simulate battle outcome
          const target = board[move.to.row][move.to.col];
          if (target && target.owner !== botSide) {
            const attacker = board[move.to.row][move.to.col]!;
            const defender = board[undo.from.row][undo.from.col]!;
            const outcome = resolveBattle(attacker, defender);
            // Apply captured pieces (simplified — remove from board)
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
    ```

    **7. findBestMove** — Iterative deepening with time management:
    ```typescript
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
    ```

    **IMPORTANT IMPLEMENTATION NOTES:**
    - Board is mutated IN-PLACE during search — makeMove/unmakeMove handle undo
    - Use setImmediate wrapper in the caller (gameHandler), NOT in botAI.ts
    - alphaBeta at each node checks time BEFORE doing any work
    - Import Room type from '../types' (not the Room interface — it needs to be reconstructed)
    - The Room objects in alphaBeta are minimal stubs needed only for checkWinCondition
    - All piece refs in alphaBeta use the in-place mutated board
  </action>
  <verify>
    <automated>cd server && npm test -- --testPathPattern=botAI -x 2>&1 | tail -20</automated>
  </verify>
  <done>All botAI tests pass. findBestMove returns valid Move objects, evaluateBoard reflects material balance, alpha-beta respects bounds, iterative deepening completes within time.</done>
</task>

</tasks>

<verification>
- cd server && npm test -- --testPathPattern=botAI → all pass
- cd server && npx tsc --noEmit → no errors
</verification>

<success_criteria>
- botAI.ts exports: findBestMove, evaluateBoard, getAllMovesForPlayer, makeMove, unmakeMove, orderMoves
- ≥15 unit tests covering: make/unmake, orderMoves, evaluateBoard, getAllMovesForPlayer, findBestMove (time, validity), alphaBeta bounds, terminal states
- TypeScript compiles with no errors
- Tests run in <10 seconds
</success_criteria>

<output>
After completion, create `.planning/phases/04-ai-opponent/04-ai-opponent-01-SUMMARY.md`
</output>
