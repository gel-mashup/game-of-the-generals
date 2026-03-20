# Phase 8: Fog-of-War - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Hide enemy piece identities during all phases of gameplay. Enemy pieces display "?" instead of rank symbols throughout deployment, countdown, and playing phases. Enemy ranks are never revealed during battle — only at game over when all pieces are shown with true ranks. This is the only phase where fog-of-war is implemented; server-side filtering is deferred to v2.

</domain>

<decisions>
## Implementation Decisions

### Fog Display Style
- Enemy pieces display **bold white "?"** as the symbol (replaces rank symbol)
- Same font size and weight as rank symbols (`text-xs font-bold`) — consistent with existing rendering
- Enemy pieces **retain red/blue background color** — positions are visible, only ranks are hidden
- **Fully opaque** — the 60% opacity (`opacity-60`) from Phase 7 is removed for fogged pieces
- **Clickable** — fogged enemy pieces can be clicked to initiate attacks (current behavior, valid move squares still show green)
- **No count badges** on fogged pieces — deployment counts tracked in PiecePalette during deployment phase

### Fog Timing (Phases)
- Fog applies during **all phases**: deployment, countdown, and playing
- No phase is exempt — enemy pieces are always "?" from the moment they appear on the board
- Board perspective flip (Phase 7 CSS `rotate-180`) works correctly with fogged pieces — no additional changes needed

### BattleReveal Overlay
- Enemy piece shows **"?"** instead of its rank symbol during the battle animation
- **Result text is kept** — "Attacker Wins!", "Defender Wins!", "TIE — Both Destroyed!" remain visible
- User knows the outcome without knowing enemy rank — maintains strategic mystery
- **No rank reveal after battle** — pieces stay "?" after BattleReveal closes; never reveal until game over

### Game-Over Reveal (FOGWAR-04)
- **All pieces** on the board reveal their true ranks instantly when game ends
- Reveal is **instantaneous** — no staggered animation, no delay
- Both winner and loser pieces show true ranks
- WinModal displays normally; board pieces simultaneously switch from "?" to rank

### Deployment Phase
- Enemy pieces show **"?"** with full opacity (not 60% opacity) during deployment
- Deployment zone highlights are **visible for both sides** (current Phase 7 behavior)
- Fog applies through the 3-2-1 countdown — no transition period
- Own pieces always show true rank during deployment (user's own pieces are always visible)

### Piece Revealed Flag
- `piece.revealed` flag exists in types and game data but is **not used for enemy pieces**
- Enemy pieces never set `revealed = true` — they stay "?" until game over
- The `piece.revealed` flag is effectively bypassed for enemy pieces; Phase 8 uses game status instead (`gameStatus === 'finished'`)

### Claude's Discretion
- Exact styling tweaks for the "?" symbol (letter-spacing, shadow, etc.)
- How to handle the `piece.revealed` flag — whether to repurpose it, ignore it, or set it to `true` at game over for completeness
- WinModal timing relative to board reveal — modal shows first or board reveals first (both happen at game-over)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Game UI Components
- `client/src/features/game/Piece.tsx` — Renders pieces with `opacity-60` for `!piece.revealed`. Change to render "?" for enemy fogged pieces.
- `client/src/features/game/BattleReveal.tsx` — Battle animation overlay. Change defender symbol to "?" for enemy.
- `client/src/features/game/WinModal.tsx` — Game-over modal. Add board-wide rank reveal trigger.
- `client/src/features/game/Board.tsx` — Board grid with CSS `rotate-180` for red player. Fog rendering via Piece component.
- `client/src/features/game/DeploymentZone.tsx` — Zone highlight overlay. Zones stay visible per Phase 8 decisions.
- `client/src/app/game/[roomId]/page.tsx` — Main game page. `gameStatus === 'finished'` triggers full reveal.
- `client/src/store/gameStore.ts` — `gameStatus` field drives fog vs revealed logic. `winner`/`winReason` for game-over.
- `client/src/store/roomStore.ts` — `playerSide` determines which pieces are "own" vs "enemy".
- `client/src/types/index.ts` — `Piece` interface with `revealed: boolean` field (not used for enemy fog in Phase 8).

### Prior Phase Decisions
- `.planning/phases/07-side-by-side-layout-board-perspective-flip/07-CONTEXT.md` — Board perspective flip (CSS rotate-180), Piece component with opacity-60, glass-morphism sidebar
- `.planning/phases/02-game-core/02-CONTEXT.md` — Valid move highlighting (green), battle flow
- `.planning/phases/03-game-flow/03-CONTEXT.md` — Board overlay pattern (absolute inset-0), WinModal overlay pattern

### Requirements
- `.planning/REQUIREMENTS.md` — FOGWAR-01 through FOGWAR-04 (note: FOGWAR-03 modified per user decision — ranks NOT revealed on battle, only at game over)
- `.planning/ROADMAP.md` — Phase 8 scope

### Specs
- `PROJECT_SPECS.md` — Game rules, piece rankings, deployment zones

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `Piece.tsx`: Already has conditional rendering via `!piece.revealed ? 'opacity-60' : ''` — this prop can be repurposed or a new fog condition added
- `BattleReveal.tsx`: Animation pattern established — defender piece symbol needs fog treatment
- `WinModal.tsx`: Game-over trigger already exists — can add board-wide reveal logic
- `gameStore.setWinner()`: Called on game-over — can set all pieces to revealed here

### Established Patterns
- Overlay positioning: `absolute inset-0` relative to board container
- Piece rendering: red/blue background with white text
- WinModal: absolute overlay with backdrop blur
- Board transform: CSS `rotate-180` in Phase 7 — works with fog rendering
- Green valid move highlights — stay active during fog phase

### Integration Points
- `Piece.tsx`: Add fog condition — render "?" for enemy pieces when `gameStatus === 'playing'` (or `gameStatus !== 'finished'` for full fog)
- `BattleReveal.tsx`: Defender piece symbol conditional on owner
- `page.tsx` or `gameStore.ts`: Set all enemy pieces to `revealed = true` on game-over event
- `Board.tsx`: No changes needed — Piece component handles fog rendering
- `DeploymentZone.tsx`: No changes needed — zone visibility unchanged

### What NOT to Change
- Server-side game logic (deployment validation, battle resolution)
- `makeMove` in gameStore — battle outcomes handled server-side
- Socket event payloads
- Game engine (`server/src/game/engine.ts`)

</codebase_context>

<specifics>
## Specific Ideas

- "The fog-of-war should feel consistent — the same \"?\" everywhere, no matter the phase"
- "Knowing you lost a battle should feel mysterious — you don't know what beat you"
- "The only moment of revelation should be game over — that's when you see the whole picture"
- Enemy pieces visible on the board (positions known) but rank hidden — strategic fog, not positional fog

</specifics>

<deferred>
## Deferred Ideas

- Server-side piece filtering (competitive mode with verified fog) — v2
- Staggered game-over reveal animation — nice-to-have, not required
- Mobile-specific fog behavior — not discussed, standard behavior applies

---

*Phase: 08-fog-of-war*
*Context gathered: 2026-03-20*
