# Phase 3: Game Flow - Research

**Researched:** 2026-03-19
**Domain:** Win condition detection, game-over flow, session scoring, rematch
**Confidence:** HIGH

## Summary

Phase 3 implements the complete game flow: detecting win conditions after each move, announcing winners, tracking session scores, and enabling rematches. The server must check three win conditions (flag captured, flag at baseline, no valid moves) after every `make-move` and emit `game:over`. The client displays a modal overlay, updates header scores, and manages the rematch confirmation flow with a 30-second timeout.

**Primary recommendation:** Implement win condition functions in `engine.ts` (pure, testable), emit `game:over` in `gameHandler.ts` after `applyMove`, create `WinModal.tsx` following BattleReveal's overlay pattern, extend `roomStore.ts` with `scores`, and wire rematch handlers on both client and server.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Win announcement:** Modal overlay over board, shows winner+reason+scores, Rematch+Leave buttons, tasteful celebration style
- **Game over board:** Board freezes (no selection/clicks), all pieces revealed, no board indicators, empty squares for eliminated
- **Rematch:** Both must confirm, scores persist, fresh deployment, 30s timeout
- **Score display:** Always in header, full format ("Red: 3 wins | Blue: 2 wins | Draws: 1"), room-scoped, no explicit reset button

### Claude's Discretion
- Exact modal styling (colors, typography, animation timing)
- Header score layout (exact positioning, font size)
- Rematch confirmation UI (inline vs modal prompt)
- Server-side win condition detection implementation

### Deferred Ideas (OUT OF SCOPE)
- Move history display (UX-02) — Phase 5+
- Piece movement animations (UX-01) — Phase 5+
- Undo move for friendly games (UX-03) — Phase 5+
- Chat during game (SOCL-01) — Phase 5+
- Sound effects (battle explosion, win fanfare) — future phase
- Spectating — Phase 5+
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WIN-01 | Game ends when flag is captured | `checkFlagCapture()` — iterate board, if flag owner's opponent has a piece, game over |
| WIN-02 | Game ends when flag reaches opposite baseline with no adjacent enemies | `checkFlagBaseline()` — flag at row 0 (red) or row 7 (blue), check no adjacent opponent pieces |
| WIN-03 | Game ends when player has no valid moves | `hasValidMoves()` — for each piece, check `canMove()` returns valid |
| WIN-04 | Winner is announced with reason | `game:over` socket event includes `winner` + `reason` string |
| SES-01 | Session scores track wins/losses/draws | Room.scores: `{ red, blue, draws, gamesPlayed }`, persisted across rematches |
| SES-02 | User can request rematch after game ends | `rematch` socket event, `rematch:ready` with `bothReady` flag, 30s timeout |
| SES-03 | Host can reset scores | `reset-scores` socket event, host-only guard |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Jest | ^29.x | Server unit tests | Already set up with ts-jest in Phase 2 |
| Zustand | ^4.x | Client state (gameStore, roomStore) | Already used, add scores/rematch state |
| Socket.io | ^4.x | Real-time events | Already set up |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | ^3.x | Modal styling | WinModal component, header scores |
| nanoid | ^3.x | Room code generation | Already in use for room IDs |

---

## Architecture Patterns

### Recommended Project Structure
```
server/src/game/
├── engine.ts          # add: checkWinCondition(), hasValidMoves()
└── engine.test.ts     # add: win condition tests

server/src/socket/handlers/
├── gameHandler.ts     # extend: win check after applyMove, emit game:over
├── rematchHandler.ts  # NEW: rematch/reset-scores handlers
└── handlers.ts        # export all handlers

client/src/store/
├── gameStore.ts       # add: winner, winReason, resetForRematch()
└── roomStore.ts       # add: scores, opponentWantsRematch, resetForRematch()

client/src/features/game/
├── WinModal.tsx       # NEW: game over overlay
└── ScoreDisplay.tsx   # NEW: header scores component

client/src/app/game/[roomId]/
└── page.tsx          # extend: scores display, rematch state, WinModal
```

### Pattern 1: Win Condition Detection (Server-Side)
**What:** Three pure functions in `engine.ts` that check game-ending conditions after each move
**When to use:** After `applyMove()` in `make-move` handler, before emitting `move:result`
**Example:**
```typescript
// engine.ts

/**
 * WIN-01: Check if either flag has been captured.
 * Returns the winner ('red'/'blue') or null if no flag captured.
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
  if (!redHasFlag) return 'blue';  // blue captured red's flag
  if (!blueHasFlag) return 'red'; // red captured blue's flag
  return null;
}

/**
 * WIN-02: Check if flag reached opposite baseline with no adjacent enemies.
 * Returns the flag owner's side if they won, or null.
 */
export function checkFlagBaseline(room: Room): 'red' | 'blue' | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = room.board[r][c];
      if (piece?.type === 'flag') {
        // Red flag at row 7 (opponent's baseline) = red wins
        if (piece.owner === 'red' && r === 7) {
          if (!hasAdjacentEnemy(room, r, c, 'blue')) return 'red';
        }
        // Blue flag at row 0 (opponent's baseline) = blue wins
        if (piece.owner === 'blue' && r === 0) {
          if (!hasAdjacentEnemy(room, r, c, 'red')) return 'blue';
        }
      }
    }
  }
  return null;
}

function hasAdjacentEnemy(room: Room, row: number, col: number, enemySide: 'red' | 'blue'): boolean {
  const directions = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of directions) {
    const nr = row + dr, nc = col + dc;
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 9) continue;
    const occupant = room.board[nr][nc];
    if (occupant?.owner === enemySide) return true;
  }
  return false;
}

/**
 * WIN-03: Check if a player has any valid moves.
 * Returns 'red'/'blue' if that player has no moves, null if both have moves.
 */
export function checkNoValidMoves(room: Room): 'red' | 'blue' | null {
  for (const player of ['red', 'blue'] as const) {
    if (!playerHasValidMove(room, player)) return player;
  }
  return null;
}

function playerHasValidMove(room: Room, playerSide: 'red' | 'blue'): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = room.board[r][c];
      if (piece?.owner === playerSide) {
        const moves = getValidMoves(room.board, piece);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}

/**
 * Master win condition checker — call after every move.
 */
export interface WinResult {
  gameOver: boolean;
  winner: 'red' | 'blue' | null;
  reason: 'flag_captured' | 'flag_baseline' | 'no_moves' | null;
}
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
```

### Pattern 2: game:over Emission (Server-Side)
**What:** After `applyMove()`, call `checkWinCondition()`, update scores, emit `game:over`
**When to use:** At end of `make-move` handler after `applyMove()` succeeds
**Example:**
```typescript
// gameHandler.ts - in make-move handler, after applyMove()

const { room: updatedRoom, battleOutcome } = applyMove(room, from, to);

// Update room state first
room.board = updatedRoom.board;
room.currentTurn = updatedRoom.currentTurn;
room.deployedPieces = updatedRoom.deployedPieces;

// Check win conditions (add these lines)
const winResult = checkWinCondition(room);

if (winResult.gameOver) {
  // Update scores
  room.status = 'finished';
  room.scores.gamesPlayed++;
  if (winResult.winner === 'red') room.scores.red++;
  else if (winResult.winner === 'blue') room.scores.blue++;
  else room.scores.draws++; // should not happen with current win conditions

  // Emit game:over FIRST (before move:result or after, both clients see game state)
  io.to(roomId).emit('game:over', {
    winner: winResult.winner,
    reason: winResult.reason, // 'flag_captured' | 'flag_baseline' | 'no_moves'
    scores: room.scores,
  });
  io.to(roomId).emit('scores:update', { scores: room.scores });
  
  console.log(`Game over in room ${roomId}: ${winResult.winner} wins by ${winResult.reason}`);
  return; // Don't emit move:result for the final move (or emit with gameOver flag)
}

// Normal move: emit move:result as before
io.to(roomId).emit('move:result', { ... });
```

### Pattern 3: Win Modal (Client-Side)
**What:** Overlay component following BattleReveal's pattern — absolute positioned over board
**When to use:** When `gameStatus === 'finished'` and `winner` is set
**Example:**
```typescript
// WinModal.tsx
'use client';
import React, { useState } from 'react';

interface WinModalProps {
  winner: 'red' | 'blue' | null;  // null = draw
  reason: 'flag_captured' | 'flag_baseline' | 'no_moves';
  scores: { red: number; blue: number; draws: number; gamesPlayed: number };
  onRematch: () => void;
  onLeave: () => void;
  opponentWantsRematch?: boolean;
}

const REASON_TEXT = {
  flag_captured: 'Flag Captured!',
  flag_baseline: 'Flag Reached Baseline!',
  no_moves: 'No Valid Moves!',
};

export default function WinModal({ winner, reason, scores, onRematch, onLeave, opponentWantsRematch }: WinModalProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const winnerName = winner === null ? 'Draw' : winner === 'red' ? 'Red' : 'Blue';
  const isWinner = winner !== null;

  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#2d4a2d] rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl border-2 border-[#d4a847]">
        {/* Winner banner */}
        <div className="text-center mb-6">
          <div className={`text-5xl mb-2 ${winner === 'red' ? 'text-red-500' : winner === 'blue' ? 'text-blue-500' : 'text-gray-400'}`}>
            {winner === 'red' ? '🏆' : winner === 'blue' ? '🏆' : '🤝'}
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">
            {winnerName} Wins!
          </h2>
          <p className="text-[#d4a847] text-lg">{REASON_TEXT[reason]}</p>
        </div>

        {/* Scores */}
        <div className="bg-[#1a2e1a] rounded-lg p-4 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-red-400">Red: {scores.red} wins</span>
            <span className="text-gray-400">Draws: {scores.draws}</span>
            <span className="text-blue-400">Blue: {scores.blue} wins</span>
          </div>
        </div>

        {/* Rematch state */}
        {opponentWantsRematch ? (
          <div className="text-center mb-4">
            <p className="text-yellow-400 animate-pulse">Opponent wants a rematch…</p>
          </div>
        ) : !showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-3 bg-[#d4a847] hover:bg-[#c49a3f] text-white font-bold rounded-lg mb-3"
          >
            Rematch
          </button>
        ) : (
          <div className="text-center text-yellow-400 mb-3 animate-pulse">
            Waiting for opponent… (30s)
          </div>
        )}

        <button
          onClick={onLeave}
          className="w-full py-3 bg-red-600/80 hover:bg-red-600 text-white font-medium rounded-lg"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
```

### Pattern 4: Score Display in Header
**What:** Always-visible scores in the game header
**When to use:** During 'playing' and 'finished' phases
**Example:**
```typescript
// In game page header (inside the bg-[#2d4a2d] div):
{scores && (
  <div className="flex items-center gap-2 text-sm">
    <span className="text-red-400">Red: {scores.red}</span>
    <span className="text-gray-500">|</span>
    <span className="text-blue-400">Blue: {scores.blue}</span>
    <span className="text-gray-500">|</span>
    <span className="text-gray-400">Draws: {scores.draws}</span>
  </div>
)}
```

### Pattern 5: Rematch Handler (Server-Side)
**What:** Track rematch confirmations per room, timeout after 30s
**When to use:** On `rematch` and `reset-scores` socket events
**Example:**
```typescript
// server/src/socket/handlers/rematchHandler.ts

// Extend Room type for rematch state:
interface Room {
  // ... existing fields
  rematchRequests: Set<string>;  // players who clicked rematch
  rematchTimeout: NodeJS.Timeout | null;
}

export function rematchHandler(io: Server, socket: Socket) {
  socket.on('rematch', () => {
    let room: Room | undefined;
    for (const [id, r] of rooms.entries()) {
      if (r.players.some((p) => p.id === socket.id)) {
        room = r;
        break;
      }
    }
    if (!room) return;

    room.rematchRequests.add(socket.id);
    io.to(roomId).emit('rematch:ready', { bothReady: room.rematchRequests.size >= 2 });

    // Start 30s timeout if first rematch request
    if (room.rematchRequests.size === 1) {
      room.rematchTimeout = setTimeout(() => {
        room!.rematchRequests.clear();
        io.to(roomId).emit('rematch:ready', { bothReady: false });
        io.to(roomId).emit('rematch:timeout', {});
      }, 30000);
    }

    // Both confirmed — start fresh deployment
    if (room.rematchRequests.size >= 2) {
      clearTimeout(room.rematchTimeout!);
      resetRoomForRematch(room);
      io.to(roomId).emit('rematch:confirmed', {
        board: room.board,
        scores: room.scores,
      });
    }
  });

  socket.on('reset-scores', () => {
    // Host-only check
    if (room.hostId !== socket.id) {
      socket.emit('error', { message: 'Only the host can reset scores' });
      return;
    }
    room.scores = { red: 0, blue: 0, draws: 0, gamesPlayed: 0 };
    io.to(roomId).emit('scores:update', { scores: room.scores });
  });
}

function resetRoomForRematch(room: Room) {
  room.board = createEmptyBoard();
  room.status = 'deploying';
  room.currentTurn = 'red';
  room.deployedPieces = { red: new Set(), blue: new Set() };
  room.readyPlayers = new Set();
  room.rematchRequests.clear();
  // scores persist (per decision: scores accumulate across rematches)
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Win detection | Custom logic in handler | Pure `checkWinCondition()` in engine.ts | Testable, isolated, matches Phase 2's pure-function pattern |
| Score tracking | LocalStorage or cookies | Room.scores server-side | Already defined in Room type, synced via socket |
| Modal overlay | Build from scratch | Follow BattleReveal pattern | Same visual family, proven structure |
| Rematch timeout | ad-hoc setTimeout | Named `room.rematchTimeout` handle | Clean cancellation on confirmation |

**Key insight:** The engine.ts pattern from Phase 2 (pure functions returning results) should extend naturally to win conditions. Keep game logic in engine, socket events in handlers.

---

## Common Pitfalls

### Pitfall 1: Forgetting to reveal all pieces on game over
**What goes wrong:** Hidden pieces remain hidden on final board, confusing players
**Why it happens:** Pieces have `revealed: false` by default; `resolveBattle` sets `attackerRevealed/defenderRevealed` but doesn't update the board's piece `revealed` flag
**How to avoid:** After `game:over` emission, iterate board and set all pieces to `revealed: true`
**Warning signs:** Players can't see what the hidden pieces were

### Pitfall 2: Emitting move:result after game:over
**What goes wrong:** Race condition — client shows move animation THEN sees game over, or both happen simultaneously
**Why it happens:** Not returning early from make-move handler after game ends
**How to avoid:** Return immediately after emitting `game:over`; don't emit `move:result` for the final move
**Warning signs:** Battle reveal animation plays for what should be final move

### Pitfall 3: Scores not updating on rematch
**What goes wrong:** Scores reset to 0 on rematch, breaking SES-01
**Why it happens:** `resetRoomForRematch()` clears scores object or creates new one
**How to avoid:** Scores persist — only reset board, deployedPieces, readyPlayers
**Warning signs:** Score display shows 0-0-0 after first rematch

### Pitfall 4: Rematch timeout not cleared on player leave
**What goes wrong:** setTimeout callback fires after player has already left, causes errors or unintended state
**Why it happens:** Not clearing `room.rematchTimeout` in `leave-room` handler
**How to avoid:** Clear timeout in leave handler and in rematch confirmation
**Warning signs:** Errors in server logs about emitting to disconnected sockets

### Pitfall 5: Bot games and rematch
**What goes wrong:** Bot doesn't auto-confirm rematch, human player waits 30s timeout
**Why it happens:** Bot has no socket handler for `rematch` event
**How to avoid:** Either skip rematch UI for bot games, or auto-confirm rematch for bot (emit `rematch:ready` immediately)
**Warning signs:** Bot games hang on rematch screen

---

## Code Examples

### Win Condition Tests (High Confidence - based on existing test patterns)
```typescript
// engine.test.ts

describe('checkFlagCapture', () => {
  test('red wins when blue flag is captured', () => {
    const room = makeRoom({ board: createBoardWithRedFlagCaptured() });
    expect(checkFlagCapture(room)).toBe('red');
  });
  test('returns null when both flags present', () => {
    const room = makeRoom(); // flags deployed normally
    expect(checkFlagCapture(room)).toBeNull();
  });
});

describe('checkFlagBaseline', () => {
  test('red wins when red flag reaches row 7 with no adjacent blue', () => {
    const room = makeRoom();
    room.board[7][4] = makePiece('flag', 'red', -3);
    expect(checkFlagBaseline(room)).toBe('red');
  });
  test('red does NOT win if blue piece adjacent to flag at row 7', () => {
    const room = makeRoom();
    room.board[7][4] = makePiece('flag', 'red', -3);
    room.board[6][4] = makePiece('5-star', 'blue', 11); // adjacent above
    expect(checkFlagBaseline(room)).toBeNull();
  });
});

describe('checkNoValidMoves', () => {
  test('blue wins when red has no valid moves', () => {
    const room = makeRoom();
    // red piece blocked on all sides by own pieces
    room.board[3][3] = makePiece('flag', 'red', -3);
    room.board[2][3] = makePiece('private', 'red', -1);
    room.board[4][3] = makePiece('private', 'red', -1);
    room.board[3][2] = makePiece('private', 'red', -1);
    room.board[3][4] = makePiece('private', 'red', -1);
    // blue has pieces elsewhere
    room.board[5][4] = makePiece('5-star', 'blue', 11);
    expect(checkNoValidMoves(room)).toBe('red'); // red has no moves
  });
});
```

### Socket Event Wiring (High Confidence - follows existing patterns)
```typescript
// In game page useEffect:
socket.on('game:over', (data: { winner: 'red' | 'blue' | null; reason: string; scores: Scores }) => {
  setGameStatus('finished');
  setScores(data.scores);
  setWinner(data.winner);
  setWinReason(data.reason);
});

socket.on('scores:update', (data: { scores: Scores }) => {
  setScores(data.scores);
});

socket.on('rematch:ready', (data: { bothReady: boolean }) => {
  setOpponentWantsRematch(data.bothReady);
  if (data.bothReady) {
    // Reset game state for rematch
    resetForRematch();
  }
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Game ends silently | `game:over` socket event with winner/reason | Phase 3 | Clients can show modal, update UI |
| Scores stored client-only | Room.scores server-side, synced via `scores:update` | Phase 3 | Scores persist across browser refreshes |
| No rematch | Both-confirm rematch with 30s timeout | Phase 3 | Full session play without leaving room |

**Deprecated/outdated:**
- None relevant to Phase 3 scope

---

## Open Questions

1. **Bot games rematch UX**
   - What we know: Bot doesn't have a socket connection, so `rematch` event won't fire
   - What's unclear: Should bot games skip the rematch screen entirely? Go straight to new game?
   - Recommendation: For now, emit `rematch:ready` immediately on bot side when human clicks Rematch (server-side auto-confirm)

2. **Flag at baseline during deployment**
   - What we know: Win-02 only applies during playing phase
   - What's unclear: If flag is pre-deployed on opponent's baseline, does that count immediately?
   - Recommendation: No — WIN-02 only triggers after pieces move. Flag must MOVE to opponent's baseline.

3. **No-moves when flag can't move**
   - What we know: Flag `canMove()` returns invalid by design
   - What's unclear: If a player only has their Flag remaining and it can't move, do they lose by no valid moves?
   - Recommendation: Yes — check includes Flag pieces. A player with only Flag has no valid moves.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest + ts-jest |
| Config file | `server/jest.config.js` |
| Quick run command | `npm test -- --testPathPattern="engine" --verbose` |
| Full suite command | `npm test --verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|------------------|--------------|
| WIN-01 | Flag capture detection | unit | `npm test -- --testPathPattern="engine" --testNamePattern="checkFlagCapture" -x` | ✅ engine.test.ts |
| WIN-02 | Flag baseline detection | unit | `npm test -- --testPathPattern="engine" --testNamePattern="checkFlagBaseline" -x` | ✅ engine.test.ts |
| WIN-03 | No valid moves detection | unit | `npm test -- --testPathPattern="engine" --testNamePattern="checkNoValidMoves" -x` | ✅ engine.test.ts |
| WIN-04 | game:over socket event | integration | Manual socket.io test | ❌ Wave 0 |
| SES-01 | Scores persist | unit + integration | `npm test -- --testPathPattern="engine" -x` | ✅ engine.test.ts |
| SES-02 | Rematch flow | integration | Manual socket.io test | ❌ Wave 0 |
| SES-03 | Host-only reset-scores | integration | Manual socket.io test | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern="engine" --verbose`
- **Per wave merge:** `npm test --verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `server/tests/game-over.test.ts` — integration tests for game:over, scores:update, rematch handlers
- [ ] `client/src/features/game/__tests__/WinModal.test.tsx` — WinModal component rendering
- [ ] `client/src/features/game/__tests__/ScoreDisplay.test.tsx` — ScoreDisplay component rendering
- [ ] `client/src/store/__tests__/gameStore.test.ts` — gameStore win/rematch state tests

---

## Sources

### Primary (HIGH confidence)
- `server/src/game/engine.ts` — Existing game logic patterns, battle resolution
- `server/src/socket/handlers/gameHandler.ts` — Socket event patterns, existing make-move handler
- `server/tests/engine.test.ts` — Test patterns and Room helper functions
- `PROJECT_SPECS.md §3.5` — Win condition definitions (flag capture, baseline, no moves)
- `PROJECT_SPECS.md §6.2` — Socket event definitions (game:over, scores:update, rematch:ready)

### Secondary (MEDIUM confidence)
- `client/src/features/game/BattleReveal.tsx` — Overlay component pattern (similar to WinModal)
- `client/src/app/game/[roomId]/page.tsx` — Existing game page structure, socket wiring patterns
- `03-CONTEXT.md` — User decisions on modal style, rematch behavior, score display

### Tertiary (LOW confidence)
- None — all findings verified against existing codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing patterns (Jest, Zustand, Socket.io) confirmed in codebase
- Architecture: HIGH — pure function pattern in engine.ts already established, extending naturally
- Pitfalls: MEDIUM — based on code review, edge cases around bot games need validation

**Research date:** 2026-03-19
**Valid until:** 2026-04-18 (30 days — game flow logic is stable)