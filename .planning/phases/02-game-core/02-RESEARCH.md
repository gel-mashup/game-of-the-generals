# Phase 2: Game Core - Research

**Researched:** 2026-03-18
**Domain:** Real-time multiplayer game mechanics (deployment, turn-based movement, battle resolution)
**Confidence:** HIGH

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Board piece selection: Gold border highlight (`#d4a847`) — same as palette selection
- Turn indicator: Three-part system (header text, side glow, board tint)
- Opponent's piece clicked: Brief red flash — click registered but action not allowed
- Not your turn + try to move: No response — passive rejection
- Battle reveal: Inline on board (~1 second), pieces slide together, reveal in place (not modal)
- Equal rank battle: Explosion/spark effect on both pieces
- Turn after battle: Standard rules — turn switches automatically
- Valid moves shown: Green-tinted squares (`rgba(74, 124, 74, 0.5)`) — green NOT gold
- Deselection: Clicking non-selectable piece deselects currently selected piece
- Auto-Deploy: Below palette, secondary style, places all 21 pieces instantly, re-randomizable
- Ready button: Accent gold (`#d4a847`), enabled when all 21 pieces placed, no unready
- Countdown: 3-second countdown once both ready, cannot be interrupted
- Invalid square click (deployment): Silent rejection — no message, no animation
- Zone highlight: Valid deployment zone highlights green when palette piece selected
- Server-side validation for all game actions
- Client optimistically updates, reverts if server rejects

### Deferred Ideas (OUT OF SCOPE)
- Piece movement animations (UX-01) — Phase 5+
- Move history display (UX-02) — Phase 5+
- Undo move for friendly games (UX-03) — Phase 5+
- Sound effects — future phase
- Real-time chat during game (SOCL-01) — Phase 5+

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEP-01 | User can place pieces by clicking piece then board square | handleCellClick in game page, deploy-piece socket event |
| DEP-02 | User can only place pieces in their deployment zone | Zone validation (rows 0-2 red, 5-7 blue), green highlight when piece selected |
| DEP-03 | User can use auto-deploy for random placement | auto-deploy socket event, server-side randomization |
| DEP-04 | User can signal ready when deployment is complete | ready socket event, gold Ready button (enabled at 21 pieces) |
| DEP-05 | Game starts when both players are ready | deploy:complete event, 3s countdown, game:started |
| GAME-01 | Players alternate turns starting with Red | currentTurn state, server-enforced turn validation |
| GAME-02 | User can select a piece during their turn | selectedPiece state, gold border highlight |
| GAME-03 | Valid moves are highlighted when piece selected | validMoves computed, green-tinted squares |
| GAME-04 | User can move piece to adjacent orthogonal square | make-move socket event, server movement validation |
| GAME-05 | User cannot move to square occupied by own piece | Server validation in move handler |
| GAME-06 | Battle occurs when moving to occupied square | resolveBattle function, move:result event |
| GAME-07 | Higher rank wins; equal rank = both eliminated | Battle resolution algorithm (see below) |
| GAME-08 | Spy beats all officers (rank 0+) | Special battle rule in resolveBattle |
| GAME-09 | Private beats Spy | Special battle rule in resolveBattle |
| GAME-10 | Flag captured by any piece | resolveBattle — any attacker vs flag wins |

---

## Summary

Phase 2 implements the complete game loop from deployment through active play. The server needs a new `gameHandler.ts` (or extension of `roomHandler.ts`) that handles the `start-game`, `deploy-piece`, `auto-deploy`, `ready`, and `make-move` events with full server-side validation. The client needs the gameStore extended with valid-move computation, battle resolution display, and turn management. The battle resolution algorithm is the critical piece — it must handle the spy/private special rules correctly (spy defeats officers rank 0+, private defeats spy).

**Primary recommendation:** Create a dedicated `server/src/game/engine.ts` for battle/movement logic that is unit-testable. Add gameHandler to socket handlers. Extend gameStore with playing-phase state. Add Auto-Deploy and Ready buttons to the game page. The server-side game engine should be the single source of truth for all game logic.

---

## Technical Findings

### 1. Missing Server Infrastructure

**Finding:** The current `roomHandler.ts` only handles `create-room`, `join-room`, and `leave-room`. It never transitions room status from `waiting` to `deploying`.

**Gap:** No `start-game` event exists. When does the room status change to `deploying`?

**Resolution:** Per game page code (`gameStatus === 'deploying'`), the server must send an event that transitions to deploying. The natural flow:
1. For bot games: auto-transition when second "player" (bot) joins
2. For online games: Host clicks "Start Game" or it auto-transitions when second player joins

**Decision needed (Claude's discretion):** Should there be an explicit "Start Game" button on the lobby, or auto-start when both players join? Given the UX flow (navigate to game page when joined), auto-transition is cleaner. The `player:joined` handler in `roomHandler.ts` should check if both players are present and emit `game:started` with `status: 'deploying'`.

### 2. Server Room State Gap

**Finding:** The server `Room` type in `server/src/types/index.ts` is missing `deployedPieces: { red: Set<string>, blue: Set<string> }` and `readyPlayers: Set<string>` which are documented in PROJECT_SPECS.md. The current roomHandler has no tracking of individual piece deployments.

**Resolution:** Extend the server Room type:
```typescript
interface Room {
  // ... existing fields
  deployedPieces: { red: Set<string>; blue: Set<string> };
  readyPlayers: Set<string>;
  deployedBoards: { red: (Piece | null)[][]; blue: (Piece | null)[][] }; // or just use main board
}
```

### 3. Client-Server Board Sync

**Finding:** The game page `handleCellClick` currently deploys pieces directly via `deployPiece()` (optimistic) but never emits a socket event. All deployment is client-side only.

**Gap:** The server has no record of deployed pieces. For multiplayer, this won't sync.

**Resolution:** `handleCellClick` must emit `deploy-piece` to server. Server validates, updates its board, broadcasts `piece:deployed` to all players.

### 4. Valid Move Computation

**Finding:** The client has no logic to compute valid moves. The game page has no playing-phase click handling.

**Resolution:** gameStore needs a `validMoves` computed field (or derived selector). Valid moves for a piece at (row, col):
- Orthogonal only: (row±1, col) and (row, col±1)
- Within board bounds (0≤row<8, 0≤col<9)
- Destination is empty OR occupied by enemy piece
- Flag pieces cannot move

### 5. Battle Resolution — The Critical Algorithm

This is the most complex part. From PROJECT_SPECS.md:

| Piece Type | Rank | Beats |
|------------|------|-------|
| 5★ General | 11 | All below, Private, Flag |
| 4★ General | 10 | All below, Private, Flag |
| 3★ General | 9 | All below, Private, Flag |
| 2★ General | 8 | All below, Private, Flag |
| 1★ General | 7 | All below, Private, Flag |
| Colonel | 6 | All below, Private, Flag |
| Lt Colonel | 5 | All below, Private, Flag |
| Major | 4 | All below, Private, Flag |
| Captain | 3 | All below, Private, Flag |
| 1st Lieutenant | 2 | Sergeant, Private, Flag |
| 2nd Lieutenant | 1 | Sergeant, Private, Flag |
| Sergeant | 0 | Private, Flag |
| Private | -1 | Spy, Flag |
| Spy | -2 | All Officers (rank ≥ 0), Flag |
| Flag | -3 | Cannot move, captured by any piece |

**Battle Resolution Algorithm (in priority order):**

```
function resolveBattle(attacker: Piece, defender: Piece): BattleResult:
  // Rule 1: Flag capture — any piece captures flag
  if defender.type === 'flag':
    return { winner: attacker.owner, captured: defender, attackerWins: true }

  // Rule 2: Spy vs Private
  if attacker.type === 'spy' and defender.type === 'private':
    return { winner: defender.owner, captured: attacker, attackerWins: false }
  if attacker.type === 'private' and defender.type === 'spy':
    return { winner: attacker.owner, captured: defender, attackerWins: true }

  // Rule 3: Equal rank — both eliminated
  if attacker.rank === defender.rank:
    return { winner: 'tie', captured: both, attackerWins: null }

  // Rule 4: Higher rank wins
  if attacker.rank > defender.rank:
    return { winner: attacker.owner, captured: defender, attackerWins: true }
  else:
    return { winner: defender.owner, captured: attacker, attackerWins: false }
```

**Key insight:** The "Officers beat Spy" table in PROJECT_SPECS is misleading — the Spy actually BEATS all officers (rank 0+) and is only beaten by Private. The "Beats" column in the table seems to describe what each piece CAN attack, not what beats it. The spy special rule overrides normal rank comparison.

**Note on Private vs Flag:** Per the table, Private "beats Flag" — meaning Private can capture Flag (same as any piece). The flag capture rule (any piece) is universal.

### 6. Client Optimistic Updates

**Pattern:** Client updates UI immediately, then sends to server. If server rejects, client reverts.

For deployment:
- Client calls `deployPiece()` → UI updates
- Emit `deploy-piece` to server
- Server validates and broadcasts `piece:deployed` (or `error`)
- If error: re-fetch board state from server event

For moves:
- Client calls `makeMove()` → UI shows piece moved (optimistic)
- Emit `make-move` to server
- Server validates turn, ownership, adjacency
- If valid: server broadcasts `move:result` with outcome
- If invalid: server broadcasts `error`, client reverts

### 7. Battle Reveal Sequence

The battle reveal is a client-side animation sequence:
1. Server broadcasts `move:result` with `outcome: { attacker, defender, winner, revealed: true }`
2. Client receives event → enters "battle reveal" state
3. Attacker and defender pieces slide toward each other (CSS transition, ~500ms)
4. Both pieces revealed simultaneously (set `revealed: true` visually)
5. After ~1 second: apply result (remove captured piece, move attacker)
6. Turn switches to other player

For tie (equal rank): both pieces fade out with explosion effect simultaneously.

### 8. Phase State Machine

```
waiting → deploying → playing → finished
               ↑            ↓
               └────────────┘ (rematch)
```

Transitions:
- `waiting → deploying`: Second player joins (or bot game starts)
- `deploying → playing`: Both players click Ready + 3s countdown
- `playing → finished`: Win condition met (Phase 3)
- `finished → deploying`: Rematch (Phase 3)

### 9. Countdown Implementation

Once both players are ready, server starts a 3-second timer:
- Emit `countdown:update` with `{ seconds: 3, 2, 1 }` every second
- After 0: emit `game:started` with `{ board, currentTurn: 'red' }`
- For bot games, the bot is "always ready" (auto-ready when human ready)

---

## Socket Events

### Client → Server

| Event | Payload | Validation | Response |
|-------|---------|------------|----------|
| `start-game` | — | Host only, room has 2 players | `game:started` with status: 'deploying' |
| `deploy-piece` | `{ pieceId: string, row: number, col: number }` | Player owns pieceId, row/col in deployment zone, cell empty, piece count not exceeded | `piece:deployed` or `error` |
| `auto-deploy` | — | Game status is 'deploying', player has 0 deployed pieces | `piece:deployed` (multiple, with `autoDeployComplete: true`) or `error` |
| `ready` | — | Game status is 'deploying', player has all 21 pieces deployed | `player:ready`, then `deploy:complete` when both ready |
| `make-move` | `{ from: { row, col }, to: { row, col } }` | Owns piece at from, is current turn, to is adjacent orthogonal, not own piece | `move:result` or `error` |

### Server → Client

| Event | Payload | Trigger |
|-------|---------|---------|
| `game:started` | `{ board, currentTurn: 'red', status: 'deploying' }` | Both players present |
| `piece:deployed` | `{ piece, row, col, deployedCount, board, autoDeployComplete? }` | Valid deploy-piece or auto-deploy |
| `player:ready` | `{ playerId }` | Player clicks Ready |
| `deploy:complete` | `{ board, currentTurn: 'red' }` | Both players ready + countdown finished |
| `move:result` | `{ move: { from, to }, outcome: { attacker, defender, winner, captured? }, board, currentTurn }` | Valid make-move |
| `error` | `{ message: string }` | Any invalid action |
| `countdown:update` | `{ seconds: number }` | Countdown tick |

### Battle Outcome Structure (in move:result)

```typescript
interface BattleOutcome {
  attacker: Piece;        // The attacking piece
  defender: Piece | null; // The defending piece (null if moving to empty)
  attackerRevealed: boolean;
  defenderRevealed: boolean;
  winner: 'red' | 'blue' | 'tie' | null; // null if no battle
  capturedPieceId?: string; // ID of captured piece (removed from board)
  movedTo?: Position;     // Final position of attacker (may be removed in tie)
  board: (Piece | null)[][]; // Full board state after resolution
  currentTurn: 'red' | 'blue';
}
```

---

## Battle Resolution Algorithm

**Function: `resolveBattle(attacker: Piece, defender: Piece): BattleOutcome`**

```
Input: attacker piece (moving piece), defender piece (on destination square)

Step 1 — Flag Capture Check:
  if defender.type === 'flag':
    return {
      winner: attacker.owner,
      captured: defender,
      attackerWins: true,
      attackerRemoved: false,
      defenderRemoved: true
    }

Step 2 — Spy vs Private Special Rule:
  if attacker.type === 'spy' AND defender.type === 'private':
    return {
      winner: defender.owner,  // Private wins
      captured: attacker,
      attackerWins: false,
      attackerRemoved: true,
      defenderRemoved: false
    }
  if attacker.type === 'private' AND defender.type === 'spy':
    return {
      winner: attacker.owner,  // Private wins
      captured: defender,
      attackerWins: true,
      attackerRemoved: false,
      defenderRemoved: true
    }

Step 3 — Equal Rank (Tie):
  if attacker.rank === defender.rank:
    return {
      winner: 'tie',
      captured: [attacker, defender],
      attackerWins: null,
      attackerRemoved: true,
      defenderRemoved: true
    }

Step 4 — Rank Comparison:
  // Spy beats officers (rank >= 0) is handled above in Step 2
  // Officers beat each other by rank (higher wins)
  if attacker.rank > defender.rank:
    return {
      winner: attacker.owner,
      captured: defender,
      attackerWins: true,
      attackerRemoved: false,
      defenderRemoved: true
    }
  else: // attacker.rank < defender.rank
    return {
      winner: defender.owner,
      captured: attacker,
      attackerWins: false,
      attackerRemoved: true,
      defenderRemoved: false
    }
```

**Edge Cases:**
- Flag moving to Flag (impossible — flags can't move)
- Multiple pieces deploying same cell (server validation prevents)
- Battle during countdown (impossible — game hasn't started)

**Rank values from types:**
- 5-star: 11, 4-star: 10, 3-star: 9, 2-star: 8, 1-star: 7, colonel: 6, lieutenant-colonel: 5, major: 4, captain: 3, 1st-lieutenant: 2, 2nd-lieutenant: 1, sergeant: 0, private: -1, spy: -2, flag: -3

---

## Architecture Decisions

### 1. Server-Side Game Engine (`server/src/game/engine.ts`)

Create a dedicated `engine.ts` module with pure functions:
- `isValidDeployment(board, player, row, col, pieceId)` — validates deployment
- `canMove(board, from, to)` — validates move legality
- `resolveBattle(attacker, defender)` — returns battle outcome
- `getValidMoves(board, position)` — returns array of valid destination squares
- `isInDeploymentZone(player, row)` — row check for deployment validation
- `generateAutoDeploy(player)` — returns randomized board positions

These should be unit-testable independently of socket handlers.

### 2. Server Game Handler (`server/src/socket/handlers/gameHandler.ts`)

Separate from `roomHandler.ts` for clean separation of concerns. Handles:
- `start-game` — transitions room to deploying, broadcasts to all
- `deploy-piece` — validates and applies deployment
- `auto-deploy` — server-side randomization, applies all 21 pieces
- `ready` — tracks ready state, starts countdown when both ready
- `make-move` — validates and executes move, resolves battle, broadcasts result

### 3. Client gameStore Extensions

```typescript
interface GameState {
  // ... existing fields
  selectedPiece: Position | null;
  validMoves: Position[];           // NEW: valid destinations for selected piece
  readyToPlay: boolean;              // NEW: player has clicked Ready
  opponentReady: boolean;           // NEW: opponent has clicked Ready
  countdownSeconds: number | null;  // NEW: 3-2-1 countdown
  battleOutcome: BattleOutcome | null; // NEW: for reveal animation

  // Methods
  selectPiece: (pos: Position | null) => void;  // UPDATED: compute valid moves
  setReady: () => void;
  makeMove: (from: Position, to: Position) => void;
  setBattleOutcome: (outcome: BattleOutcome | null) => void;
  clearBattleOutcome: () => void;
}
```

### 4. Valid Move Computation

```typescript
function computeValidMoves(board: Board, position: Position, currentPlayer: 'red' | 'blue'): Position[] {
  const piece = board[position.row][position.col];
  if (!piece || piece.owner !== currentPlayer) return [];
  if (piece.type === 'flag') return []; // Flag cannot move

  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const validMoves: Position[] = [];

  for (const [dr, dc] of directions) {
    const newRow = position.row + dr;
    const newCol = position.col + dc;
    if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 9) continue;

    const target = board[newRow][newCol];
    if (!target) {
      validMoves.push({ row: newRow, col: newCol }); // Empty — valid move
    } else if (target.owner !== currentPlayer) {
      validMoves.push({ row: newRow, col: newCol }); // Enemy — valid move (battle)
    }
    // Own piece — not added to valid moves
  }

  return validMoves;
}
```

### 5. Server-Side Move Validation

```typescript
function validateMove(
  room: Room,
  playerId: string,
  from: Position,
  to: Position
): { valid: boolean; error?: string } {
  // 1. Verify player owns the piece
  const piece = room.board[from.row][from.col];
  if (!piece) return { valid: false, error: 'No piece at source' };
  if (piece.owner !== playerSide) return { valid: false, error: 'Not your piece' };

  // 2. Verify it's this player's turn
  if (room.currentTurn !== playerSide) return { valid: false, error: 'Not your turn' };

  // 3. Verify adjacency (orthogonal only, 1 square)
  const rowDiff = Math.abs(to.row - from.row);
  const colDiff = Math.abs(to.col - from.col);
  if (!((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1))) {
    return { valid: false, error: 'Must move to adjacent square' };
  }

  // 4. Verify destination is on board
  if (to.row < 0 || to.row >= 8 || to.col < 0 || to.col >= 9) {
    return { valid: false, error: 'Out of bounds' };
  }

  // 5. Verify not moving to own piece
  const target = room.board[to.row][to.col];
  if (target && target.owner === playerSide) {
    return { valid: false, error: 'Cannot move to own piece' };
  }

  // 6. Verify flag can't move
  if (piece.type === 'flag') return { valid: false, error: 'Flag cannot move' };

  return { valid: true };
}
```

### 6. Project Structure Additions

```
server/src/
├── game/
│   ├── engine.ts        # Pure game logic functions (NEW)
│   └── bot.ts           # AI opponent (Phase 4)
├── socket/handlers/
│   ├── roomHandler.ts    # Existing: create/join/leave
│   └── gameHandler.ts   # NEW: start-game, deploy, ready, make-move

client/src/
├── store/
│   └── gameStore.ts     # EXTEND: add playing-phase state
├── features/game/
│   ├── Board.tsx        # EXTEND: add valid-move highlighting
│   ├── Piece.tsx        # EXTEND: add selection border, flash effects
│   └── BattleReveal.tsx # NEW: inline battle animation component
├── app/game/[roomId]/
│   └── page.tsx         # EXTEND: Ready/Auto-Deploy buttons, playing-phase handler
```

---

## Common Pitfalls

### Pitfall 1: Client-Server Board Desync
**What goes wrong:** Client deploys piece optimistically but server rejects. Board shows piece placed but server doesn't know about it.
**How to avoid:** Always wait for server `piece:deployed` confirmation before fully committing. Store pending deployments separately, merge on server confirmation.
**Warning signs:** `board[r][c]` differs between client and server after action.

### Pitfall 2: Battle Resolution Priority Order
**What goes wrong:** Implementing rank comparison BEFORE the spy/private special rules, causing spy to lose to officers.
**How to avoid:** The special rules (spy beats officers, private beats spy) take PRIORITY over rank comparison. Must be checked first.
**Warning signs:** Spy piece eliminated by sergeant even though spy should win.

### Pitfall 3: Turn State Not Updating After Battle
**What goes wrong:** Turn doesn't switch after a battle resolves, causing the same player to go again.
**How to avoid:** Server's `move:result` payload must include `currentTurn: otherPlayer`. Client uses this value, not local inference.
**Warning signs:** `currentTurn` in store doesn't match server's broadcast.

### Pitfall 4: Ready State Not Locking Pieces
**What goes wrong:** Player clicks Ready but can still rearrange pieces.
**How to avoid:** Server must set `player.ready = true` and reject any `deploy-piece` events from ready players. Client should disable palette interaction after Ready.
**Warning signs:** `readyPlayers.size` doesn't update on server after ready event.

### Pitfall 5: Auto-Deploy Not Validating Zone
**What goes wrong:** Auto-deploy places pieces outside the deployment zone.
**How to avoid:** `generateAutoDeploy()` must filter to rows 0-2 (red) or 5-7 (blue). Validate each placement server-side before applying.
**Warning signs:** Piece appears in opponent's zone or middle rows.

### Pitfall 6: Deployment Count Mismatch
**What goes wrong:** Client thinks all 21 pieces deployed but server disagrees, causing Ready button to be enabled on client but rejected by server.
**How to avoid:** Server is source of truth for piece counts. `piece:deployed` broadcasts updated `deployedCount`. Client syncs from server event.
**Warning signs:** `deployedPieces` counts don't match between client/server.

### Pitfall 7: Making Moves During Countdown
**What goes wrong:** Player can click a piece and move during the 3-second countdown.
**How to avoid:** During countdown, game status is still 'deploying' (or a new 'countdown' status). Server rejects `make-move` until `game:started`.
**Warning signs:** `make-move` succeeds during countdown.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Move validation | Custom orthogonal adjacency check | Pure function `canMove()` in engine.ts | Easy to get wrong with edge cases (diagonal, distance > 1) |
| Battle resolution | Inline if/else in socket handler | Dedicated `resolveBattle()` function | Complex priority rules (spy/private) are error-prone |
| Random deployment | Math.random() with manual collision handling | Shuffle-based algorithm with deployment zone filtering | Collision avoidance and zone validation are subtle |
| Board state management | Scattered updates across handlers | Centralized board mutations in engine.ts | Prevents desync, makes testing easier |
| Countdown timer | setTimeout on client | Server-authoritative countdown with `countdown:update` events | Prevents client-side manipulation |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All game logic client-side | Server-authoritative game engine | Phase 2 | Prevents cheating, enables multiplayer consistency |
| Room handler does everything | Separate gameHandler.ts | Phase 2 | Clean separation, easier to test |
| No deployment tracking | Full deployedPieces state per player | Phase 2 | Enables Ready button enforcement |
| Ad-hoc move validation | Dedicated validateMove() function | Phase 2 | Comprehensive edge case coverage |

**Deprecated/outdated:**
- Client-only deployment (Phase 1 placeholder) — replaced with server-validated deployment
- Implicit game start — replaced with explicit `game:started` + `deploy:complete` events

---

## Open Questions

1. **When does the game transition from `waiting` to `deploying`?**
   - What we know: Lobby navigates to game page when both players joined. Game page shows deploying state.
   - What's unclear: Is there a `start-game` event, or does `player:joined` auto-trigger it?
   - **Recommendation:** Emit `game:started` from server when second player joins (or bot joins). Both players receive it and set `gameStatus: 'deploying'`. No separate start-game button needed.

2. **How does the bot handle deployment?**
   - What we know: Bot side is stored in `botSide`. Bot needs to deploy 21 pieces randomly.
   - What's unclear: Does bot auto-deploy when game starts, or wait?
   - **Recommendation:** Bot auto-deploys all 21 pieces immediately when `game:started` is received. `auto-deploy` handler should work for bot socket (emit `auto-deploy` on bot's behalf).

3. **Where does the server store per-player deployment boards before both ready?**
   - What we know: PROJECT_SPECS mentions `deployedBoards: { red, blue }` but current Room type has single `board`.
   - What's unclear: Is the board shared (visible to both) or hidden until both ready?
   - **Recommendation:** Phase 1 UI shows pieces deployed by both players on the same board (opponent's pieces visible). This differs from traditional Game of the Generals where deployment is hidden. No per-player hidden boards needed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest |
| Config file | `server/jest.config.js` |
| Quick run command | `cd server && npm test -- --testPathPattern="pieces\|engine"` |
| Full suite command | `cd server && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEP-02 | Zone validation | unit | `npm test -- engine.test.ts::validates deployment zone` | ❌ Wave 0 |
| DEP-03 | Auto-deploy placement | unit | `npm test -- engine.test.ts::auto-deploy places 21 pieces` | ❌ Wave 0 |
| DEP-04 | Ready state tracking | unit | `npm test -- engine.test.ts::ready signal updates state` | ❌ Wave 0 |
| GAME-04 | Orthogonal adjacency | unit | `npm test -- engine.test.ts::validates orthogonal moves` | ❌ Wave 0 |
| GAME-05 | Block own piece squares | unit | `npm test -- engine.test.ts::rejects move to own piece` | ❌ Wave 0 |
| GAME-06 | Battle trigger on occupied square | unit | `npm test -- engine.test.ts::triggers battle on occupied square` | ❌ Wave 0 |
| GAME-07 | Higher rank wins / equal tie | unit | `npm test -- engine.test.ts::higher rank wins` + `equal rank tie` | ❌ Wave 0 |
| GAME-08 | Spy defeats officers | unit | `npm test -- engine.test.ts::spy beats sergeant` | ❌ Wave 0 |
| GAME-09 | Private defeats Spy | unit | `npm test -- engine.test.ts::private beats spy` | ❌ Wave 0 |
| GAME-10 | Any piece captures Flag | unit | `npm test -- engine.test.ts::flag capture by any piece` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd server && npm test -- --testPathPattern="engine" -x`
- **Per wave merge:** `cd server && npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `server/src/game/engine.ts` — battle resolution, move validation, deployment validation, auto-deploy (core logic)
- [ ] `server/src/game/engine.test.ts` — unit tests for all game logic
- [ ] `server/src/socket/handlers/gameHandler.ts` — socket events for deployment and playing phases
- [ ] `server/src/socket/handlers/gameHandler.test.ts` — socket integration tests
- [ ] `server/src/types/index.ts` — extend Room type with deployedPieces, readyPlayers

---

## Sources

### Primary (HIGH confidence)
- `.planning/phases/02-game-core/02-CONTEXT.md` — all user decisions for Phase 2 (authoritative)
- `.planning/phases/02-game-core/02-UI-SPEC.md` — visual and interaction contract (authoritative)
- `PROJECT_SPECS.md` — game rules, piece rankings, socket events, data models
- `client/src/types/index.ts` — existing piece types, rank values, PIECE_CONFIG
- `server/src/types/index.ts` — existing server Room type (incomplete — needs extension)
- `client/src/store/gameStore.ts` — existing client state (needs extension)
- `client/src/app/game/[roomId]/page.tsx` — existing game page (needs extension)

### Secondary (MEDIUM confidence)
- `server/src/socket/handlers/roomHandler.ts` — pattern for socket handlers
- `server/tests/room.test.ts` — pattern for socket tests
- `server/tests/pieces.test.ts` — pattern for engine tests

### Tertiary (LOW confidence)
- General socket.io best practices (standard patterns, not library-specific)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are pre-established (Zustand, Socket.io, Express)
- Architecture: HIGH — clear separation of engine/handler, server-authoritative model
- Pitfalls: HIGH — battle resolution priority order is the only non-obvious item

**Research date:** 2026-03-18
**Valid until:** ~30 days (game logic is stable, only implementation details vary)
