# Phase 4: AI Opponent - Research

**Researched:** 2026-03-19
**Domain:** Minimax AI with alpha-beta pruning for hidden-information board games
**Confidence:** MEDIUM-HIGH

## Summary

This phase implements a Minimax AI opponent for Game of the Generals (Stratego-variant). The bot plays blue vs a human red player, auto-deploys via Fisher-Yates shuffle, and uses iterative deepening alpha-beta search (depth 1→3) with a 3-second time limit. The key challenge is evaluating hidden pieces (imperfect information) and avoiding deep clones on every recursive node. Key decisions already locked: captures-first move ordering, material-based eval with flag bonus, no positional bonuses.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Iterative deepening: depth 1 → 3, with 3-second time limit
- Standard alpha-beta pruning with move ordering (captures first)
- Evaluation: Material count (Colonel=10 down to Private=1), flag=100, mobility bonus
- Bot plays blue, human plays red
- Bot deployment: auto-deploy via Fisher-Yates shuffle (already in `generateAutoDeploy`)
- Bot starts thinking immediately when turn begins
- 0.5–1 second delay before bot moves (thinking indicator)
- Thinking indicator: text overlay, "Bot is thinking...", simple text, removed on move
- Bot auto-confirms rematches (already implemented)

### Claude's Discretion
- Positional bonuses (forward advancement, center control) — CONTEXT says no positional bonuses, but fine-tuning mobility/advancement within those constraints is open
- Evaluation function weights — flag=100, mobility bonus weight
- Move ordering beyond "captures first"

### Deferred Ideas (OUT OF SCOPE)
- Bot difficulty levels (easy/medium/hard)
- Multi-bot tournament mode
- Bot personality/profile (aggressive vs defensive style)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | Bot joins room as AI player slot | Lobby integration, bot pseudo-player via `isBotMode` flag |
| AI-02 | Bot auto-deploys when game starts | `generateAutoDeploy()` in engine.ts, Fisher-Yates shuffle already implemented |
| AI-03 | Bot makes strategic moves via Minimax | Minimax alpha-beta with iterative deepening, evaluation function, move generation |
| AI-04 | Bot shows thinking indicator during computation | Socket events `bot:thinking-start`/`bot:thinking-end`, text overlay on board |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| None (pure TypeScript) | — | Minimax/alpha-beta implementation | No external AI library needed for depth-3 search |

### Existing Reused Code
| Module | Purpose | Location |
|--------|---------|----------|
| `engine.ts` | `getValidMoves`, `applyMove`, `resolveBattle`, `generateAutoDeploy`, `checkWinCondition` | `server/src/game/engine.ts` |
| `checkNoValidMoves` | Win condition detection for AI evaluation | `server/src/game/engine.ts` |
| Socket.io | Event-driven bot trigger | `server/src/socket/index.ts` |
| `rematchHandler` | Bot auto-confirms rematch | `server/src/socket/handlers/rematchHandler.ts` |

**No new dependencies required.** All implementation is pure TypeScript.

### Implementation File Plan
```
server/src/game/
├── engine.ts         (existing — do not modify)
└── botAI.ts          (NEW — Minimax + alpha-beta)
server/src/socket/handlers/
├── gameHandler.ts    (MOD — bot turn trigger)
└── botHandler.ts     (NEW — bot socket events)
client/src/app/game/[roomId]/
└── page.tsx          (MOD — thinking indicator, bot socket events)
```

## Architecture Patterns

### Pattern 1: Non-blocking Bot Computation
**What:** Run Minimax search asynchronously so it doesn't block the Node.js event loop.
**Why:** Node.js is single-threaded; a depth-3 search on a 21-piece board can take seconds.
**Implementation:** Wrap search in `setImmediate` or `setTimeout(..., 0)` to yield to event loop, then use `Date.now()` time-checking inside the recursive search. The 3-second time limit must be enforced by checking `Date.now() > startTime + 3000` at each iteration boundary.

```typescript
// Source: general best practice for time-bounded search
export function findBestMove(
  board: (Piece | null)[][],
  botSide: 'red' | 'blue',
  maxTimeMs: number = 3000
): Move | null {
  const startTime = Date.now();
  let bestMove: Move | null = null;

  for (let depth = 1; depth <= 3; depth++) {
    if (Date.now() - startTime >= maxTimeMs) break;
    
    const result = alphaBetaSearch(
      board, depth,
      -Infinity, Infinity,
      botSide, 'blue',  // maximizing player + current player
      botSide,
      startTime, maxTimeMs
    );
    
    if (result.move) bestMove = result.move;
    if (Date.now() - startTime >= maxTimeMs) break;
  }

  return bestMove;
}
```

### Pattern 2: Make/Unmake for State Mutation (Avoid Deep Clone)
**What:** Instead of `JSON.parse(JSON.stringify(room))` on every node, mutate state in-place then restore it.
**Why:** Deep cloning an 8×9 board 21^depth times is expensive. Stratego boards are small enough that in-place mutation + undo is fast and avoids GC pressure.
**Implementation:**
```typescript
// Source: general chess programming best practice
interface UndoInfo {
  from: Position;
  to: Position;
  captured: Piece | null;
  previousTurn: 'red' | 'blue';
}

function makeMove(board: (Piece | null)[][], from: Position, to: Position): UndoInfo {
  const piece = board[from.row][from.col]!;
  const captured = board[to.row][to.col];
  board[to.row][to.col] = piece;
  board[from.row][from.col] = null;
  return { from, to, captured, previousTurn: piece.owner };
}

function unmakeMove(board: (Piece | null)[][], undo: UndoInfo): void {
  const piece = board[undo.to.row][undo.to.col]!;
  board[undo.from.row][undo.from.col] = piece;
  board[undo.to.row][undo.to.col] = undo.captured;
}
```

Note: `applyMove` in `engine.ts` already deep-clones the room. For AI search, we need a board-only variant that is faster. The AI module should implement board-level make/unmake instead of reusing `applyMove`.

### Pattern 3: Iterative Deepening with Alpha-Beta
**What:** Search depth 1, then 2, then 3, reusing previous depth's move ordering.
**Why:** Guarantees a best-available move even if time runs out. Better move ordering at deeper iterations.
```typescript
// Source: minimaxer library pattern (domwil.co.uk minimaxer/part2)
for (let depth = 1; depth <= MAX_DEPTH; depth++) {
  if (outOfTime(startTime, maxTime)) break;
  const { score, move } = alphaBeta(
    board, depth, -Infinity, Infinity,
    maximizing, currentPlayer, rootPlayer,
    startTime, maxTime
  );
  if (move) bestMove = move; // keep best from previous complete depth
}
```

### Pattern 4: Capture-First Move Ordering
**What:** At each node, sort moves so capture moves are evaluated first.
**Why:** Maximizes alpha-beta pruning efficiency — "killer moves" (captures) often cause beta cutoffs.
```typescript
function orderMoves(moves: Move[], board: (Piece | null)[][]): Move[] {
  return moves.sort((a, b) => {
    const aCaptures = board[a.to.row][a.to.col] !== null;
    const bCaptures = board[b.to.row][b.to.col] !== null;
    if (aCaptures && !bCaptures) return -1;
    if (!aCaptures && bCaptures) return 1;
    
    // Secondary: forward advancement for the bot (blue = down = higher row)
    const aForward = a.to.row - a.from.row; // positive for blue moving down
    const bForward = b.to.row - b.from.row;
    return bForward - aForward; // prioritize forward moves
  });
}
```

### Pattern 5: Bot Integration via Socket Events
**What:** Bot computation is triggered by socket events, not synchronous callbacks.
**Why:** `gameHandler.ts` processes human moves synchronously. Bot turn must be handled asynchronously.
**Flow:**
1. `move:result` emitted → client sees update → client's socket handler checks `currentTurn`
2. If `currentTurn === botSide` in a bot game: emit `bot:thinking-start`
3. Server-side bot handler calls `findBestMove()` asynchronously
4. When done: emit `bot:move` with `{ from, to }`
5. Client shows thinking indicator while waiting

Actually, the cleaner approach per CONTEXT decisions: the bot lives entirely on the server side. When `move:result` is emitted (or `deploy:complete`), `gameHandler` checks if it's the bot's turn. If so, the bot module computes the best move and applies it directly by calling internal game state update (not going through the socket for its own move — it owns the move internally).

```typescript
// In gameHandler.ts, after emitting move:result:
// Check if bot's turn
if (room.isBotGame && room.botSide && room.currentTurn === room.botSide) {
  // Bot thinks asynchronously
  setImmediate(() => {
    io.to(roomId!).emit('bot:thinking-start', {});
    const move = findBestMove(room.board, room.botSide!, 3000);
    if (move) {
      // Apply bot move directly (bypass socket to avoid loop)
      const { room: updated, battleOutcome } = applyMove(room, move.from, move.to);
      room.board = updated.board;
      room.currentTurn = updated.currentTurn;
      
      io.to(roomId!).emit('bot:thinking-end', {});
      io.to(roomId!).emit('move:result', {
        move: { from: move.from, to: move.to },
        outcome: battleOutcome,
        board: room.board,
        currentTurn: room.currentTurn,
      });
    }
  });
}
```

## Evaluation Function Design

### Principles (from research)
- Stratego is imperfect information — bot sees revealed enemy pieces only
- For unrevealed pieces, treat them as statistically most-likely values (standard officers/men)
- Simple material counting is surprisingly effective at depth 3
- Terminal states (win conditions) return ±INFINITY

### Recommended Evaluation Function

```typescript
// Source: PROJECT_SPECS.md §10.2 + research synthesis
const FLAG_VALUE = 100;
const MOBILITY_BONUS = 2; // per valid move
const WIN_BONUS = 10000;
const LOSS_PENALTY = -10000;

function evaluate(
  board: (Piece | null)[][],
  botSide: 'red' | 'blue',
  isTerminal: boolean = false
): number {
  if (isTerminal) {
    // Win/loss detected by checkWinCondition already
    // caller handles WIN_BONUS/LOSS_PENALTY
    return 0;
  }

  let score = 0;
  const opponent = botSide === 'blue' ? 'red' : 'blue';
  const botIsMaximizing = true;

  // Piece material value (known pieces only)
  // Rank mapping: 5-star=11, 4-star=10, ..., private=-1, spy=-2, flag=-3
  // For AI: use rank as value, map to positive scale
  const rankValue: Record<number, number> = {
    11: 11, 10: 10, 9: 9, 8: 8, 7: 7, 6: 6, 5: 5, 4: 4, 3: 3, 2: 2, 1: 1, 0: 0,
    [-1]: 1,   // private: low but can kill spy
    [-2]: 0.5, // spy: risky, low material value
    [-3]: 0,   // flag: not material
  };

  let botMaterial = 0;
  let oppMaterial = 0;
  let botMobility = 0;
  let oppMobility = 0;
  let botFlagSafe = false;
  let oppFlagExposed = false;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const value = rankValue[piece.rank] ?? 0;
      
      if (piece.owner === botSide) {
        botMaterial += value;
        if (piece.type !== 'flag') {
          botMobility += getValidMoves(board, piece).length;
        }
        if (piece.type === 'flag') {
          // Flag safe if not adjacent to enemy
          botFlagSafe = !hasAdjacentEnemy(board, r, c, opponent);
        }
      } else {
        if (piece.revealed) {
          oppMaterial += value;
        } else {
          // Unknown enemy piece: assume average officer value (weighted toward common pieces)
          // For simplicity: assume private (1) for unknown — conservative
          oppMaterial += 1;
        }
        if (piece.type !== 'flag') {
          oppMobility += getValidMoves(board, piece).length;
        }
        if (piece.type === 'flag' && piece.revealed) {
          oppFlagExposed = !hasAdjacentEnemy(board, r, c, botSide);
        }
      }
    }
  }

  score += botMaterial - oppMaterial;
  score += (botMobility - oppMobility) * MOBILITY_BONUS;
  
  // Flag safety bonus
  if (botFlagSafe) score += 5;
  if (oppFlagExposed) score += 10;

  return score;
}
```

### Handling Hidden Information
**Key insight:** At depth 3, the AI cannot see enemy piece identities. The evaluation function must:
1. Count only **revealed** enemy pieces by rank
2. For **unrevealed** enemy pieces, assign a conservative expected value (average piece ~3-4)
3. The AI will naturally develop strategies that expose enemy pieces (probe with low-rank pieces)

### Terminal State Detection
```typescript
function evaluateWithTerminal(
  board: (Piece | null)[][],
  botSide: 'red' | 'blue'
): number {
  // Build a temporary Room just for win check
  const tempRoom = { board, /* minimal other fields */ } as Room;
  const win = checkWinCondition(tempRoom);
  
  if (win.gameOver) {
    if (win.winner === botSide) return WIN_BONUS;
    if (win.winner === null) return 0; // tie
    return LOSS_PENALTY;
  }
  
  return evaluate(board, botSide);
}
```

## Time Management Strategy

### Requirements
- Start thinking immediately when bot's turn begins
- Maximum 3 seconds total
- Iterative deepening: complete depth 1, then 2, then 3
- Stop mid-iteration if time expires

### Implementation

```typescript
function findBestMove(
  board: (Piece | null)[][],
  botSide: 'red' | 'blue',
  maxTimeMs: number = 3000
): { from: Position; to: Position } | null {
  const startTime = Date.now();
  const humanSide = botSide === 'blue' ? 'red' : 'blue';
  let bestMove: { from: Position; to: Position } | null = null;
  let bestScore = -Infinity;

  for (let depth = 1; depth <= 3; depth++) {
    if (Date.now() - startTime >= maxTimeMs) break;

    const moves = getAllMovesForPlayer(board, botSide);
    const ordered = orderMoves(moves, board);

    for (const move of ordered) {
      if (Date.now() - startTime >= maxTimeMs) break;

      const undo = makeMove(board, move.from, move.to);
      const outcome = resolveMoveBattle(board, move.from, move.to);
      const isTerminal = isGameOverAfterMove(board, outcome);
      
      const score = alphaBeta(
        board, depth - 1,
        -Infinity, Infinity,
        false, // next turn is minimizing
        humanSide,
        botSide,
        startTime, maxTimeMs
      );

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

### Aborting Mid-Search
- Check `Date.now() - startTime >= maxTimeMs` at the **start** of each recursive call
- If time exceeded, return a "time-out" sentinel (e.g., `Infinity` or `-Infinity` depending on context)
- The root call interprets timeout: if no best move found yet, use the last complete-depth result

## Move Generation for Alpha-Beta

### Integration with Existing Engine
`getValidMoves(board, piece)` in `engine.ts` already returns valid destinations for a single piece. The AI module needs a wrapper:

```typescript
function getAllMovesForPlayer(
  board: (Piece | null)[][],
  playerSide: 'red' | 'blue'
): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece?.owner !== playerSide) continue;
      if (piece.type === 'flag') continue; // flags cannot move
      const destinations = getValidMoves(board, piece);
      for (const dest of destinations) {
        moves.push({ from: { row: r, col: c }, to: dest });
      }
    }
  }
  return moves;
}
```

### Cache Considerations
- With depth ≤ 3 and a small board (72 cells), memoization is **not critical**
- The branching factor averages ~3-5 moves per position (21 pieces, most blocked early)
- Estimated nodes at depth 3: ~10-50K, well within 3-second budget in Node.js
- Skip transposition tables for this phase — adds complexity without measurable benefit at depth 3

## Partial Information Handling (Hidden Pieces)

**Challenge:** The bot cannot see the human's piece identities. Unlike chess where all pieces are known, Stratego has fog of war.

**Simple approach (recommended for phase 1):**
- Evaluation counts only **revealed** enemy pieces
- Unrevealed enemy pieces are counted as minimum value (private = 1)
- The AI naturally prefers moves that are "safe" (don't attack unknown pieces unless necessary)
- The random deployment means enemy positions are uncertain anyway

**Refinement (future):**
- Track probability distributions over unknown pieces based on revealed information
- Use Monte Carlo or sampling-based evaluation
- Belief networks (as used by DeepNash/DeepMind's 2022 research)

## Stratego-Specific Heuristics (Low Priority for Depth 3)

Research on DeepNash (DeepMind, 2022) confirms that Stratego with imperfect information is extremely challenging — state-of-the-art requires model-free deep RL. For a depth-3 Minimax bot:

1. **Scout advancement**: Low-ranked pieces (Sergeants, Lieutenants) should advance to probe the enemy
2. **High-rank protection**: Keep generals back until enemy is revealed
3. **Flag hiding**: Auto-deploy already randomizes flag position; no additional logic needed
4. **No unnecessary fights**: Avoid attacking unknown pieces unless forced (captured by game rules)

These emerge naturally from the material evaluation + mobility bonus at depth 3.

## Socket Integration

### New Events to Add

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `bot:thinking-start` | Server → Client | `{}` | Show thinking overlay |
| `bot:thinking-end` | Server → Client | `{}` | Hide thinking overlay |

Note: The bot's actual move is applied internally in `gameHandler` and broadcast as `move:result` — no new `bot:move` event needed. The thinking indicator is purely UX.

### Client Integration (game page)
```typescript
// In the game page.tsx socket useEffect:
const [botThinking, setBotThinking] = useState(false);

// Add listeners:
socket.on('bot:thinking-start', () => setBotThinking(true));
socket.on('bot:thinking-end', () => setBotThinking(false));

// Render thinking overlay:
{botThinking && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-40">
    <p className="text-white text-xl font-medium animate-pulse">Bot is thinking...</p>
  </div>
)}
```

## Common Pitfalls

### Pitfall 1: Deep Cloning on Every Node
**What goes wrong:** `JSON.parse(JSON.stringify(room))` on every recursive call → massive GC pressure, 3-second timeout exceeded.
**How to avoid:** Use make/unmake pattern with in-place board mutation. Only copy what you need (the 8×9 board array).
**Warning signs:** Bot taking >2s for depth 1, frequent GC pauses in Node.js.

### Pitfall 2: Blocking the Event Loop
**What goes wrong:** Running Minimax synchronously blocks all socket connections.
**How to avoid:** Wrap bot computation in `setImmediate()` or `setTimeout(fn, 0)` to yield. The 3-second time limit still applies internally via `Date.now()`.
**Warning signs:** Client doesn't receive `move:result` for 3+ seconds, looks frozen.

### Pitfall 3: Move Loop vs. Apply Move Inconsistency
**What goes wrong:** `getValidMoves` checks `board[nr][nc]?.owner !== piece.owner`, but the AI make/unmake bypasses this and modifies board state directly.
**How to avoid:** AI move generation must use the same `getValidMoves`/`canMove` logic as the engine. Only the state mutation (make/unmake) differs.

### Pitfall 4: Ignoring Revealed vs. Unrevealed Pieces in Evaluation
**What goes wrong:** Counting unrevealed enemy pieces as full value → AI becomes too aggressive or too passive.
**How to avoid:** Only count revealed enemy pieces by rank. Assign conservative value to unknowns.

### Pitfall 5: Bot Triggering Itself
**What goes wrong:** Bot move triggers `move:result` → client update → bot turn check → bot computes → emits `move:result` → infinite loop.
**How to avoid:** Bot applies moves **directly** to room state in `gameHandler` and emits `move:result` itself. It should NOT listen to its own `move:result` events.

### Pitfall 6: Thinking Indicator Persists
**What goes wrong:** If bot crashes or times out completely, thinking indicator never disappears.
**How to avoid:** Use `try/finally` to always emit `bot:thinking-end`. Set a fallback `setTimeout` at 3.5s to ensure cleanup.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Game tree state management | Deep clone per node | Make/unmake in-place mutation | 10-50x faster, minimal memory overhead |
| Move generation | Custom loop | `getValidMoves()` from engine.ts | Already tested, matches game rules exactly |
| Win condition checking | Duplicate checkWinCondition | Import from engine.ts | Already has flag capture, baseline, no-moves |
| Random deployment | Write new shuffle | `generateAutoDeploy()` from engine.ts | Fisher-Yates already implemented and tested |
| Battle resolution | Custom battle logic | `resolveBattle()` from engine.ts | Handles spy/private/flag/tie rules |
| Time-bounded search | Blocking while loop | `setImmediate` + `Date.now()` check | Doesn't block Node.js event loop |

## Open Questions

1. **What value should the AI assign to unrevealed enemy pieces?**
   - Conservative (private=1): AI plays defensively, waits for enemy to reveal
   - Aggressive (average officer): AI attacks more, but risks high-rank vs spy
   - **Recommendation:** Start with conservative (1), tune upward if bot plays too passively

2. **Should the AI use a transposition table (hash of board state → score)?**
   - Pro: Avoids re-computing same positions from different move orders
   - Con: Complexity overhead, unlikely to revisit same position at depth ≤ 3
   - **Recommendation:** Skip for phase 1. Add if depth increases to 5+.

3. **How to handle the 0.5-1s delay — is this purely UX or does it serve a purpose?**
   - Purely UX (feels more natural, not robotic instant response)
   - **Implementation:** `setTimeout(() => emit move, 500-1000)` after `bot:thinking-start`
   - Note: The thinking indicator covers both computation time AND the delay

## Code Structure Recommendations

### New File: `server/src/game/botAI.ts`

```typescript
// Key exports:
export interface Move { from: Position; to: Position; }
export function findBestMove(board: ..., botSide: ..., maxTimeMs?: number): Move | null
export function evaluateBoard(board: ..., botSide: ...): number

// Internal:
function alphaBeta(board: ..., depth: number, alpha: number, beta: number,
  isMaximizing: boolean, currentPlayer: ..., rootPlayer: ...,
  startTime: number, maxTime: number): number
function getAllMovesForPlayer(board: ..., player: ...): Move[]
function orderMoves(moves: Move[], board: ...): Move[]
function makeMove(board: ..., from: Position, to: Position): UndoInfo
function unmakeMove(board: ..., undo: UndoInfo): void
```

### New File: `server/src/socket/handlers/botHandler.ts`

Minimal — mainly registers bot event handlers. Most bot logic lives in `gameHandler` which already has access to room state. Could alternatively add bot logic directly to `gameHandler.ts` as a new section.

### Modifications

**`server/src/socket/handlers/gameHandler.ts`:**
- Add import for `findBestMove` from `botAI.ts`
- After `move:result` emission and win-check: add bot turn trigger
- After `deploy:complete`: add bot auto-ready + bot deployment trigger

**`client/src/app/game/[roomId]/page.tsx`:**
- Add `botThinking` state
- Add socket listeners for `bot:thinking-start`/`bot:thinking-end`
- Render thinking overlay above board

**`server/src/socket/index.ts`:**
- Optionally register `botHandler` (if split out)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Perfect-information Minimax (chess-style) | Imperfect-information eval (revealed-only) | Stratego requires this | AI can't "see" enemy pieces |
| DeepNash (RL-based, DeepMind 2022) | Rule-based Minimax depth-3 | This project | Feasible for single-file implementation, no GPU needed |
| Iterative deepening with fixed depth | Time-bounded deepening (3s limit) | Became standard | Ensures AI responds within UX budget |

**Deprecated/outdated:**
- Transposition tables at low depth (complexity without benefit for depth ≤ 3)
- Complex belief networks for piece probability (too complex for this phase)

## Sources

### Primary (HIGH confidence)
- `server/src/game/engine.ts` — getValidMoves, applyMove, resolveBattle, checkWinCondition, generateAutoDeploy
- `server/src/socket/handlers/gameHandler.ts` — existing game flow, integration points
- `server/src/socket/handlers/rematchHandler.ts` — bot auto-confirm already implemented
- PROJECT_SPECS.md §10 — AI evaluation formula, §3 — game rules
- 04-CONTEXT.md — locked decisions
- `server/tests/engine.test.ts` — battle resolution test patterns

### Secondary (MEDIUM confidence)
- [domwil.co.uk minimaxer/part2](https://domwil.co.uk/minimaxer/part2/) — iterative deepening, alpha-beta pattern
- [domwil.co.uk minimaxer/part4](https://domwil.co.uk/minimaxer/part4/) — make/unmake, move ordering optimization
- [larswaechter.dev minimax-performance](https://larswaechter.dev/blog/minimax-performance-improvements/) — pre-sorting, reduce moves
- [minimax.dev efficient-representation](https://minimax.dev/docs/ultimate/efficient-representation) — mutable boards with undo()

### Tertiary (LOW confidence)
- [DeepNash/DeepMind Science 2022](https://www.science.org/doi/10.1126/science.add4679) — Stratego AI state of the art (reinforcement learning approach, not applicable to rule-based depth-3)
- [arXiv:2206.15378](https://ar5iv.labs.arxiv.org/html/2206.15378) — DeepNash paper methodology (too complex for phase 1)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (already configured) |
| Config file | `server/jest.config.js` |
| Quick run command | `cd server && npm test -- --testPathPattern=botAI` |
| Full suite command | `cd server && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|------------------|-------------|
| AI-03 | `findBestMove` returns a valid move (within time, respects rules) | unit | `jest tests/botAI.test.ts` | ❌ Wave 0 |
| AI-03 | Evaluation scores favor material advantage | unit | `jest tests/botAI.test.ts` | ❌ Wave 0 |
| AI-03 | Alpha-beta respects alpha/beta bounds | unit | `jest tests/botAI.test.ts` | ❌ Wave 0 |
| AI-03 | Time limit enforced — returns best move from previous depth on timeout | unit | `jest tests/botAI.test.ts` | ❌ Wave 0 |
| AI-03 | Make/unmake restores board correctly | unit | `jest tests/botAI.test.ts` | ❌ Wave 0 |
| AI-04 | `evaluateBoard` higher when bot has material advantage | unit | `jest tests/botAI.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd server && npm test -- --testPathPattern=botAI -x`
- **Per wave merge:** `cd server && npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `server/tests/botAI.test.ts` — Minimax search, evaluation, make/unmake, time limit
- [ ] `server/tests/botEvaluation.test.ts` — Evaluation function correctness
- Framework install: Jest already in `server/package.json` devDependencies ✅

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pure TypeScript, no external AI libraries needed
- Architecture: HIGH — patterns well-established, board is small (72 cells)
- Evaluation function: MEDIUM — simple material count works at depth 3, hidden piece handling is heuristic
- Time management: MEDIUM — `Date.now()` check approach works but needs careful placement at recursion boundaries
- Pitfalls: MEDIUM — several known pitfalls documented with prevention strategies

**Research date:** 2026-03-19
**Valid until:** ~90 days — Minimax patterns are stable; only evaluation function tuning varies