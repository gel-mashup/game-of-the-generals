# Project Research Summary

**Project:** Game of the Generals v1.1 UI Redesign
**Domain:** Real-time multiplayer board game — CSS layout + fog-of-war
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Summary

Game of the Generals (Salpakan) is a 2-player strategy board game where fog-of-war is the defining mechanic — players cannot see enemy piece ranks until battle. The v1.1 milestone restructures the UI from a vertical stack (board on top, controls below) to a side-by-side layout (board left, deployment panel right) while adding two critical features: fog-of-war (hiding enemy piece identities) and board perspective flip (player always sees their pieces at the bottom). The existing codebase uses Next.js 14 + React 18 + Tailwind 3.4.1 + Zustand + Socket.io — no new dependencies are needed for any of these changes.

The recommended approach is pure Tailwind CSS layout restructuring using `flex-col md:flex-row` responsive breakpoints, client-side fog-of-war hiding (render "?" for enemy pieces during gameplay), and a visual board flip using CSS coordinate transformation rather than data manipulation. This keeps server changes to zero while delivering all three features. The trade-off is that client-only fog-of-war is technically inspectable via browser DevTools — acceptable for casual/friend play but would need server-side filtering for competitive multiplayer in the future.

The highest-risk change is the board perspective flip, which affects click coordinate mapping, valid move highlighting, and BattleReveal positioning. A `useBoardTransform` hook providing `visualToLogical()` and `logicalToVisual()` functions is recommended as the single source of truth for coordinate translation. Second risk: overlay components (DeploymentZone, BattleReveal, WinModal) use `absolute inset-0` positioning relative to the board container — changing container dimensions in the side-by-side layout may misalign these unless the board+overlays are wrapped in an explicit sized container.

## Key Findings

### Recommended Stack

Zero new dependencies. All changes use existing Tailwind 3.4.1 utilities and React conditional rendering. The side-by-side layout is a pure CSS flexbox restructuring — `flex flex-col md:flex-row gap-6` with a 65/35 width split on `md:` breakpoint (768px). Fog-of-war uses React conditional rendering (`isHidden ? '?' : symbol`) in Piece.tsx. The board grid (`grid-cols-9 grid-rows-8 aspect-[9/8]`) remains unchanged.

**Core technologies:**
- **Tailwind CSS Flexbox:** Side-by-side layout container — mobile-first responsive with `md:` breakpoint prefix, no new deps
- **Tailwind CSS Grid:** Board grid (unchanged from existing 9×8) — already proven
- **React conditional rendering:** Hide enemy piece identities — `Piece.tsx` renders "?" instead of rank symbol, zero performance cost
- **CSS `transform: rotate(180deg)`:** Board perspective flip — coordinates stay aligned, avoids click mapping bugs

### Expected Features

**Must have (v1.1 — table stakes):**
- Side-by-side layout — board on left (~65%), deployment panel on right (~35%), stack vertically on mobile
- Board perspective flip — player always deploys at bottom, coordinate system transforms for their color
- Fog-of-war — enemy pieces render as "?" during gameplay, revealed on combat or game over

**Should have (v1.1.x — polish):**
- Vertical piece palette with categories — group by rank tier in the right panel
- Revealed piece tracking — subtle rank indicator for pieces that won battles
- Row/column labels — coordinate markers for board communication

**Defer (v2+):**
- Animated piece movement — deferred per PROJECT.md, blocks milestone if attempted now
- Drag-and-drop deployment — click-to-select is proven (chess.com uses it), unnecessary complexity

### Architecture Approach

The current architecture centers on `page.tsx` (494 lines) as the layout orchestrator, with Board.tsx rendering the 9×8 grid, Piece.tsx handling individual piece display, and DeploymentZone.tsx providing zone overlays. Two Zustand stores manage state: `gameStore` (board, turns, moves) + `roomStore` (roomId, playerSide, scores). Socket.io broadcasts full board state to all clients.

The target architecture introduces a `DeploymentSidebar.tsx` component that encapsulates all sidebar content (PiecePalette + buttons during deploying, status during playing). The board is wrapped in a sized `relative` container to preserve overlay positioning. A `useBoardTransform` hook centralizes coordinate translation for the visual board flip. Server changes are zero — client handles all fog-of-war and perspective logic.

**Major components (modified):**
1. `page.tsx` — wrap board + sidebar in `flex-row` container, move controls into sidebar
2. `Piece.tsx` — add `isHidden` prop, render "?" for enemy pieces during playing phase
3. `Board.tsx` — conditional row rendering order for perspective flip, pass `isHidden` to Piece
4. `DeploymentZone.tsx` — adjust CSS for side-by-side container dimensions

**New components:**
1. `DeploymentSidebar.tsx` — conditional container for deployment controls or game status
2. `useBoardTransform` hook — `visualToLogical(row)` / `logicalToVisual(row)` for coordinate safety

**Unchanged:** BattleReveal.tsx, WinModal.tsx, gameStore.ts, roomStore.ts, all server files

### Critical Pitfalls

1. **Client-only fog-of-war leaks data** — Enemy piece type/rank is in the client's JS bundle and Zustand store, inspectable via DevTools. For v1.1 casual play this is acceptable. For competitive play, server must filter piece data before broadcasting (replace enemy pieces with `{ id, owner, revealed: false }`). **Prevention:** Acknowledge this is a known trade-off; plan server-side filtering for v2 if needed.

2. **Board flip breaks click coordinates** — If rows are rendered in reverse order but click handlers pass array indices directly, pieces move to wrong squares. **Prevention:** Use CSS `transform: rotate(180deg)` on the grid (Option A from PITFALLS.md) — this flips visual rendering without changing data coordinates. Alternatively, create a `useBoardTransform` hook with `visualToLogical()` mapping.

3. **Side-by-side layout misaligns overlays** — DeploymentZone, BattleReveal, WinModal, and bot thinking indicator all use `absolute inset-0` positioning. Changing the board container's dimensions can break overlay alignment. **Prevention:** Wrap board + all overlays in a single `relative` container with explicit width/height and `min-width`.

4. **Position swap breaks server validation** — Server-side `isInDeploymentZone()` hardcodes Red=rows 0-2, Blue=rows 5-7. If client swaps visual positions without coordinating with server, deployments get rejected. **Prevention:** This is a visual-only swap — server data stays the same, client flips rendering only.

5. **`piece:deployed` broadcasts enemy identity during deploy** — Server sends full piece object to all clients during deployment, leaking enemy piece types before gameplay starts. **Prevention:** Filter deployment broadcasts to send only position + owner, not piece type/rank.

## Implications for Roadmap

Based on research, the milestone should be structured in 3 phases with clear dependency ordering:

### Phase 1: Side-by-Side Layout + Board Perspective Flip

**Rationale:** These are the foundational UI changes — everything else (fog-of-war, palette redesign) depends on the new layout and correct coordinate mapping. Getting the layout and coordinate transform right first means subsequent phases only add rendering logic on top of a stable foundation.

**Delivers:** Board on left, deployment panel on right (responsive). Player always sees their deployment zone at the bottom. All overlays functional in new layout.

**Addresses:** Side-by-side layout (P1), Board perspective flip (P1), Deployment zone at bottom (P1)

**Avoids:** Pitfall 3 (overlay misalignment — wrap board+overlays in sized container), Pitfall 4 (battle animation direction — defer to Phase 2), Pitfall 6 (aspect ratio conflicts — set min-width on board container), Pitfall 10 (click coordinate mapping — use CSS transform or coordinate hook), Pitfall 12 (deployment zone overlay alignment)

**Sub-steps:**
1. Create `DeploymentSidebar.tsx` component (LOW risk)
2. Restructure `page.tsx` layout to `flex-row` with responsive breakpoint (MEDIUM risk)
3. Implement board perspective flip — visual-only swap, coordinate transform hook (MEDIUM risk)
4. Fix overlay positioning in new container dimensions (LOW risk)

### Phase 2: Fog-of-War (Hidden Enemy Pieces)

**Rationale:** Depends on Phase 1 being complete (layout must be stable, player perspective must be correct). The fog-of-war logic itself is low complexity — a conditional render in Piece.tsx — but requires the board flip to be working so that "which pieces are mine" is correct.

**Delivers:** Enemy pieces show "?" during gameplay, revealed on battle or game over. Own pieces always visible. BattleReveal continues to work with full piece data.

**Addresses:** Fog-of-war / enemy pieces hidden (P1), Revealed piece tracking (P2 — partial)

**Avoids:** Pitfall 1 (data leakage — accept client-side hiding for v1.1, document trade-off), Pitfall 8 (deployment broadcast leak — filter piece:deployed to hide type/rank), Pitfall 9 (move:result leak — hide attacker identity for non-battle moves)

**Sub-steps:**
1. Add `isHidden` prop to Piece.tsx, render "?" for enemy unrevealed pieces during `playing` phase (LOW risk)
2. Ensure BattleReveal still receives full piece data from move:result events (LOW risk)
3. Optionally filter `piece:deployed` and `move:result` broadcasts to reduce data leakage (MEDIUM risk)

### Phase 3: Polish (Piece Palette, Labels, Revealed Tracking)

**Rationale:** Core features are complete. This phase adds the "differentiator" features that make the game feel polished. Low risk since it builds on stable infrastructure.

**Delivers:** Vertical piece palette with rank categories in the sidebar. Row/column coordinate labels on the board. Subtle rank indicator for pieces that won battles.

**Addresses:** Vertical piece palette (P2), Row/column labels (P3), Revealed piece tracking (P2)

**Sub-steps:**
1. Restyle PiecePalette from horizontal scroll to vertical categorized list in sidebar (MEDIUM risk)
2. Add coordinate labels to Board.tsx grid (LOW risk)
3. Add revealed rank indicator to Piece.tsx (LOW risk)

### Phase Ordering Rationale

- **Layout first** because it's the visual foundation — fog-of-war and palette changes depend on knowing where the sidebar is and that overlays work
- **Board flip before fog-of-war** because "which pieces are mine" must be correct before "hide enemy pieces" makes sense
- **Fog-of-war before polish** because the core mechanic (hidden ranks) is the v1.1 headline feature — palette and labels are nice-to-haves
- **Server filtering deferred** because client-side hiding is sufficient for casual play — server changes touch 5+ emit points and can be added independently later

### Research Flags

**Skip research (standard patterns):**
- **Phase 1 layout restructuring:** Well-documented Tailwind flex-row responsive pattern, HIGH confidence
- **Phase 2 fog-of-war Piece.tsx change:** Simple conditional rendering, LOW complexity
- **Phase 3 coordinate labels:** Pure CSS addition, trivial

**May need deeper research:**
- **Phase 1 board flip coordinate transform:** The `useBoardTransform` hook pattern needs validation — verify CSS `transform: rotate(180deg)` doesn't break event coordinate mapping (e.g., `e.target.dataset.row`)
- **Phase 2 server broadcast filtering:** If we decide to filter `piece:deployed` and `move:result`, need to audit all emit points in gameHandler.ts and ensure BattleReveal still works

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All existing dependencies, Tailwind docs confirm patterns, zero new installs |
| Features | HIGH | Codebase analysis of all 8 components, salpakan.games reference confirms fog-of-war is core mechanic |
| Architecture | HIGH | Direct analysis of page.tsx, Board.tsx, Piece.tsx, gameStore.ts, roomStore.ts, gameHandler.ts |
| Pitfalls | HIGH | All pitfalls derived from actual code analysis with line references, WebSearch confirmed CSS issues |

**Overall confidence:** HIGH

### Gaps to Address

- **CSS `transform: rotate(180deg)` vs data flip:** PITFALLS.md recommends CSS transform to avoid coordinate bugs, but ARCHITECTURE.md recommends conditional row rendering. Need to validate which approach works better with the existing click handler that uses `data-row`/`data-col` attributes. **Handle during Phase 1 implementation — prototype both approaches.**
- **BattleReveal animation direction after board flip:** Pitfall 4 identifies that horizontal slide animations may feel wrong when player is at bottom. Need to decide: fix animation direction per battle, or accept horizontal slides as a stylistic choice. **Handle during Phase 1 — test with actual battle flow.**
- **Mobile sidebar behavior:** Research agrees on `flex-col` stacking below 768px, but PiecePalette must switch from vertical categorized list back to horizontal scroll on mobile. Need to implement responsive palette rendering. **Handle during Phase 3 — palette redesign.**

## Sources

### Primary (HIGH confidence)
- Existing codebase — `page.tsx`, `Board.tsx`, `Piece.tsx`, `PiecePalette.tsx`, `DeploymentZone.tsx`, `BattleReveal.tsx`, `gameStore.ts`, `roomStore.ts`, `gameHandler.ts`, `engine.ts` (direct analysis)
- Tailwind CSS docs — Responsive Design, Flexbox, Grid utilities (tailwindcss.com)
- PROJECT.md — v1.1 milestone requirements
- salpakan.games — game rules, fog-of-war as core mechanic

### Secondary (MEDIUM confidence)
- WebSearch: Tailwind responsive layout patterns (Feb 2026)
- WebSearch: Fog-of-war multiplayer game security (esoteriic.com, gamedeveloper.com)
- WebSearch: CSS grid board game responsive pitfalls (stackoverflow, dev.to)
- Chess UI patterns: lichess.org, chess.com — side-by-side layout standard

### Tertiary (LOW confidence)
- Next.js CSS ordering bug — GitHub #75137 (opened 2025-01-21, still open as of research date)

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
