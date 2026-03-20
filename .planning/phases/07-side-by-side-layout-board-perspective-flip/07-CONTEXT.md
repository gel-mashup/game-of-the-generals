# Phase 7: Side-by-Side Layout + Board Perspective Flip - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the game UI: deployment sidebar overlay on right side of board, board perspective flip so player deploy zone is always at bottom, vertical piece palette grouped by rank tier, modern color scheme with deep navy/teal palette. All overlays (DeploymentZone, BattleReveal, WinModal, bot thinking) must remain functional in the new layout. Phase 7 covers layout + visual changes only; fog-of-war ("?" for enemy pieces) is Phase 8.

</domain>

<decisions>
## Implementation Decisions

### Sidebar Position & Style
- Sidebar on the **right side** of the board
- Width: **~30-35%** of total width
- Layout: **Overlay** — sidebar overlaps board's right edge (not beside)
- Background: **Translucent/blurred** glass-morphism (deep navy tint with backdrop blur)
- Sidebar **visible only during deployment phase**, hidden during playing phase
- Contains: vertical piece palette + Auto-Deploy button + Ready button

### Board Perspective Flip
- Board flips **always** — both during deployment and playing phases
- **Visual-only flip** — data model unchanged (server-side logic unaffected)
- Method: **CSS transform rotate(180deg)** on the board grid
- Player-color aware: when playerSide is 'red', rotate board 180deg so player deploy zone (rows 5-7) appears at bottom of screen
- Click coordinates **map to logical positions** — e.g., clicking visually bottom cell resolves to that cell's logical row/col in the data array
- Coordinate transform handled in a `useBoardTransform` hook or Board component logic

### Color Scheme
- Board dark squares: **Deep navy** (#1e3a5f or similar)
- Board light squares: **Teal** (#2d5a6b or similar)
- Deployment zone highlight: **Gold** glow
- Valid move highlight: **Green** (keep existing green from Phase 2)
- Sidebar panel: **Deep navy** glass-morphism (matches board dark squares)
- Piece colors: **Red/Blue** (keep current, unchanged)
- Page background: Dark forest green (keep existing #1a2e1a or adjust to complement navy)

### Piece Palette (Vertical, in Sidebar)
- Pieces **grouped by rank tier** with section headers:
  - Generals (5★)
  - Officers (4★, 3★, 2★)
  - Special (1★, Spy)
  - Privates (PVT)
- Groups **always expanded** — no collapsible sections
- Each piece item shows: **icon + name + count badge** (compact)
- Pieces arranged as **vertical list** within each tier group
- Horizontal layout inside each piece item (icon | name | count)

### Layout Structure (CSS)
- Main container: `flex flex-col md:flex-row` — stack vertically on mobile, side-by-side on desktop
- Board wrapped in `relative` container with explicit width for overlay positioning
- Sidebar: `absolute right-0 top-0 bottom-0 w-[30-35%] backdrop-blur-md bg-navy/50` overlay
- All existing overlays (`absolute inset-0`) continue to reference the board container

### Claude's Discretion
- Exact hex color values for navy/teal palette
- Exact border-radius, shadow, and spacing values
- Animation timing for sidebar show/hide transitions
- Mobile breakpoint (768px or specific width where layout shifts)
- How to handle the sidebar on mobile (stacked below board or hidden with expandable toggle)
- BattleReveal animation direction after board flip (may need adjustment)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Game UI Components
- `client/src/app/game/[roomId]/page.tsx` — Main game page layout structure, overlay positioning
- `client/src/features/game/Board.tsx` — 9x8 CSS Grid rendering, cell click handling
- `client/src/features/game/Piece.tsx` — Piece rendering with opacity-60 for unrevealed pieces
- `client/src/features/game/PiecePalette.tsx` — Current horizontal scroll palette
- `client/src/features/game/DeploymentZone.tsx` — Zone overlay with absolute inset-0 positioning
- `client/src/features/game/BattleReveal.tsx` — Battle overlay animation pattern
- `client/src/features/game/WinModal.tsx` — Win modal overlay pattern
- `client/src/store/gameStore.ts` — Board state, gameStatus, playerSide access
- `client/src/store/roomStore.ts` — playerSide lives here (not gameStore)

### Prior Phase Decisions
- `.planning/phases/01-foundation/01-CONTEXT.md` — Stack (Next.js, Tailwind), component structure, Zustand stores
- `.planning/phases/02-game-core/02-CONTEXT.md` — Valid move highlighting (green), gold selection border, auto-deploy pattern, 3-second countdown
- `.planning/phases/03-game-flow/03-CONTEXT.md` — Board overlay pattern (absolute inset-0), modal styling
- `.planning/phases/04-ai-opponent/04-CONTEXT.md` — Bot thinking indicator (text overlay)

### Requirements
- `.planning/REQUIREMENTS.md` — LAYOUT-01 through LAYOUT-05, PALETTE-01, PALETTE-02
- `.planning/ROADMAP.md` — Phase 7 scope
- `.planning/research/SUMMARY.md` — Architecture recommendations (useBoardTransform hook, board+overlays in sized container)

### Specs
- `PROJECT_SPECS.md` — Game rules, piece rankings, deployment zones (red rows 0-2, blue rows 5-7)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Board.tsx`: 9x8 CSS Grid — add conditional CSS transform for player-color-aware flip
- `Piece.tsx`: Already uses `piece.revealed` for opacity-60 — will use same prop for "?" rendering in Phase 8
- `PiecePalette.tsx`: Current horizontal scroll — restructure to vertical grouped layout in sidebar
- `DeploymentZone.tsx`: Uses `absolute inset-0` relative to board container — continues to work, but container width changes
- `BattleReveal.tsx`: Animation pattern — may need direction adjustment after board flip
- `WinModal.tsx`: Same overlay pattern as BattleReveal
- Bot thinking indicator: Text overlay — continues to work in new layout

### Established Patterns
- Overlay positioning: `absolute inset-0` on board container
- Piece colors: `bg-red-600` / `bg-blue-600` with white text
- Gold border for selection: `ring-2 ring-[#d4a847]`
- Valid moves: green tint overlay (`rgba(74,124,74,0.5)`)
- Glass-morphism: `backdrop-blur-sm bg-white/10` variants available in Tailwind

### Integration Points
- `page.tsx`: Restructure from `flex flex-col` to `flex flex-col md:flex-row`; add sidebar overlay during deployment
- `Board.tsx`: Add `transform` prop or conditional class for 180deg rotation based on `playerSide === 'red'`
- `PiecePalette.tsx`: Extract into sidebar, restructure to vertical grouped layout
- `gameStore.ts` / `roomStore.ts`: No data changes needed — visual-only flip

### What NOT to Change
- Server-side game logic (deployment zones, validation, movement)
- Piece data structure (`id`, `type`, `owner`, `rank`, `revealed`)
- Socket event payloads
- Game engine (`server/src/game/engine.ts`)

</code_context>

<specifics>
## Specific Ideas

- "Deploy your forces on the right, view the board on the left"
- Sidebar feels modern and glassy — like frosted glass over the board edge
- Board flip makes it feel like you're playing from your side of the table
- Navy/teal gives a sophisticated, strategic game feel
- Gold zone highlight feels premium and guides placement

</specifics>

<deferred>
## Deferred Ideas

- Mobile sidebar behavior (expandable/collapsible on mobile) — decide during implementation
- BattleReveal animation direction after board flip — may need Phase 7 patch or Phase 8 fix
- Fog-of-war "?" style (font, color, size) — Phase 8 discussion

---

*Phase: 07-side-by-side-layout-board-perspective-flip*
*Context gathered: 2026-03-20*
