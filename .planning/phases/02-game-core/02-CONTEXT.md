# Phase 2: Game Core - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the core gameplay mechanics for the Game of the Generals:
- Deployment phase: piece placement, validation, auto-deploy, ready flow
- Playing phase: turn management, piece selection, move execution, battle resolution
- 15 requirements: DEP-01 through DEP-05, GAME-01 through GAME-10
- Server-side validation for all game actions
- Visual feedback for all interactions

</domain>

<decisions>
## Implementation Decisions

### Piece Selection & Turn UI
- **Board piece selection:** Gold border highlight (same as palette selection — consistent with Phase 1)
- **Turn indicator:** Three-part system:
  - Header text: "Your turn" / "Waiting for opponent"
  - Side glow: current player's side highlights in header
  - Board tint: subtle color overlay on current player's side of board
- **Opponent's piece clicked:** Brief red flash on the piece — confirms click registered but action not allowed
- **Not your turn + try to move:** No response — passive rejection

### Battle Reveal & Feedback
- **Battle reveal animation:** Inline on the board — pieces slide together, reveal happens in place (not modal overlay)
- **Reveal duration:** ~1 second — quick, keeps game moving
- **Equal rank battle (both eliminated):** Explosion/spark effect on both pieces — dramatic, symmetric
- **Turn after battle:** Standard rules — turn switches to other player automatically

### Valid Move Highlighting
- **Valid moves shown:** Green-tinted squares highlight when a piece is selected
- **Blocked paths not shown:** No indication of invalid destinations — only valid options are highlighted
- **Deselection:** Clicking non-selectable piece (opponent's piece, wrong turn) deselects any currently selected piece
- **Visual style:** Green tint per UI-SPEC green palette (`#4a7c4a` range) — distinct from gold selection highlight

### Auto-Deploy UX
- **Button position:** Below the piece palette — secondary to manual placement
- **Placement behavior:** Places all 21 pieces instantly with no animation — all at once
- **Post-auto-deploy:** Player can still manually rearrange any pieces
- **Re-randomize:** Clicking Auto-Deploy again re-randomizes all pieces
- **No auto-select:** Auto-deploy does not select a piece type — player picks from palette manually

### Ready State UX
- **Ready requirement:** Must place all 21 pieces before Ready button becomes enabled
- **Unready blocked:** Once Ready is clicked, no way to unready
- **Pieces lock immediately:** Once Ready is clicked, all placed pieces are locked (no further rearrangement)
- **Countdown:** 3-second countdown with "Game starting..." message once both players ready
- **Countdown behavior:** Cannot be interrupted — pieces stay locked, no unready possible during countdown

### Deployment Zone Enforcement
- **Invalid square click:** Silent rejection — piece doesn't place, no message, no animation
- **Zone highlight:** Valid deployment zone highlights in green when a palette piece type is selected
- **Piece rearrangement:** Can freely move placed pieces within deployment zone until Ready is clicked

### Server-Side Validation
- **All game actions validated server-side:** Deployment, moves, and battles all validated on server
- **Client optimistically updates:** UI updates immediately but reverts if server rejects
- **Socket events:** `deploy-piece`, `auto-deploy`, `ready`, `make-move` events from client to server

</decisions>

<canonical_refs>
## Canonical References

**No external specs** — requirements are fully captured in decisions above.

### Project Documents
- `.planning/PROJECT.md` — Project vision, tech stack constraints
- `.planning/REQUIREMENTS.md` — DEP-01 through DEP-05, GAME-01 through GAME-10
- `.planning/ROADMAP.md` — Phase 2 scope, 15 success criteria
- `PROJECT_SPECS.md` — Full game rules, piece rankings (ranks 11 to -3), battle rules, win conditions
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 decisions (stack, stores, components)
- `.planning/phases/01-foundation/01-UI-SPEC.md` — Design system (colors, typography, spacing, interaction patterns)

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `Board.tsx`: Renders 9×8 CSS Grid — already handles cell rendering, click propagation, data-row/data-col attributes
- `Piece.tsx`: Displays piece with rank icon — extend with selection border (gold) and valid-move green tint
- `PiecePalette.tsx`: Shows 21 pieces with counts — extend with Ready button and Auto-Deploy below
- `DeploymentZone.tsx`: Zone overlays — adapt to highlight valid zone (green tint) when palette piece selected
- `gameStore.ts`: `gameStatus`, `board`, `currentTurn`, `selectedPiece`, `deployPiece` — extend with `readyToPlay`, `makeMove`, `resolveBattle`
- `roomStore.ts`: `playerSide` — use to determine valid deployment zone

### Established Patterns
- Piece selection: Gold border (`#d4a847`) — same as palette selection
- Valid moves: Green tint — new, not yet implemented
- Invalid click: Brief red flash — same feedback as opponent piece click
- Zustand stores: Client-side state, synced via socket events
- Socket.io: `socket.emit()` for actions, `socket.on()` for server broadcasts

### Integration Points
- **Game page (`/game/[roomId]`):** `handleCellClick()` currently handles deployment — extend for playing phase (move execution)
- **Socket events:** New events needed: `auto-deploy`, `ready`, `deploy:complete`, `make-move`, `move:result`, `game:started`
- **gameStore:** Add `makeMove()`, `resolveBattle()`, `setReady()` actions
- **Board component:** Add valid-move highlighting layer
- **Ready/Auto-deploy buttons:** Add below PiecePalette component

### What Phase 1 Built (do not re-create)
- Board 9×8 CSS Grid rendering ✓
- Piece component with rank icons ✓
- Deployment zone overlays ✓
- Piece palette with counts ✓
- `handleCellClick()` deployment logic (client-side) ✓
- `deployPiece()` in gameStore ✓
- Empty board state ✓

</codebase_context>

<specifics>
## Specific Ideas

- Battle reveal feels dramatic and inline — not a modal interrupting the game
- Equal rank ties are exciting moments — explosion effect makes them memorable
- Auto-deploy is a convenience, not a commitment — player always in control
- Ready state is firm — once committed, no take-backs

</specifics>

<deferred>
## Deferred Ideas

- Piece movement animations (UX-01) — Phase 5+
- Move history display (UX-02) — Phase 5+
- Undo move for friendly games (UX-03) — Phase 5+
- Sound effects for battle (explosion, piece place) — future phase
- Real-time chat during game (SOCL-01) — Phase 5+

</deferred>

---

*Phase: 02-game-core*
*Context gathered: 2026-03-18*
