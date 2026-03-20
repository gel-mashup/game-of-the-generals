# Stack Research: Side-by-Side Layout & Hidden Pieces

**Domain:** CSS layout restructuring for board game UI
**Researched:** 2026-03-20
**Confidence:** HIGH

## Recommended Stack

### Core Layout Approach

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tailwind CSS Flexbox | 3.4.1 (installed) | Side-by-side layout container | Mobile-first, responsive with `md:` breakpoint prefix. No new deps needed. |
| Tailwind CSS Grid | 3.4.1 (installed) | Board grid (unchanged) | Already proven in existing 9×8 board. Keep as-is. |
| CSS `hidden` / conditional rendering | built-in | Hide enemy piece identities | React conditional rendering + Tailwind `hidden` utilities. Zero performance cost. |

### Supporting Patterns

| Pattern | Tailwind Classes | Purpose | When to Use |
|---------|------------------|---------|-------------|
| Flex row with gap | `flex flex-row gap-6` | Side-by-side board + panel | Main game container on `md:`+ screens |
| Flex column fallback | `flex flex-col gap-4` | Stacked layout on mobile | Default (mobile-first) |
| Width splitting | `md:w-[65%] md:w-[35%]` | Board gets ~65%, panel ~35% | Side-by-side mode |
| Vertical centering | `items-start justify-center` | Panel aligns to board top | Side-by-side mode |
| Responsive hide | `hidden md:block` | Hide panel label on mobile | Small screen optimization |
| Sticky panel | `md:sticky md:top-4` | Panel scrolls with viewport | When panel is taller than viewport |

## Detailed Layout Architecture

### Current Layout (v1.0)

```
<main className="min-h-screen flex flex-col items-center p-4 gap-4">
  ┌─────────────────────────────┐
  │        Game Header          │  max-w-3xl
  ├─────────────────────────────┤
  │                             │
  │      9×8 Board Grid         │  max-w-3xl
  │    (aspect-[9/8])           │
  │                             │
  ├─────────────────────────────┤
  │     Deployment Controls     │  max-w-3xl (below board)
  │   PiecePalette + Buttons    │
  └─────────────────────────────┘
```

### Target Layout (v1.1)

```
<main className="min-h-screen flex flex-col items-center p-4 gap-4">
  ┌──────────────────────────────────────────────────────────┐
  │                     Game Header                          │  max-w-5xl
  ├────────────────────────────┬─────────────────────────────┤
  │                            │   Deploy Your Forces        │
  │                            │   14/21 pieces placed       │
  │      9×8 Board Grid        │                             │
  │      (aspect-[9/8])        │   ┌─ PiecePalette ───────┐ │
  │                            │   │ ♟♝♞♜♛♚ ...          │ │
  │                            │   └──────────────────────┘ │
  │                            │                             │
  │                            │   [ Auto-Deploy ] [ Ready ] │
  └────────────────────────────┴─────────────────────────────┘
       md:w-[65%]                    md:w-[35%]
```

### Implementation: The Wrapper Component

The key change is wrapping Board + DeploymentPanel in a flex row container:

```tsx
// GamePage layout change
<div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl mx-auto">
  {/* Board column — wider */}
  <div className="w-full md:w-[65%]">
    <Board onCellClick={handleCellClick} />
    {/* Battle/Winner overlays stay here, absolute positioned */}
  </div>

  {/* Deployment panel — side column (deploying phase only) */}
  {gameStatus === 'deploying' && (
    <div className="w-full md:w-[35%] flex flex-col gap-4">
      <h2 className="text-lg font-bold text-[#d4a847]">Deploy Your Forces</h2>
      <p className="text-sm text-gray-400">{totalDeployed}/21 pieces placed</p>
      <PiecePalette ... />
      <div className="flex gap-3">
        <button>Auto-Deploy</button>
        <button>Ready</button>
      </div>
    </div>
  )}
</div>
```

### Specific Tailwind Classes Needed

**Container (wraps Board + Panel):**
```
flex flex-col md:flex-row gap-6 w-full max-w-5xl mx-auto
```
- `flex flex-col` — mobile: stack vertically (current behavior)
- `md:flex-row` — ≥768px: side-by-side
- `gap-6` — 24px gap between board and panel (matches existing `lg` spacing token)
- `max-w-5xl` — wider than current `max-w-3xl` to accommodate both columns

**Board wrapper:**
```
w-full md:w-[65%] flex-shrink-0
```
- `w-full` — mobile: full width
- `md:w-[65%]` — 65% of container on desktop
- `flex-shrink-0` — prevent board from compressing (critical for the 9×8 grid)

**Panel wrapper:**
```
w-full md:w-[35%] flex flex-col gap-4
```
- `w-full` — mobile: full width below board
- `md:w-[35%]` — 35% on desktop
- `flex flex-col gap-4` — stack panel contents vertically

**PiecePalette inside panel (needs slight mod):**
```
flex flex-col gap-2 overflow-y-auto max-h-[60vh]
```
- Change from horizontal scroll (`overflow-x-auto`) to vertical scroll (`overflow-y-auto`)
- `max-h-[60vh]` — constrain height so it doesn't overflow viewport
- Wrap palette items in a 2-column grid: `grid grid-cols-2 gap-2`

## Responsive Breakpoint Strategy

| Screen | Width | Layout | Rationale |
|--------|-------|--------|-----------|
| Mobile | <768px | Stacked: board on top, panel below | Side-by-side too cramped |
| Tablet | 768–1024px | Side-by-side: 60/40 split | Board needs ~450px min for 9 cols |
| Desktop | >1024px | Side-by-side: 65/35 split | More room for board |

**Board minimum width consideration:**
- 9 columns × ~50px minimum per cell = ~450px minimum board width
- At 65% split: container needs ≥692px → `md` breakpoint (768px) works
- Below 768px: force stacked layout (mobile)

### Hidden Enemy Pieces (Fog of War)

This is NOT a CSS layout question — it's a React rendering change in `Piece.tsx`:

```tsx
// Piece.tsx modification
export default function Piece({ piece, position, onClick, isSelected, onInvalidClick }: PieceProps) {
  const { playerSide } = useRoomStore();

  // Determine if this piece should be hidden
  const isEnemyPiece = piece.owner !== playerSide;
  const shouldHide = isEnemyPiece && !piece.revealed;

  // ...
  <span className="text-white text-xs font-bold select-none drop-shadow">
    {shouldHide ? '?' : symbol}
  </span>
}
```

**No new CSS needed.** The `?` renders in the same styled container. The existing `opacity-60` class for unrevealed pieces can be repurposed or removed (since `?` already communicates mystery).

**`piece.revealed` already exists** in the data model — it's set to `true` after battles. This perfectly maps to fog-of-war: reveal identity only after combat.

## What NOT to Change

| Component | Current Approach | Keep? | Reason |
|-----------|-----------------|-------|--------|
| Board grid | `grid-cols-9 grid-rows-8 aspect-[9/8]` | ✅ Yes | Works perfectly, no reason to change |
| Board cell | `aspect-square` with checkerboard | ✅ Yes | Proven pattern |
| Piece styling | Rounded circle, color-coded | ✅ Yes | Works for `?` symbol too |
| DeploymentZone overlay | Absolute positioned overlay | ✅ Yes | Still valid during deployment phase |
| Board max-width | Currently `max-w-3xl` | ⚠️ Change to `w-full md:w-[65%]` | Must shrink to make room for panel |
| PiecePalette scroll | Horizontal (`overflow-x-auto`) | ⚠️ Change to vertical | Panel is vertical column |

## Installation

**No new packages needed.** Everything uses existing Tailwind 3.4.1 utilities.

```bash
# No npm install required — pure layout restructuring
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Flexbox (`flex flex-row`) | CSS Grid (`grid grid-cols-[65%_35%]`) | If you need the board and panel to always match heights. Flexbox is simpler for variable-height panel. |
| `md:` breakpoint (768px) | `lg:` breakpoint (1024px) | If you want side-by-side only on larger screens. `md` is correct — board fits at 768px. |
| Tailwind utilities | Custom CSS in globals.css | Never for this scope. All achievable with Tailwind. Don't add custom CSS. |
| `w-[65%]` arbitrary values | `flex-1` + `flex-[0_0_35%]` | Arbitrary percentages are more readable. `flex-1` makes board grow unpredictably. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| CSS Grid for outer layout | Flexbox simpler for 2-column responsive | `flex flex-col md:flex-row` |
| `@media` queries in globals.css | Inconsistent with Tailwind approach | Tailwind `md:` prefix |
| `position: fixed` for panel | Breaks on scroll, mobile | `md:sticky md:top-4` if scroll needed |
| ResizeObserver for layout | Over-engineering for 2 breakpoints | Tailwind responsive prefixes |
| New component library (Mantine, shadcn) | Massive scope creep | Tailwind utilities only |

## Version Compatibility

| Package | Current | Compatible With | Notes |
|---------|---------|-----------------|-------|
| tailwindcss@3.4.1 | ✅ | All flex/grid utilities | `flex-col`, `flex-row`, `w-[65%]` all supported |
| next@14.2.0 | ✅ | Tailwind 3.4.x | No issues |
| react@18.2.0 | ✅ | Conditional rendering | `hidden` + `md:block` pattern works |

## Sources

- [Tailwind CSS Responsive Design docs](https://tailwindcss.com/docs/responsive-design) — Breakpoint system, mobile-first approach (HIGH confidence)
- [Tailwind CSS Flexbox docs](https://tailwindcss.com/docs/flex-direction) — `flex-row`, `flex-col`, `gap` utilities (HIGH confidence)
- [Tailwind CSS Grid docs](https://tailwindcss.com/docs/grid-template-columns) — `grid-cols-*` for PiecePalette restructure (HIGH confidence)
- Existing codebase — Board.tsx, PiecePalette.tsx, DeploymentZone.tsx, page.tsx analysis (HIGH confidence)
- WebSearch results — Tailwind responsive layout patterns Feb 2026 (MEDIUM confidence)

---
*Stack research for: Side-by-side layout + hidden enemy pieces*
*Researched: 2026-03-20*
