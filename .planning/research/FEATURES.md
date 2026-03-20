# Feature Research: v1.1 UI Redesign

**Domain:** Board game UI — side-by-side layout, fog-of-war, deployment panel repositioning
**Researched:** 2026-03-20
**Confidence:** HIGH (codebase analysis) + MEDIUM (external pattern research)

## Feature Landscape

### Table Stakes (Users Expect These)

Features that feel broken if missing. Board game players have strong layout expectations from chess.com, lichess, and physical play.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Player always at bottom** | Every chess/board game UI places the active player's pieces closest to them. Physical play reinforces this. Flipping perspective for the "blue" player is essential. | MEDIUM | Requires coordinate transformation in rendering + click handling. Board.tsx, page.tsx, DeploymentZone.tsx all affected. |
| **Enemy pieces hidden during play** | Core Salpakan rule — fog of war is the game's defining mechanic (per salpakan.games: "The enemy formation is hidden from your sight — the fog of war applies!"). Showing ranks defeats the entire game. | LOW-MEDIUM | Piece.tsx gets a conditional render: show "?" for enemy pieces. Piece.revealed field already exists in types but is never set. |
| **Board + controls visible simultaneously** | Players need to see both the board and available actions without scrolling. Lichess and chess.com both use side-by-side on desktop, stacking on mobile. | LOW | CSS layout change only — replace `flex-col` with `flex-row` + responsive breakpoint. |
| **Deployment zone at bottom** | Player deploys at bottom (rows 5-7) when they're the active player. Currently Red always = top rows 0-2 regardless of player perspective. | MEDIUM | DeploymentZone.tsx already has `side` prop with conditional rendering. Needs to map player side → bottom zone consistently. |

### Differentiators (Competitive Advantage)

Features that go beyond minimum and make the game feel polished.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Vertical piece palette in right panel** | A vertical stack of 15 piece types (1★, 2★, ..., 5★, Col, LtC, Maj, Cpt, 1Lt, 2Lt, Sgt, Pvt×6, Spy×2, Flag) is more scannable than the current horizontal scroll. Grouping by category (Generals, Officers, Special, Privates) aids strategic deployment. | MEDIUM | PiecePalette.tsx needs redesign from horizontal scroll → vertical list with categories. |
| **Revealed piece tracking** | After battle, the winning piece's rank becomes known to the opponent. Traditional Salpakan tracks this mentally; showing a "known" indicator (e.g., dimmed rank text) rewards aggressive play and adds strategic depth. | MEDIUM | Need server-side tracking of which pieces each player has seen. Piece.revealed exists but needs server logic. |
| **Board row/column labels** | Coordinate labels (a-i columns, 1-8 rows) help players communicate and learn. Chess.com and lichess both show these. | LOW | Pure CSS addition to Board.tsx grid. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Animated piece movement** | "It would look cool" | Deferred to v2 per PROJECT.md. Adds complexity to coordinate system (especially with board flipping). Blocks this milestone. | Keep instant placement. Add in v2 after layout is stable. |
| **Showing piece count for enemy** | "I want to know how many privates they have left" | Breaks fog-of-war entirely. Part of Salpakan's strategy is tracking enemy pieces mentally. | Show only after game ends (already done in game over). |
| **Drag-and-drop deployment** | "Dragging pieces feels more natural" | Drag + touch + board flipping = massive complexity increase. Click-to-select then click-to-place is proven (chess.com uses it too). | Keep click-to-select + click-to-place pattern. |

## Feature Dependencies

```
[Board Perspective Flip]
    └──requires──> [Board.tsx coordinate transform]
    └──requires──> [page.tsx deployment zone mapping]
    └──requires──> [gameStore valid moves transform]

[Side-by-Side Layout]
    └──requires──> [page.tsx flex-row with responsive breakpoint]
    └──enhances──> [Board Perspective Flip] (full screen height for board)

[Fog of War]
    └──requires──> [Piece.tsx conditional render logic]
    └──requires──> [gameStore/roomStore playerSide access]
    └──enhances──> [Battle Reveal] (already exists — fog makes reveal more dramatic)

[Piece Palette Right Panel]
    └──requires──> [Side-by-Side Layout] (panel needs horizontal space)
    └──conflicts──> [Mobile stacking] (must collapse to horizontal on narrow screens)

[Revealed Piece Tracking]
    └──requires──> [Fog of War] (must exist to track what was hidden)
    └──requires──> [Server-side reveal state] (new server logic)
```

### Dependency Notes

- **Board Perspective Flip requires coordinate transform:** When blue player views the board, row 0 becomes row 7 visually. Click handlers must translate visual coordinates back to logical coordinates. This is the highest-risk change.
- **Piece Palette conflicts with mobile:** On screens < 768px, right panel must stack below board (current behavior). The vertical palette reverts to horizontal scroll on mobile.
- **Fog of War enhances Battle Reveal:** Currently BattleReveal shows both pieces. With fog, the defender piece is "?" before battle — the reveal animation becomes much more exciting because the player genuinely doesn't know what they're attacking.

## MVP Definition

### Launch With (v1.1)

These three features are the entire milestone scope per PROJECT.md:

- [ ] **Side-by-side layout** — Board on left, deployment panel on right. Stack vertically on mobile (< 768px). Board gets full height on desktop.
- [ ] **Board perspective flip** — Player always deploys at bottom and sees their pieces at bottom. Coordinate system transforms for blue player.
- [ ] **Fog of war** — Enemy pieces render as "?" during gameplay. Battle reveal shows true rank on combat. Own pieces always visible.

### Add After Validation (v1.1.x)

- [ ] **Vertical piece palette with categories** — Group pieces by rank tier once the basic right-panel layout works
- [ ] **Revealed piece tracking** — After a piece wins a battle, show a subtle indicator of its rank to the opponent
- [ ] **Row/column labels** — Add coordinate markers to the board grid

### Future Consideration (v2+)

- [ ] Piece movement animations — Deferred per PROJECT.md
- [ ] Drag-and-drop — Not needed, click pattern works

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Side-by-side layout | HIGH | LOW | P1 |
| Board perspective flip | HIGH | MEDIUM | P1 |
| Fog of war (hidden enemy) | HIGH (core mechanic) | LOW-MEDIUM | P1 |
| Vertical piece palette | MEDIUM | MEDIUM | P2 |
| Revealed piece tracking | MEDIUM | MEDIUM | P2 |
| Row/column labels | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for v1.1 milestone
- P2: Should have, add if time permits
- P3: Nice to have, future

## Component Impact Analysis

### Files Requiring Changes

| Component | Change | Risk |
|-----------|--------|------|
| `page.tsx` | Wrap board + palette in side-by-side flex container. Add responsive breakpoint. | LOW — layout only |
| `Board.tsx` | Add coordinate transform for blue player perspective. Flip grid rendering order. | HIGH — affects click coordinates, valid moves display, piece positions |
| `Piece.tsx` | Add fog-of-war conditional: render "?" for enemy pieces when `gameStatus === 'playing'` | LOW — single conditional |
| `PiecePalette.tsx` | Restructure from horizontal scroll to vertical list when in right panel | MEDIUM — significant DOM change |
| `DeploymentZone.tsx` | Map `playerSide` to bottom zone regardless of color | LOW — already has conditional logic |
| `gameStore.ts` | Transform `validMoves` coordinates when board is flipped | MEDIUM — state logic change |
| `BattleReveal.tsx` | No changes needed — already shows both pieces on combat | NONE |

### Files NOT Requiring Changes

- `roomStore.ts` — playerSide already stored, no new state needed
- `types/index.ts` — Piece.revealed field already exists
- `globals.css` — Tailwind classes handle responsive layout

## Sources

- **Codebase analysis:** All 8 component files, both stores, types/index.ts
- **Salpakan reference:** salpakan.games — confirms fog-of-war is the defining mechanic
- **Chess UI patterns:** lichess.org, chess.com — side-by-side layout is standard for desktop board games
- **CSS layout patterns:** CSS Grid + Flexbox responsive patterns (dev.to, matthewjamestaylor.com) — flex-row with breakpoint at 768px is the standard approach
- **Fog-of-war implementations:** DarkChess, Fog of War Chess variants — "?" symbol for hidden pieces is the established pattern
- **Board game UI strategy:** Game Developer article on strategy game UI — emphasizing simultaneous visibility of board + controls

---
*Feature research for: Game of the Generals v1.1 UI Redesign*
*Researched: 2026-03-20*
