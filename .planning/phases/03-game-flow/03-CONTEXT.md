# Phase 3: Game Flow - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement win condition detection, game-over announcement, session scoring, and rematch flow. Players can play complete games and start new ones within a session. AI opponent (Phase 4) is separate.

Requirements: WIN-01, WIN-02, WIN-03, WIN-04, SES-01, SES-02, SES-03

</domain>

<decisions>
## Implementation Decisions

### Win Announcement
- **Style:** Modal overlay — pops up over the board, game visible underneath (similar to the 3-second deployment countdown from Phase 2)
- **Content:** Winner name, win reason (flag captured / flag reached baseline / no valid moves), updated session scores
- **Actions:** "Rematch" and "Leave" buttons — firm decisions, no undo
- **Visual tone:** Tasteful celebration — fits the game aesthetic, not jarring or over-the-top

### Game Over Board State
- **Board behavior:** Board freezes completely — no piece selection, no clicks, no highlights
- **Piece visibility:** All pieces revealed on the final board — no hidden pieces remain
- **Board indicators:** No extra indicators on the board itself — all game-over info is in the modal
- **Eliminated pieces:** Empty squares where pieces were captured — no ghost marks or battle aftermath

### Rematch Flow
- **Initiation:** Either player clicks Rematch — other player sees "Opponent wants rematch" prompt
- **Confirmation:** Both players must confirm for rematch to start
- **Timeout:** If opponent doesn't respond within ~30 seconds, rematch request times out — player can retry or leave
- **Scores:** Scores persist across rematches — accumulate throughout the session
- **Deployment:** Fresh deployment each rematch — players place all 21 pieces again, same as a new game

### Score Display
- **Location:** Session scores always visible in the header during gameplay
- **Format:** Full format — "Red: 3 wins | Blue: 2 wins | Draws: 1"
- **Detail:** Simple tally only — no clickable drill-down or game history
- **Reset:** Scores reset when both players leave the room (room-scoped) — no explicit reset button needed

### Claude's Discretion
- Exact modal styling (colors, typography, animation timing)
- Header score layout (exact positioning, font size)
- Rematch confirmation UI (inline vs modal prompt)
- Server-side win condition detection implementation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Game Rules & State
- `PROJECT_SPECS.md` §3.5 — Win conditions (flag capture, baseline reach, no valid moves)
- `PROJECT_SPECS.md` §4.2 — Room scores tracking (Room.scores: red/blue/draws/gamesPlayed)
- `PROJECT_SPECS.md` §9 — Game state machine: waiting → deploying → playing → finished
- `PROJECT_SPECS.md` §10.2 — AI evaluation includes win bonuses for flag capture/baseline

### Game Mechanics
- `PROJECT_SPECS.md` §3.4 — Movement rules (orthogonal, one square, Flag cannot move)
- `PROJECT_SPECS.md` §3.6 — Phase 4 (Finished): winner announced with reason, session scores updated

### Socket Events
- `PROJECT_SPECS.md` §6.1 — Client events: `rematch`, `reset-scores`
- `PROJECT_SPECS.md` §6.2 — Server events: `game:over`, `scores:update`, `rematch:ready`

### Data Models
- `PROJECT_SPECS.md` §11.2 — Room type with scores, status (includes 'finished'), scores structure

### Prior Phase Decisions
- `.planning/phases/02-game-core/02-CONTEXT.md` — Battle reveal inline (pattern to follow for win modal), 3-second countdown behavior
- `.planning/phases/02-game-core/02-CONTEXT.md` — "Ready state is firm — once committed, no take-backs" (same principle for rematch)
- `.planning/phases/01-foundation/01-CONTEXT.md` — Zustand stores: gameStore + roomStore pattern

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `gameStore.ts`: Has `gameStatus: 'waiting' | 'deploying' | 'playing' | 'finished'` — extend with `setGameOver`, `setWinner`, `resetForRematch`
- `roomStore.ts`: `scores` not yet stored client-side — need to add or derive from server events
- `BattleReveal.tsx`: Pattern for inline overlay animations — win modal can follow similar approach
- Countdown overlay from Phase 2 (`deploy:complete` → 3-second countdown) — similar pattern for rematch confirm timeout

### Established Patterns
- Modal overlay over board: Use existing overlay/modal pattern from the game UI
- Zustand stores: Client state synced via socket events
- Socket.io: `socket.emit()` for actions, `socket.on()` for server broadcasts
- Board freezes: `gameStatus === 'finished'` guard on `selectPiece()` and `handleCellClick()` — no special component needed

### Integration Points
- **gameHandler.ts:** `make-move` handler needs win condition checks after `applyMove` — add `game:over` emission
- **gameStore.ts:** Add `gameStatus: 'finished'` state handling; board freezes by default when status isn't 'playing'
- **roomStore.ts:** Add `scores` tracking from `scores:update` events
- **Header component:** Add score display (format: "Red: N wins | Blue: N wins | Draws: N")
- **Win modal:** New component, similar animation timing to BattleReveal

### What Phase 2 Built (do not re-create)
- Board 9×8 CSS Grid rendering ✓
- Battle reveal inline overlay ✓
- `makeMove()` in gameStore ✓
- 3-second countdown for game start ✓

</codebase_context>

<specifics>
## Specific Ideas

- Win announcement should feel like a natural extension of the battle reveal — same aesthetic family
- Scores feel meaningful across a session — "I've won 3 games against this opponent"
- Rematch should feel quick but not rushed — 30 seconds is enough to decide

</specifics>

<deferred>
## Deferred Ideas

- Move history display (UX-02) — Phase 5+
- Piece movement animations (UX-01) — Phase 5+
- Undo move for friendly games (UX-03) — Phase 5+
- Chat during game (SOCL-01) — Phase 5+
- Sound effects (battle explosion, win fanfare) — future phase
- Spectating — Phase 5+

</deferred>

---

*Phase: 03-game-flow*
*Context gathered: 2026-03-19*
