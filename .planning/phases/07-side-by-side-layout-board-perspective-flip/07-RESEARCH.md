# Phase 7: Side-by-Side Layout + Board Perspective Flip - Research

**Researched:** 2026-03-20
**Domain:** CSS layout restructuring, CSS transforms for board perspective, glass-morphism UI, responsive Tailwind CSS
**Confidence:** HIGH

## Summary

Phase 7 restructures the game UI from a vertical stack to a side-by-side layout with a glass-morphism sidebar overlay, adds a board perspective flip so the player always sees their deployment zone at the bottom, and redesigns the piece palette as a vertical categorized list. All changes are pure CSS + React conditional rendering — zero new dependencies.

The core technical question is whether `transform: rotate(180deg)` on the board grid breaks click coordinate mapping. **Answer: No.** CSS transforms are purely visual — the DOM structure, `data-row`/`data-col` attributes, and event target resolution remain unchanged. Each cell's click handler still receives the correct logical `(row, col)` from its `data-*` attributes. The child elements (pieces) counter-rotate with their own `rotate(180deg)` to keep text readable.

The glass-morphism sidebar uses Tailwind's `backdrop-blur-md` + `bg-[rgba(30,58,95,0.5)]` which is a well-established pattern with HIGH confidence. The responsive layout uses `flex-col md:flex-row` with the sidebar switching from `absolute` overlay on desktop to `relative` block on mobile below 768px.

**Primary recommendation:** Use CSS `transform: rotate(180deg)` on the board grid container (not data manipulation) and counter-rotate child content with `rotate(180deg)`. Wrap board + all overlays in a single `relative` container. Build sidebar as new `DeploymentSidebar.tsx` component.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Sidebar on the **right side** of the board
- Width: **~30-35%** of total width
- Layout: **Overlay** — sidebar overlaps board's right edge (not beside)
- Background: **Translucent/blurred** glass-morphism (deep navy tint with backdrop blur)
- Sidebar **visible only during deployment phase**, hidden during playing phase
- Contains: vertical piece palette + Auto-Deploy button + Ready button
- Board flips **always** — both during deployment and playing phases
- **Visual-only flip** — data model unchanged (server-side logic unaffected)
- Method: **CSS transform rotate(180deg)** on the board grid
- Player-color aware: when playerSide is 'red', rotate board 180deg so player deploy zone (rows 5-7) appears at bottom of screen
- Click coordinates **map to logical positions** — e.g., clicking visually bottom cell resolves to that cell's logical row/col in the data array
- Coordinate transform handled in a `useBoardTransform` hook or Board component logic
- Board dark squares: **Deep navy** (#1e3a5f or similar)
- Board light squares: **Teal** (#2d5a6b or similar)
- Deployment zone highlight: **Gold** glow
- Valid move highlight: **Green** (keep existing green from Phase 2)
- Sidebar panel: **Deep navy** glass-morphism (matches board dark squares)
- Piece colors: **Red/Blue** (keep current, unchanged)
- Page background: Dark forest green (keep existing #1a2e1a or adjust to complement navy)
- Pieces **grouped by rank tier** with section headers:
  - Generals (5★)
  - Officers (4★, 3★, 2★)
  - Special (1★, Spy)
  - Privates (PVT)
- Groups **always expanded** — no collapsible sections
- Each piece item shows: **icon + name + count badge** (compact)
- Pieces arranged as **vertical list** within each tier group
- Horizontal layout inside each piece item (icon | name | count)
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

### Deferred Ideas (OUT OF SCOPE)

- Mobile sidebar behavior (expandable/collapsible on mobile) — decide during implementation
- BattleReveal animation direction after board flip — may need Phase 7 patch or Phase 8 fix
- Fog-of-war "?" style (font, color, size) — Phase 8 discussion
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAYOUT-01 | Deployment panel renders as sidebar overlay on the right side of the board during deployment phase | Glass-morphism sidebar pattern with `absolute right-0 top-0 bottom-0 w-[32%] backdrop-blur-md bg-[rgba(30,58,95,0.5)]`; sidebar visible when `gameStatus === 'deploying'` |
| LAYOUT-02 | Layout stacks vertically on mobile (below 768px) — board on top, controls below | Tailwind `flex flex-col md:flex-row` responsive pattern; sidebar switches from `absolute` overlay to `relative` block below `md:` breakpoint |
| LAYOUT-03 | Player always sees their deployment zone at the bottom of the board (board perspective flip) | CSS `transform: rotate(180deg)` on board grid when `playerSide === 'red'`; child content counter-rotates; click coordinates unaffected (data attributes preserved) |
| LAYOUT-04 | Deployment sidebar hidden during playing phase (only visible during deployment) | Conditional rendering: `{gameStatus === 'deploying' && <DeploymentSidebar />}` with `translate-x-full` / `translate-x-0` transition |
| LAYOUT-05 | All overlays (DeploymentZone, BattleReveal, WinModal, bot thinking) remain correctly positioned in new layout | Wrap board + all overlays in single `relative` container; overlays use `absolute inset-0` referencing that container |
| PALETTE-01 | PiecePalette renders as vertical list in side panel during deployment (not horizontal scroll) | Restructure PiecePalette from `flex overflow-x-auto` to `flex flex-col` when inside sidebar; preserve horizontal scroll on mobile fallback |
| PALETTE-02 | Pieces grouped by rank tier (Generals, Officers, Special, Privates) | Group PIECE_CONFIG by rank ranges: Generals (rank 10-11), Officers (rank 6-9), Special (rank -2 to 2), Privates (rank -1); render tier headers between groups |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | 3.4.1 | Layout utilities, glass-morphism, responsive breakpoints | Already installed; `backdrop-blur-md`, `flex-col md:flex-row`, opacity utilities cover all needs |
| React | 18.2.0 | Conditional rendering for sidebar visibility, board flip state | Already installed; no new hooks needed beyond optional `useBoardTransform` |
| Next.js | 14.2.0 | App Router, client components | Already installed; all game components are `'use client'` |
| Zustand | 4.4.7 | Read `playerSide` from roomStore, `gameStatus` from gameStore | Already installed; no store changes needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS `transform: rotate(180deg)` | N/A (native) | Board perspective flip | Applied conditionally to board grid when `playerSide === 'red'` |
| Tailwind `backdrop-blur-md` | 3.4.1 | Glass-morphism sidebar effect | ~12px Gaussian blur on background behind sidebar |
| Tailwind `transition-transform` | 3.4.1 | Sidebar show/hide animation | Combined with `translate-x-0` / `translate-x-full` for 300ms slide |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS `transform: rotate(180deg)` | Conditional row rendering (reverse iteration) | Breaks `data-row`/`data-col` mapping; requires coordinate remapping in every click handler; higher bug risk |
| `useBoardTransform` hook | Inline coordinate math in Board.tsx | Hook is cleaner but optional — `data-*` attributes on each cell eliminate the need for coordinate math entirely |
| Absolute overlay sidebar | Flex-based sidebar (non-overlay) | Flex approach pushes board narrower; overlay keeps board at full width |

**Installation:**
```bash
# No installation needed — zero new dependencies
```

## Architecture Patterns

### Recommended Project Structure
```
client/src/features/game/
├── Board.tsx              # MODIFY: add conditional rotate class
├── DeploymentSidebar.tsx  # NEW: sidebar container component
├── DeploymentZone.tsx     # UNCHANGED
├── Piece.tsx              # UNCHANGED (Phase 8 adds fog-of-war)
├── PiecePalette.tsx       # MODIFY: support vertical layout variant
├── BattleReveal.tsx       # UNCHANGED
├── WinModal.tsx           # UNCHANGED
```

### Pattern 1: CSS Board Flip (rotate 180deg + counter-rotate children)
**What:** Apply `transform: rotate(180deg)` to the board grid container when `playerSide === 'red'`. Each cell's content (piece) counter-rotates with `transform: rotate(180deg)` so text/icons remain right-side-up.
**When to use:** When you want visual-only board flip without touching data coordinates.
**Example:**
```tsx
// Board.tsx grid container
<div
  className={`
    relative grid grid-cols-9 grid-rows-8 gap-0 aspect-[9/8]
    border-4 border-[#2d5a2d] rounded-lg overflow-hidden shadow-2xl
    transition-transform duration-500 ease-in-out
    ${playerSide === 'red' ? 'rotate-180' : ''}
  `}
>
  {cells.map(cell => (
    <div data-row={row} data-col={col} ...>
      {/* Piece counter-rotates to stay readable */}
      <div className={playerSide === 'red' ? 'rotate-180' : ''}>
        <Piece ... />
      </div>
    </div>
  ))}
</div>
```

**Key insight:** CSS `transform: rotate(180deg)` is purely visual. It does NOT change:
- DOM order or structure
- `data-row` / `data-col` attributes
- Event target resolution (`e.currentTarget.dataset.row`)
- The board array indices

Source: MDN CSS rotate() — "A rotation by 180° is called point reflection" — transforms the visual rendering only.

### Pattern 2: Glass-Morphism Sidebar Overlay
**What:** Semi-transparent navy background with backdrop blur, positioned absolutely over the board's right edge.
**When to use:** When an overlay panel should float above content while showing what's behind it.
**Example:**
```tsx
// DeploymentSidebar.tsx
<div
  className={`
    absolute right-0 top-0 bottom-0 w-[32%] z-30
    bg-[rgba(30,58,95,0.5)] backdrop-blur-md
    border-l border-white/10 rounded-l-lg
    shadow-2xl shadow-black/30
    overflow-y-auto
    transition-transform duration-300 ease-in-out
    ${gameStatus === 'deploying' ? 'translate-x-0' : 'translate-x-full'}
  `}
>
  {/* Sidebar content */}
</div>
```

**Tailwind classes breakdown:**
- `backdrop-blur-md` → `backdrop-filter: blur(12px)` — Gaussian blur on background
- `bg-[rgba(30,58,95,0.5)]` — 50% opacity navy overlay
- `border-l border-white/10` — Subtle left edge definition
- `shadow-2xl shadow-black/30` — Deep shadow for depth
- `translate-x-0` / `translate-x-full` — Slide in/out via CSS transform

Source: Tailwind CSS docs + glass-morphism pattern from dev.to/css-tricks (verified Feb 2026).

### Pattern 3: Responsive Layout Switching
**What:** Use `md:` breakpoint prefix to switch from stacked to side-by-side layout. Sidebar changes from absolute overlay to relative block.
**When to use:** Any layout that needs different structure on mobile vs desktop.
**Example:**
```tsx
// page.tsx main container
<main className="min-h-screen flex flex-col md:flex-row items-center justify-center p-4 bg-[#1a2e1a] gap-4">
  {/* Board section — relative container for overlays */}
  <div className="relative max-w-3xl w-full md:flex-1">
    <Board ... />
    {/* All overlays stay here — absolute inset-0 */}
    <DeploymentZone ... />
    {battleOutcome && <div className="absolute inset-0"><BattleReveal ... /></div>}
    {botThinking && <div className="absolute inset-0">...</div>}
  </div>

  {/* Sidebar — overlay on desktop, stacked below on mobile */}
  <DeploymentSidebar ... />
</main>
```

### Pattern 4: Vertical Piece Palette with Tier Groups
**What:** PiecePalette renders as vertical list grouped by rank tier. Each tier has a header, pieces listed vertically with horizontal item layout (icon | name | count).
**When to use:** When pieces need categorical organization instead of flat horizontal scroll.
**Example:**
```tsx
// PiecePalette.tsx vertical layout
const TIERS = [
  { label: 'Generals (5★)', types: ['5-star', '4-star'] },
  { label: 'Officers (4-2★)', types: ['3-star', '2-star', '1-star', 'colonel'] },
  { label: 'Special', types: ['lieutenant-colonel', 'major', 'captain', '1st-lieutenant', '2nd-lieutenant', 'sergeant', 'spy'] },
  { label: 'Privates (PVT)', types: ['private'] },
];

// Render tier groups
{TIERS.map(tier => (
  <div key={tier.label}>
    <h3 className="text-xs font-semibold text-gray-400 px-3 py-1">{tier.label}</h3>
    {tier.types.map(type => (
      <button className="flex items-center gap-2 px-3 py-2 w-full ...">
        <span className={iconClasses}>{symbol}</span>
        <span className="flex-1 text-sm">{name}</span>
        <span className="text-xs text-gray-300">×{remaining}</span>
      </button>
    ))}
  </div>
))}
```

**Note:** The UI-SPEC defines tier groupings differently from the CONTEXT.md. The UI-SPEC groups are authoritative:
- Generals (5★): 5-star, 4-star
- Officers (4-2★): 3-star, 2-star, 1-star, colonel
- Special: lieutenant-colonel, major, captain, 1st-lieutenant, 2nd-lieutenant, sergeant, spy
- Privates (PVT): private (×6)

### Anti-Patterns to Avoid
- **Conditional row rendering for board flip:** Rendering rows in reverse order breaks `data-row` attributes and requires coordinate remapping everywhere. Use CSS transform instead.
- **Hardcoded pixel widths for sidebar:** Use percentage (`w-[32%]`) so sidebar scales with board container.
- **Placing overlays outside the board container:** All overlays must be children of the `relative` board container to maintain `absolute inset-0` positioning.
- **Making PiecePalette a separate page-level component:** It belongs inside the sidebar, not as a sibling to the board.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Board perspective flip | Custom coordinate remapping logic in every handler | CSS `transform: rotate(180deg)` | Visual-only, zero coordinate bugs, DOM unchanged |
| Glass-morphism effect | Manual CSS filters + opacity calculations | Tailwind `backdrop-blur-md bg-[rgba(...)]` | Built-in browser optimization, proven pattern |
| Sidebar show/hide | JavaScript visibility toggling | Tailwind `translate-x-0` / `translate-x-full` + `transition-transform` | GPU-accelerated, smooth 300ms animation |
| Responsive layout | Manual media queries | Tailwind `md:` breakpoint prefix | Consistent with existing codebase pattern |
| Piece tier grouping | Custom sorting/filtering logic | Static `TIERS` array mapping types to labels | Declarative, easy to modify, matches UI-SPEC |

**Key insight:** Every change in Phase 7 is CSS layout + conditional rendering. No new JavaScript logic, no store changes, no server changes. The only "logic" is `playerSide === 'red' ? 'rotate-180' : ''` and `gameStatus === 'deploying'` conditional rendering.

## Common Pitfalls

### Pitfall 1: Board Flip Breaks Click Coordinates
**What goes wrong:** If you reverse the row rendering order instead of using CSS transform, the `data-row` attribute on each cell still says `0-7` but the visual order is reversed. Clicking the bottom row (visual) still fires the click handler for row 7, but visually it should be row 0.
**Why it happens:** DOM attributes don't change when you reverse iteration order — only visual position changes.
**How to avoid:** Use `transform: rotate(180deg)` on the grid container. The DOM stays the same, only visual rendering flips. Each cell's `data-row`/`data-col` correctly maps to its logical position.
**Warning signs:** After implementing board flip, deploy a piece to the visual bottom — if it appears at the top of the data array (row 0-2), the coordinate mapping is wrong.

### Pitfall 2: Piece Text Renders Upside-Down After Board Flip
**What goes wrong:** After rotating the board 180deg, all piece text (5★, Col, Spy, etc.) appears upside-down.
**Why it happens:** CSS `rotate(180deg)` rotates the entire element including its children.
**How to avoid:** Apply a counter-rotation `rotate(180deg)` to each cell's content (the Piece wrapper). Since 180deg + 180deg = 360deg = 0deg, the text appears normal. Use: `<div className={playerSide === 'red' ? 'rotate-180' : ''}>` inside each cell.
**Warning signs:** Visually inspect piece labels after flip — any upside-down text means counter-rotation is missing.

### Pitfall 3: Overlays Misalign After Layout Change
**What goes wrong:** DeploymentZone, BattleReveal, WinModal, and bot thinking overlay appear offset or clipped after the side-by-side layout change.
**Why it happens:** These overlays use `absolute inset-0` which positions relative to the nearest `position: relative` ancestor. If the board container's dimensions change (sidebar takes width), overlays may not align.
**How to avoid:** Wrap board + all overlays in a single `<div className="relative">` container. Ensure this container has explicit sizing that matches the board grid. The sidebar is `absolute` and does NOT affect the board container's width.
**Warning signs:** After layout change, DeploymentZone gold highlight doesn't align with the bottom 3 rows of the board.

### Pitfall 4: Sidebar Pushes Board Width Narrower
**What goes wrong:** If sidebar is a flex sibling (not overlay), it takes 32% of width, pushing the board to 68% — smaller than before.
**Why it happens:** Using `flex-row` without making the sidebar `absolute`.
**How to avoid:** Sidebar MUST be `absolute right-0 top-0 bottom-0` inside the board's `relative` container. This overlays the sidebar on top of the board without affecting board width. The board container uses `flex-1` to fill available space.
**Warning signs:** Board is visibly narrower than before the layout change.

### Pitfall 5: Tailwind rotate-180 Class Not Available
**What goes wrong:** Tailwind's `rotate-180` class might not exist or might have different behavior than expected in v3.4.1.
**Why it happens:** Tailwind v3 includes `rotate-180` as a standard utility (`transform: rotate(180deg)`), but if the Tailwind config purges or customizes transform utilities, it may be missing.
**How to avoid:** Verify `rotate-180` is available in Tailwind 3.4.1 (it is — standard utility). As fallback, use arbitrary value `rotate-[180deg]`.
**Warning signs:** Board doesn't rotate when `rotate-180` class is applied. Check browser DevTools for the class being compiled.

### Pitfall 6: Glass-Morphism Performance on Low-End Devices
**What goes wrong:** `backdrop-blur-md` causes frame drops on mobile/low-end GPUs because Gaussian blur is computationally expensive.
**Why it happens:** The browser must sample and blur pixels behind the sidebar on every frame.
**How to avoid:** Use `backdrop-blur-md` (12px) not `backdrop-blur-xl` (24px) — smaller radius = less GPU cost. The sidebar is only visible during deployment (static content), so frame drops are minimal. On mobile fallback, switch to solid `bg-[#2d4a2d]` (no blur).
**Warning signs:** Sidebar animation stutters on mobile devices or during scroll.

## Code Examples

Verified patterns from existing codebase and official sources:

### Board Flip with Counter-Rotation
```tsx
// Board.tsx — grid container + cell content
// Source: CSS transform is purely visual per MDN
<div className={`grid grid-cols-9 grid-rows-8 ... ${playerSide === 'red' ? 'rotate-180' : ''}`}>
  {Array.from({ length: 8 }, (_, rowIndex) =>
    Array.from({ length: 9 }, (_, colIndex) => (
      <div
        key={`${rowIndex}-${colIndex}`}
        data-row={rowIndex}
        data-col={colIndex}
        onClick={() => handleCellClick(rowIndex, colIndex)}
        className="relative flex items-center justify-center ..."
      >
        {/* Counter-rotate content so text stays readable */}
        <div className={playerSide === 'red' ? 'rotate-180' : ''}>
          {piece && <Piece piece={piece} ... />}
        </div>
      </div>
    ))
  )}
</div>
```

### Glass-Morphism Sidebar
```tsx
// DeploymentSidebar.tsx
// Source: Tailwind CSS backdrop-blur pattern (verified Feb 2026)
<div
  className={`
    absolute right-0 top-0 bottom-0 w-[32%] z-30
    bg-[rgba(30,58,95,0.5)] backdrop-blur-md
    border-l border-white/10 rounded-l-lg
    shadow-2xl shadow-black/30
    overflow-y-auto
    transition-transform duration-300 ease-in-out
    ${gameStatus === 'deploying' ? 'translate-x-0' : 'translate-x-full'}
  `}
>
  <div className="p-4">
    <h2 className="text-lg font-bold text-[#d4a847]">Deploy Your Forces</h2>
    <p className="text-sm text-gray-400">{totalDeployed}/21 pieces placed</p>
  </div>
  <PiecePalette ... />
  <div className="p-4 flex flex-col gap-2">
    <button onClick={handleAutoDeploy} className="...">Auto-Deploy</button>
    <button onClick={handleReady} className="...">Ready</button>
  </div>
</div>
```

### Responsive Container
```tsx
// page.tsx — main layout
// Source: Existing codebase + Tailwind responsive docs
<main className="min-h-screen flex flex-col md:flex-row items-center justify-center p-4 bg-[#1a2e1a] gap-4">
  {/* Board + overlays in relative container */}
  <div className="relative max-w-3xl w-full">
    <Board onCellClick={handleCellClick} />
    <DeploymentZone side={playerSide ?? 'red'} isVisible={gameStatus === 'deploying'} />
    {/* BattleReveal, WinModal, bot thinking overlays — unchanged */}
  </div>

  {/* Sidebar — overlay on desktop, stacked on mobile */}
  {gameStatus === 'deploying' && (
    <DeploymentSidebar
      deployedCounts={deployedCounts}
      selectedType={selectedPieceType}
      onSelectPiece={(type) => setSelectedPieceType(type as PieceType)}
      playerSide={playerSide ?? 'red'}
      onAutoDeploy={handleAutoDeploy}
      onReady={handleReady}
      allPiecesDeployed={allPiecesDeployed}
      playerReady={playerReady}
      totalDeployed={totalDeployed}
    />
  )}
</main>
```

### DeploymentZone After Board Flip
```tsx
// DeploymentZone.tsx — no change needed!
// The zone overlay uses absolute positioning within the board container.
// Since the board grid visually rotates 180deg, the zone also rotates with it.
// Red zone (rows 0-2) which is at logical top → visually appears at bottom after flip.
// Blue zone (rows 5-7) which is at logical bottom → visually appears at top after flip.
// This is the CORRECT behavior — player always sees their zone at bottom.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Board with green squares (`#3a6a3a`/`#4a7c4a`) | Navy/teal palette (`#1e3a5f`/`#2d5a6b`) | Phase 7 | Modern, strategic feel; update `tailwind.config.ts` board colors |
| Horizontal scroll piece palette | Vertical categorized list in sidebar | Phase 7 | Better piece discovery; groups by rank tier |
| Board always shows red at top | CSS flip so player sees their zone at bottom | Phase 7 | Intuitive perspective; no data model changes |
| Controls below board | Sidebar overlay on right | Phase 7 | Board stays full-width; modern overlay UI |

**Deprecated/outdated:**
- Green board colors (`#3a6a3a`, `#4a7c4a`): Replaced by navy/teal — update both `tailwind.config.ts` and inline classes in Board.tsx
- Horizontal scroll palette class `.piece-palette`: Still needed for mobile fallback, but vertical layout is primary on desktop

## Open Questions

1. **Counter-rotation wrapper scope**
   - What we know: Each cell needs a wrapper `<div>` that counter-rotates when board is flipped
   - What's unclear: Whether this wrapper should be in Board.tsx (around Piece) or inside Piece.tsx
   - Recommendation: Put wrapper in Board.tsx — Piece.tsx shouldn't know about board flip state. This keeps Piece.tsx reusable.

2. **Tailwind `rotate-180` transition smoothness**
   - What we know: `transition-transform duration-500` should animate the 180deg rotation over 500ms
   - What's unclear: Whether 180deg rotation animation looks good (flipping through intermediate angles) or if instant flip is better
   - Recommendation: Use `duration-500` for first implementation. If the mid-rotation looks jarring (board appears upside-down at 90deg), switch to instant flip (remove transition) or use `transition-opacity` fade instead.

3. **Mobile sidebar behavior**
   - What we know: Below 768px, sidebar should stack below board
   - What's unclear: Whether to use glass-morphism on mobile or solid background
   - Recommendation: Per UI-SPEC, use solid `bg-[#2d4a2d]` on mobile (no blur) for performance. PiecePalette switches from vertical to horizontal scroll.

4. **BattleReveal animation direction after board flip**
   - What we know: BattleReveal slides pieces horizontally (-translate-x-6 / translate-x-6)
   - What's unclear: Whether horizontal slides feel wrong when player perspective is flipped
   - Recommendation: Defer to Phase 8 or patch. The BattleReveal overlay covers the entire board (`absolute inset-0`) so direction is relative to screen, not board.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test files found |
| Config file | none — see Wave 0 |
| Quick run command | `npm run lint` (ESLint only) |
| Full suite command | `npm run build` (build verification) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAYOUT-01 | Sidebar overlay on right during deployment | Manual visual | `npm run dev` → inspect | ❌ Wave 0 |
| LAYOUT-02 | Stacks vertically on mobile < 768px | Manual visual | `npm run dev` → resize | ❌ Wave 0 |
| LAYOUT-03 | Player sees deploy zone at bottom (board flip) | Manual visual | `npm run dev` → test red/blue | ❌ Wave 0 |
| LAYOUT-04 | Sidebar hidden during playing phase | Manual visual | `npm run dev` → transition to playing | ❌ Wave 0 |
| LAYOUT-05 | Overlays remain positioned correctly | Manual visual | `npm run dev` → test each overlay | ❌ Wave 0 |
| PALETTE-01 | Vertical list in sidebar | Manual visual | `npm run dev` → inspect sidebar | ❌ Wave 0 |
| PALETTE-02 | Pieces grouped by rank tier | Manual visual | `npm run dev` → inspect sidebar | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run lint && npm run build`
- **Per wave merge:** `npm run build` (full Next.js production build)
- **Phase gate:** `npm run build` green + manual visual verification of all 7 requirements

### Wave 0 Gaps
- [ ] No automated visual regression tests — all 7 requirements are UI layout changes requiring manual verification
- [ ] No Playwright/Cypress e2e tests — consider adding for LAYOUT-03 (board flip click coordinates) at minimum
- [ ] Framework install: `npm install -D @playwright/test` — if e2e tests are desired

*(Phase 7 is almost entirely visual layout — manual verification is the pragmatic approach. Build verification catches compilation errors. Consider Playwright only for the board flip coordinate mapping test.)*

## Sources

### Primary (HIGH confidence)
- Existing codebase — `page.tsx`, `Board.tsx`, `Piece.tsx`, `PiecePalette.tsx`, `DeploymentZone.tsx`, `BattleReveal.tsx`, `gameStore.ts`, `roomStore.ts`, `types/index.ts` (direct analysis)
- Tailwind CSS 3.4.1 docs — `backdrop-blur-*`, `rotate-*`, `translate-x-*`, `md:` responsive prefix
- UI-SPEC (`07-UI-SPEC.md`) — Approved design contract with exact color values, spacing, typography, layout diagram
- MDN CSS `rotate()` — Confirms rotate(180deg) is point reflection, purely visual transform

### Secondary (MEDIUM confidence)
- WebSearch: Tailwind glass-morphism patterns (Feb 2026) — confirmed `backdrop-blur-md bg-[rgba(...)]` pattern
- WebSearch: CSS transform rotate click coordinates — confirmed `data-*` attributes unaffected by CSS transforms
- Research SUMMARY.md — Project-level architecture recommendations, pitfall analysis

### Tertiary (LOW confidence)
- WebSearch: CSS board game counter-rotation text readability — general CSS rotation patterns, not specific to board games

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All existing dependencies, zero new installs, Tailwind 3.4.1 utilities confirmed
- Architecture: HIGH — UI-SPEC is approved with exact specs; codebase fully analyzed; CSS transform approach verified via MDN
- Pitfalls: HIGH — All pitfalls derived from actual code analysis; counter-rotation and overlay positioning patterns well-established

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (30 days — Tailwind CSS and CSS transforms are stable technologies)
