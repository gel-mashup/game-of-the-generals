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

# Architecture Research: v1.1 UI Redesign

**Domain:** Side-by-side layout + fog-of-war for real-time board game
**Researched:** 2026-03-20
**Confidence:** HIGH

## System Overview (Current → Target)

### Current Layout (vertical stack)

```
┌──────────────────────────────┐
│         Header               │  ← roomId, scores, status, buttons
├──────────────────────────────┤
│                              │
│         Board (9x8)          │  ← max-w-3xl centered
│                              │
├──────────────────────────────┤
│      PiecePalette            │  ← horizontal strip below board
├──────────────────────────────┤
│   Auto-Deploy | Ready        │  ← buttons
└──────────────────────────────┘
```

### Target Layout (side-by-side)

```
┌──────────────────────────────────────────────────┐
│                    Header                         │
├────────────────────────────────┬─────────────────┤
│                                │                 │
│         Board (9x8)            │  Deployment     │
│                                │  Panel          │
│   (board left, ~60-70%)       │  (right, ~30-40%)
│                                │                 │
│                                │  [PiecePalette] │
│                                │  [Auto-Deploy]  │
│                                │  [Ready]        │
└────────────────────────────────┴─────────────────┘
```

## Current Component Structure

```
page.tsx (game layout orchestrator — 494 lines)
├── Header (inline)
├── Board.tsx (9x8 CSS Grid)
│   └── Piece.tsx (rank symbol + color)
├── DeploymentZone.tsx (absolute overlay)
├── PiecePalette.tsx (horizontal strip)
├── BattleReveal.tsx (overlay)
└── WinModal.tsx (overlay)
```

**State:** Two Zustand stores — `gameStore` (board, turns, moves) + `roomStore` (roomId, playerSide, scores)

**Data flow:** Server sends full board `(Piece | null)[][]` to ALL clients via Socket.io. Both players see every piece's `type` and `owner`. The `revealed` field exists on Piece but is only used for opacity styling — not for hiding rank identity.

## Analysis: What Needs to Change

### 1. Side-by-Side Layout

The core change is in `page.tsx` — converting from vertical stack (`flex-col`) to horizontal (`flex-row`). This is **purely a layout restructuring** that does not change data flow.

**Current DOM order:**
1. Header (full width)
2. Board + overlays (centered, max-w-3xl)
3. PiecePalette + buttons (below board)

**Target DOM order:**
1. Header (full width)
2. Side-by-side container: Board (left) + Sidebar (right)
   - Sidebar contains: PiecePalette + Auto-Deploy + Ready buttons
   - During `playing` phase: Sidebar can show turn indicator / status text

**Key constraint:** The deployment controls (PiecePalette, Auto-Deploy, Ready) must be *inside* the sidebar during `deploying`, but can collapse/repurpose during `playing`. This means the sidebar is a conditional container, not a fixed component.

### 2. Piece Visibility (Fog of War)

This is the architectural decision: **server-side filtering vs client-side hiding**.

**Current state:** Server broadcasts the full board with every piece's `type`, `owner`, `rank`, `revealed` to ALL clients. The client knows everything — it just applies a visual `opacity-60` to unrevealed pieces.

**For fog-of-war:** Enemy pieces should display "?" instead of their rank symbol during gameplay.

#### Option A: Server-Side Filtering

Server sends filtered board per-player:
- Own pieces: full data (type, rank, revealed)
- Enemy pieces: `{ owner: 'blue', type: '?', rank: -99, revealed: false, id: 'hidden' }`

**Pros:**
- Truly secure — client never sees enemy data
- Prevents cheating (client-side can't be reverse-engineered to show hidden data)
- Clean separation of concerns

**Cons:**
- Server must clone and filter board per-player before each emit (every event that sends `board`)
- Changes to `gameHandler.ts` — every `io.to(roomId).emit(...)` that includes `board` must become `socket.emit(...)` per player
- Bot AI already has access to full board on server (no change needed there)
- More complex — server needs to know which socket is which player

**Events that send board and would need per-player filtering:**
- `game:started` (line 137, 173)
- `piece:deployed` (line 252, 309)
- `deploy:complete` (line 389)
- `move:result` (line 97, 494)
- `game:over` (line 48, 86, 481)

#### Option B: Client-Side Hiding

Server continues sending full board. Client renders "?" for enemy pieces during `playing` phase.

**Pros:**
- Minimal server changes (zero changes to gameHandler)
- Only Piece.tsx and Board.tsx change
- Simpler to implement
- BattleReveal still works (attacker/defender sent separately with full data)

**Cons:**
- Enemy piece data is in the client's JS — technically inspectable
- Not truly "fog of war" — just visual hiding

#### Recommendation: Option B (Client-Side) for v1.1

**Rationale:**
- This is a casual game against a bot or friend — cheating is not a real concern
- The server architecture (io.to(roomId).emit) broadcasts to all — changing to per-socket emit would touch 5+ emission points
- BattleReveal already sends attacker/defender pieces separately — those contain the full data anyway (necessary for the reveal animation)
- Simpler implementation = faster milestone completion
- Server-side filtering can be added later if competitive play becomes a concern
- **Confidence: HIGH** — this is the right trade-off for the current project scope

## Integration Points

### Components to MODIFY

| Component | Change | Why |
|-----------|--------|-----|
| `page.tsx` | Wrap board + sidebar in `flex-row` container. Move PiecePalette + buttons into sidebar div. Conditional sidebar content per gameStatus. | Layout restructuring is the primary change |
| `Piece.tsx` | Add `isEnemy` prop or derive from `piece.owner !== playerSide`. When `gameStatus === 'playing'` AND enemy → render "?" instead of rank symbol. | Fog-of-war display logic |
| `Board.tsx` | Pass `playerSide` context to Piece (already available via `useRoomStore`). No structural change needed — Piece handles its own visibility. | Piece needs to know who is "enemy" |
| `DeploymentZone.tsx` | Adjust CSS positioning — zones must map to the side-by-side layout, not stretch full width. Currently `absolute inset-0` which works fine inside the board container. | Minimal — may just need width adjustment |

### Components UNCHANGED

| Component | Why Unchanged |
|-----------|---------------|
| `PiecePalette.tsx` | Already self-contained. Just moved into sidebar. Same props, same rendering. |
| `BattleReveal.tsx` | Overlay on board — independent of layout. Attacker/defender data comes from `move:result` event which always includes full piece data. |
| `WinModal.tsx` | Overlay on board — independent of layout. |
| `SocketProvider.tsx` | Socket layer doesn't change. |
| `gameStore.ts` | Board state, turn management, moves — all unchanged. |
| `roomStore.ts` | Room info, playerSide — all unchanged. |

### Server — No Changes Required

| File | Why No Change |
|------|---------------|
| `gameHandler.ts` | Client-side hiding means server keeps broadcasting full board. No filtering needed. |
| `engine.ts` | Game logic unchanged. |
| `botAI.ts` | Bot already runs server-side with full visibility. |
| `rooms.ts` | No change. |

## Data Flow Changes

### Current Flow (deploying)

```
User selects piece in PiecePalette (below board)
→ User clicks board cell
→ page.tsx handleCellClick → validates zone → deployPiece()
→ socket.emit('deploy-piece')
→ server validates → room.board[row][col] = piece
→ io.to(roomId).emit('piece:deployed', { board })
→ all clients receive full board
```

### Target Flow (deploying) — SAME DATA FLOW, different UI positions

```
User selects piece in PiecePalette (now in sidebar)
→ User clicks board cell (now on the left)
→ page.tsx handleCellClick → validates zone → deployPiece()
→ socket.emit('deploy-piece')
→ server validates → room.board[row][col] = piece
→ io.to(roomId).emit('piece:deployed', { board })
→ all clients receive full board
→ Piece.tsx: during deploying, show all pieces (both sides visible for deployment)
```

**No data flow change.** The pieces move in the DOM, not in the data.

### Current Flow (playing — piece visibility)

```
Server sends move:result with full board
→ Client receives board with all pieces visible
→ Piece.tsx renders rank symbol for ALL pieces
```

### Target Flow (playing — piece visibility)

```
Server sends move:result with full board (UNCHANGED)
→ Client receives board with all pieces visible (UNCHANGED)
→ Piece.tsx: if piece.owner !== playerSide AND gameStatus === 'playing'
  → render "?" instead of rank symbol
→ BattleReveal: still shows full data (attacker/defender from event payload)
→ On game over: all pieces revealed (server already sets revealed=true on all)
```

## Piece Visibility — Implementation Detail

### Piece.tsx Change

```typescript
// Current: always shows symbol
const symbol = PIECE_SYMBOLS[piece.type] ?? piece.type[0].toUpperCase();

// Target: conditionally hide enemy pieces
const isHidden = piece.owner !== playerSide
  && gameStatus === 'playing'
  && !piece.revealed;

const symbol = isHidden ? '?' : (PIECE_SYMBOLS[piece.type] ?? piece.type[0].toUpperCase());
```

Piece.tsx needs `playerSide` and `gameStatus`. Currently it receives `piece`, `position`, `onClick`, `isSelected`, `onInvalidClick`. Two options:

1. **Pass additional props** from Board.tsx (which already has both values via hooks)
2. **Use hooks directly** in Piece.tsx (`useRoomStore`, `useGameStore`)

**Recommendation: Option 1 (pass props)** — keeps Piece as a pure presentational component. Board already reads both stores.

```tsx
// Board.tsx render:
<Piece
  piece={piece}
  position={{ row: rowIndex, col: colIndex }}
  isSelected={isSelected}
  isHidden={gameStatus === 'playing' && piece.owner !== playerSide && !piece.revealed}
  onClick={...}
  onInvalidClick={...}
/>
```

### Visibility States by Game Phase

| Phase | Own Pieces | Enemy Pieces | Rationale |
|-------|-----------|-------------|-----------|
| `deploying` | Visible (rank shown) | Visible (rank shown) | Players need to see what they're deploying against during the simultaneous deploy phase |
| `playing` | Visible (rank shown) | Hidden ("?") | Core fog-of-war |
| `finished` | Visible (rank shown) | Visible (rank shown) | Game over — server already sets `revealed=true` on all pieces |

**Note on deploying visibility:** During deployment, both players' pieces are in their respective zones (rows 0-2 vs 5-7). Showing enemy pieces during deployment is actually useful — you can see placement happening in real-time. The fog-of-war only kicks in when gameplay starts.

## Build Order

### Step 1: Extract Sidebar Component (LOW risk)

Create `DeploymentSidebar.tsx` — a container that conditionally renders PiecePalette + buttons (during deploying) or status text (during playing).

- New file: `client/src/features/game/DeploymentSidebar.tsx`
- Extracts deployment controls from page.tsx into a reusable component
- Props: `gameStatus`, `deployedCounts`, `selectedPieceType`, `onSelectPiece`, `playerSide`, `onAutoDeploy`, `onReady`, `allPiecesDeployed`, `playerReady`

### Step 2: Restructure page.tsx Layout (MEDIUM risk)

Convert the vertical layout to side-by-side in page.tsx.

- Change outer `flex-col` to `flex-col` (header) + `flex-row` (content area)
- Board stays on the left (flex-grow)
- DeploymentSidebar goes on the right (fixed width ~280px)
- During `playing`: sidebar shows turn indicator / instructions instead of deployment controls
- Keep overlays (BattleReveal, WinModal, botThinking) unchanged — they're positioned relative to the board container

### Step 3: Swap Player/Bot Positions (LOW risk)

Change deployment zone mapping so player is always at bottom (rows 5-7).

- In `page.tsx`: `handleCellClick` zone validation — currently checks `isInRedZone = row >= 0 && row <= 2` and maps to playerSide
- Need to flip: player always deploys rows 5-7, bot/opponent always rows 0-2
- In `DeploymentZone.tsx`: currently receives `side` prop — may need to change to always show player zone at bottom
- In server `engine.ts`: `isInDeploymentZone` — Red is rows 0-2, Blue is rows 5-7. The visual swap is a **client-side concern only**. Server still tracks Red=top, Blue=bottom. Client just renders the board flipped for the player.

**Key decision:** Do we flip the board visually (rotate 180° so player's pieces are at the bottom) or change the server's zone assignment?

- **Visual flip (recommended):** Server keeps Red=top, Blue=bottom. When player is Blue, client renders rows in reverse order. Player always sees their zone at bottom.
- **Server change:** Would require changing game logic — more invasive.

**Recommendation: Visual flip.** The board rendering in Board.tsx can iterate rows in reverse when `playerSide === 'red'` (so red's zone is at bottom). Actually — wait. Currently Red is at rows 0-2 (top). For the player to always be at bottom, if the player is Red, we flip the board so rows 0-2 appear at the bottom of the screen.

```tsx
// Board.tsx — conditional row order
const rows = playerSide === 'red'
  ? Array.from({ length: ROWS }, (_, i) => ROWS - 1 - i)  // [7,6,5,4,3,2,1,0]
  : Array.from({ length: ROWS }, (_, i) => i);              // [0,1,2,3,4,5,6,7]
```

**But:** This changes `data-row` attributes and click coordinates. Must ensure `handleCellClick` maps visual row back to logical row. Need a `visualToLogical` mapping.

### Step 4: Add Fog-of-War to Piece.tsx (LOW risk)

- Add `isHidden` prop to Piece.tsx
- Board.tsx computes `isHidden` based on `gameStatus`, `piece.owner`, `playerSide`, `piece.revealed`
- Piece.tsx renders "?" when hidden
- BattleReveal continues to work (receives full piece data from move:result event)

### Step 5: Adjust BattleReveal for Flipped Board (LOW risk)

- If board is visually flipped, BattleReveal's positioning needs to account for the row mapping
- Currently uses `attackerPosition`/`defenderPosition` with absolute positioning
- Need to translate logical positions to visual positions when board is flipped

## Critical Considerations

### 1. Click Coordinate Mapping

When board is visually flipped (Red player sees rows reversed), every click must map visual row → logical row before sending to server. This is the **highest-risk change** because getting it wrong means pieces move to wrong squares.

**Mitigation:** Create a `useBoardTransform` hook that provides `visualToLogical(row)` and `logicalToVisual(row)` functions. Use consistently in Board.tsx and page.tsx.

### 2. Valid Move Highlighting

`validMoves` in gameStore are in logical coordinates. When board is flipped, highlighting must use visual coordinates.

**Same mitigation:** Transform validMoves before passing to Board for rendering.

### 3. BattleReveal Positioning

BattleReveal uses `attackerPosition`/`defenderPosition` (logical) to position overlay elements. With a flipped board, these need visual translation.

**Same mitigation:** Pass visual positions to BattleReveal, or have BattleReveal use the transform hook.

### 4. PiecePalette During Deploying

Currently PiecePalette is a horizontal strip. In the sidebar (narrower), it should become vertical or grid-based to fit the narrower width.

**Recommendation:** Change PiecePalette to render in a 2-column grid when in sidebar mode, or make it responsive based on container width.

### 5. Mobile Considerations

Side-by-side on small screens won't work. Need responsive breakpoint:

- **Desktop (>768px):** Side-by-side
- **Mobile (≤768px):** Vertical stack (current layout)

**Implementation:** Tailwind responsive classes — `flex-col md:flex-row`.

## Anti-Patterns

### Anti-Pattern 1: Server-Side Fog-of-War Without Full Audit

**What people do:** Add piece filtering to a few emit calls but miss some.
**Why it's wrong:** Leaks data through unfiltered events.
**Do this instead:** Either filter ALL board emissions or use client-side hiding. Partial server filtering is worse than none — gives false security.

### Anti-Pattern 2: Coordinate System Confusion

**What people do:** Mix visual and logical coordinates in different parts of the codebase.
**Why it's wrong:** Pieces move to wrong squares, clicks target wrong cells.
**Do this instead:** Single source of truth — all game logic uses logical coordinates. Visual transform only in rendering layer.

### Anti-Pattern 3: Conditional CSS in Multiple Places

**What people do:** Hide/show sidebar content with scattered conditional rendering.
**Why it's wrong:** Layout breaks when phases change, hard to maintain.
**Do this instead:** One `DeploymentSidebar` component owns all conditional content. Page.tsx just places it.

## Sources

- Existing codebase: `/client/src/` and `/server/src/` (direct analysis)
- PROJECT.md: Milestone v1.1 requirements
- PROJECT_SPECS.md: Game rules, component structure, socket events

---
*Architecture research for: v1.1 UI Redesign — Game of the Generals*
*Researched: 2026-03-20*

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

# Domain Pitfalls

**Domain:** Game of the Generals — UI Redesign (v1.1)
**Researched:** 2026-03-20

## Critical Pitfalls

### Pitfall 1: Client-Only Fog-of-War (Data Leakage)

**What goes wrong:** Rendering "?" for enemy pieces on the client while the server still sends full piece data (type, rank, owner) in every Socket.io event. Anyone with browser DevTools → Network tab or `socket.on` interception sees all enemy piece identities instantly.

**Why it happens:** The current server broadcasts the full `room.board` — an array of `Piece | null` with `type`, `rank`, `owner`, `revealed` — to ALL clients in these events:
- `game:started` (line 137-141 in gameHandler.ts)
- `piece:deployed` (line 252-258 — broadcasts the `piece` object + full `board`)
- `deploy:complete` (line 389-390)
- `move:result` (line 494-503 — sends `attacker`, `defender`, AND full `board`)
- `game:over` (line 481-486)
- `sync-game-state` (line 137-141)

The client `gameStore.ts` holds `board: (Piece | null)[][]` with full Piece objects. Even if Piece.tsx renders "?" for enemy pieces, the data is already in the Zustand store, accessible via React DevTools or `__zustand__` inspection.

**Consequences:** Fog-of-war provides zero actual information hiding. Multiplayer fairness is broken. Players who inspect data gain a massive strategic advantage.

**Prevention:** Server must filter piece data before broadcasting. Two approaches:
1. **Server-side filtering (recommended):** Replace enemy pieces with `{ id, owner, revealed: false }` (stripped of `type` and `rank`) in broadcasts to each client. Only include full piece data for the player's own pieces and revealed pieces.
2. **Separate emit per player:** Use `socket.emit()` instead of `io.to(roomId).emit()` — send each player a personalized board state.

**Detection:** Open Chrome DevTools → Network → WS → inspect Socket.io frames during gameplay. If enemy piece `type` or `rank` appears, fog-of-war is broken.

**Phase:** Phase 1 (Layout) — MUST be addressed before fog-of-war UI work.

---

### Pitfall 2: Position Swap Breaks Deployment Validation

**What goes wrong:** After swapping so the player deploys at the bottom (rows 5-7) and the bot at the top (rows 0-2), the server-side `isValidDeployment()` in `engine.ts` (line 17-73) still validates against hardcoded row ranges: Red = rows 0-2, Blue = rows 5-7. If the client-side `handleCellClick` in `page.tsx` (line 66-69) also changes its validation to match the visual swap, but the server doesn't, deployments get rejected.

**Why it happens:** The deployment zone logic is duplicated:
- **Server:** `isInDeploymentZone()` in engine.ts (line 7-12) — `red: row 0-2`, `blue: row 5-7`
- **Client:** `handleCellClick` in page.tsx (line 66-69) — same row ranges
- **Visual:** DeploymentZone.tsx uses `side` prop to determine top vs bottom overlay

If you only change the visual (which zone overlay appears where) without aligning both validation layers, pieces deploy to the wrong rows or get rejected.

**Consequences:** Players can't deploy pieces, or pieces appear in wrong zones. Game becomes unplayable.

**Prevention:** 
- Decide: Is this a visual-only swap (player *sees* themselves at bottom) or a data swap (player's pieces *are* at rows 5-7)?
- For visual-only: Keep server data the same, flip the rendering in Board.tsx (render rows 7→0 instead of 0→7).
- For data swap: Update `isInDeploymentZone()` on server AND client simultaneously.

**Detection:** Deploy a piece → check if server accepts it → check if it appears at the correct visual position.

**Phase:** Phase 1 (Layout) — position mapping must be decided before layout work.

---

### Pitfall 3: Side-by-Side Layout Breaks Overlay Positioning

**What goes wrong:** The current layout uses `flex-col` with everything stacked vertically in a `max-w-3xl` container. Four components rely on `absolute` positioning relative to the board container:

1. **DeploymentZone.tsx** — `absolute inset-0` overlay with `h-3/8` zone highlights
2. **BattleReveal.tsx** — `absolute inset-0 flex items-center justify-center` with `z-50`
3. **WinModal.tsx** — positioned as sibling within `absolute inset-0` div
4. **Bot thinking indicator** — `absolute inset-0` with `z-40`

When moving to a side-by-side layout (board left, panel right), the board container's dimensions change. The `aspect-[9/8]` on the grid (Board.tsx line 53) may become too narrow if the right panel takes significant width. The overlays use `inset-0` which fills the parent — if the parent resizes unexpectedly, overlays misalign.

**Why it happens:** All overlay positioning assumes the board is the primary content block with full `max-w-3xl` width. Changing the parent to a `grid-cols-[1fr_auto]` or `flex-row` changes the containing block dimensions.

**Consequences:** Overlays appear misaligned, too small, or clipped. Battle reveal animations break. Deployment zone highlight doesn't match board cells.

**Prevention:**
- Wrap the board + all overlays in a single `relative` container with explicit width/height
- Use `min-width` on the board container to prevent it from shrinking too much
- Test overlays at the new board dimensions before changing anything else
- The `aspect-[9/8]` grid should scale proportionally — ensure the parent constrains it properly

**Detection:** Visually check every overlay (deployment zone, battle reveal, win modal, bot thinking) after layout change.

**Phase:** Phase 1 (Layout) — fix container structure before adding side-by-side.

---

### Pitfall 4: Swapped Positions Confuse Battle Orientation

**What goes wrong:** After swapping player/bot positions, the BattleReveal component shows attacker sliding in from the left and defender from the right. If the player is now at the bottom and the bot at the top, the "attacker slides left" animation no longer matches the spatial intuition of "my piece moved upward to attack." Users perceive the battle animation as backwards.

**Why it happens:** BattleReveal.tsx uses fixed `translate-x-6` / `-translate-x-6` for slide direction (lines 90, 106). These don't account for which side the attacker is on — they always slide horizontally regardless of the board's visual orientation.

**Consequences:** Confusing UX during battles. Players can't immediately tell which piece is theirs during the reveal animation.

**Prevention:** Make BattleReveal animation direction dynamic based on attacker/defender board positions. If attacker is at bottom and defender at top, animate vertically (or adjust horizontal direction based on relative position).

**Detection:** Play a battle after position swap → verify the animation makes spatial sense.

**Phase:** Phase 2 (Fog-of-War) — battle reveal changes happen here.

---

## Moderate Pitfalls

### Pitfall 5: Next.js CSS Ordering Issues with Shared Components

**What goes wrong:** Next.js 14 can produce inconsistent CSS ordering when the same component (e.g., Board, Piece) is used across different page types (client component, server component, dynamically imported). This is a known issue (GitHub #75137). When restructuring the game page layout from vertical to horizontal, import order changes may cause Tailwind utility classes to apply in unexpected order, breaking visual styling.

**Prevention:**
- Avoid sharing styled components between different rendering contexts
- Use Tailwind's `@apply` sparingly — prefer inline utilities
- After layout changes, do a visual regression pass on all game states (deploying, playing, finished)

**Phase:** Phase 1 (Layout) — check after restructuring imports.

---

### Pitfall 6: CSS Grid Aspect Ratio Breaks in Narrow Columns

**What goes wrong:** The board uses `aspect-[9/8]` with `grid-cols-9 grid-rows-8` (Board.tsx line 53). In a side-by-side layout, if the board column gets too narrow (e.g., on smaller viewports or with a wide right panel), the cells become tiny. The `aspect-square` on each cell (line 68) may conflict with the parent's `aspect-[9/8]` — two competing aspect ratio constraints cause layout thrashing.

**Why it happens:** CSS `aspect-ratio` on both parent and child can conflict. The grid wants to be 9:8, each cell wants to be 1:1, and the grid columns are `repeat(9, 1fr)` which distributes width equally. On narrow screens, the height derived from 9:8 may not give enough room for square cells in 8 rows.

**Prevention:**
- Remove `aspect-square` from cells — let the grid's `aspect-[9/8]` control proportions naturally
- Add `min-width` to the board container (e.g., `min-w-[360px]` for 9×40px minimum)
- Use `@media` queries or container queries for responsive behavior

**Phase:** Phase 1 (Layout) — test at multiple viewport widths.

---

### Pitfall 7: `h-3/8` Custom Tailwind Value May Not Exist

**What goes wrong:** DeploymentZone.tsx uses `h-3/8` (line 21) which is not a standard Tailwind class. If this relies on a custom `tailwind.config.js` extension and the config doesn't define it, the class silently fails and the deployment zone overlay has no height.

**Prevention:** Check `tailwind.config.js` for custom height values. If `h-3/8` isn't defined, add it or replace with standard values like `h-[37.5%]`.

**Phase:** Phase 1 (Layout) — verify before touching DeploymentZone.

---

### Pitfall 8: `piece:deployed` Broadcasts Enemy Piece Identity During Deployment

**What goes wrong:** In `gameHandler.ts` line 252-258, when a player deploys a piece, the server broadcasts `piece` (full object with `type`, `rank`, `owner`) AND the full `board` to ALL clients via `io.to(roomId).emit()`. During the deployment phase, the opponent can see exactly which piece type was placed and where — completely defeating fog-of-war before the game even starts.

**Why it happens:** The deployment broadcast was designed for a game with visible pieces. No information filtering was needed.

**Consequences:** Even if fog-of-war is properly implemented for the playing phase, the deployment phase leaks all piece identities. Players know exactly what every enemy piece is from the start.

**Prevention:** During deployment phase, broadcast only position updates (row, col, owner) without piece type/rank. Or send filtered board state where enemy pieces show as generic "deployed" markers.

**Phase:** Phase 2 (Fog-of-War) — must fix server broadcasts.

---

### Pitfall 9: `move:result` Sends Full Attacker + Defender to All Clients

**What goes wrong:** In `gameHandler.ts` line 494-503, the `move:result` event includes:
- `attacker` — full Piece object
- `defender` — full Piece object (or null if moving to empty square)
- `board` — full board with all piece data

For non-battle moves (moving to an empty square), the `attacker` piece identity is broadcast to the opponent, revealing which specific piece moved (e.g., "that was the 5-star general"). For battle moves, both pieces are revealed (which is correct for the BattleReveal animation), but the full board also leaks all other unrevealed pieces.

**Prevention:**
- For non-battle moves: Don't send the `attacker` piece details. Send only `from`, `to`, and a filtered board.
- For battle moves: Revealing attacker + defender is correct (they fought, so both are known). But filter the `board` to hide non-involved enemy pieces.

**Phase:** Phase 2 (Fog-of-War) — server broadcast filtering.

---

### Pitfall 10: Board Visual Flip Breaks Click Coordinate Mapping

**What goes wrong:** If the board is visually flipped (rows rendered bottom-to-top instead of top-to-bottom) so the player sees themselves at the bottom, the click handler in Board.tsx still uses `data-row` and `data-col` attributes matching the internal array indices. If visual row 0 (bottom) maps to array index 7, clicks go to the wrong cells.

**Why it happens:** The `onClick={() => handlePieceClick(rowIndex, colIndex)}` in Board.tsx (line 66) passes the array index directly. If you change rendering order without changing click mapping, visual position ≠ data position.

**Consequences:** Clicking a piece at the bottom of the screen selects the piece at the top of the data array. Moves go to wrong destinations.

**Prevention:** 
- Option A (recommended): Don't flip the array — flip only the CSS rendering with `transform: rotate(180deg)` on the grid and counter-rotate each cell. Coordinates stay aligned.
- Option B: If reversing row rendering, compute `actualRow = 7 - rowIndex` in the click handler.

**Detection:** Deploy a piece → click it → verify the correct cell highlights → make a move → verify it goes to the expected visual position.

**Phase:** Phase 1 (Layout) — coordinate mapping must be correct from the start.

---

## Minor Pitfalls

### Pitfall 11: Zustand Store Contains Full Board Data for Client Inspection

**What goes wrong:** Even with proper server-side filtering, if the filtered board data is stored in Zustand's `gameStore`, React DevTools and Zustand DevTools expose the store contents. This is a lower-severity version of Pitfall 1 — the attack surface shifts from network inspection to runtime inspection.

**Prevention:** Store only what the client needs. Don't store `type`/`rank` for enemy unrevealed pieces at all — not even as null. Use a separate type like `{ id, owner, revealed: false }` for hidden pieces.

**Phase:** Phase 2 (Fog-of-War) — data model refinement.

---

### Pitfall 12: Deployment Zone Overlay Misalignment After Position Swap

**What goes wrong:** The DeploymentZone.tsx component positions its overlay using `h-3/8` (37.5% of board height) which corresponds to 3 rows out of 8. After swapping player positions, if the overlay still uses the same percentage but for different rows, the visual highlight may not align with the actual clickable deployment cells.

**Prevention:** Ensure the overlay height and position exactly match 3/8 of the board grid. Test by clicking at the overlay edges — deployment should work at the boundary and fail just outside it.

**Phase:** Phase 1 (Layout) — verify overlay alignment.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Side-by-side layout | Overlays misalign, board too narrow | Wrap board+overlays in sized container, set min-width |
| Position swap | Server validation mismatch, click coordinate errors | Decide visual vs data flip, update both client+server |
| Fog-of-war UI | Client-only hiding is trivially bypassed | Server must filter piece data before broadcast |
| Fog-of-war server | Deployment phase leaks piece identities | Filter `piece:deployed` broadcasts |
| Battle reveal | Animation direction wrong after position swap | Make animation direction dynamic |
| Board flip | Click coordinates don't match visual position | Use CSS transform or coordinate remapping |

## Sources

- Codebase analysis: `gameHandler.ts`, `engine.ts`, `Board.tsx`, `Piece.tsx`, `gameStore.ts` (2026-03-20)
- WebSearch: "fog of war multiplayer game security data leakage" — confirmed client-only hiding is a well-known anti-pattern (esoteriic.com, gamedeveloper.com)
- WebSearch: "CSS grid board game responsive pitfalls" — aspect ratio conflicts confirmed (stackoverflow, dev.to)
- WebSearch: "Next.js CSS ordering issues" — known bug GitHub #75137 (opened 2025-01-21, still open)
- WebSearch: "CSS stacking context z-index" — Smashing Magazine 2026-01-27, confirmed `transform` creates new stacking context

---

*Generated: 2026-03-20*

# Game Flow Fix Research

## What's Broken

### Root Cause
The client misses all `piece:deployed` events for bot pieces because they fire **before** the game page mounts and establishes socket listeners.

### Event Timeline (Bot Game)

```
1. Lobby: user clicks "Create Room"
2. Lobby: socket.emit('create-room', { isBotMode: true })
   
3. Server (roomHandler.ts lines 59-101):
   a. Adds bot player to room
   b. generateAutoDeploy('blue') - generates 21 piece positions
   c. Loops: io.to(roomId).emit('piece:deployed', ...) x21
   d. io.to(roomId).emit('game:started', { board, status: 'deploying' })
   
4. Lobby: receives 'room:created' event
5. Lobby: setCreatedRoomId(roomId)
6. Lobby: useEffect triggers router.push('/game/{roomId}')
7. Game Page: mounts, sets up socket listeners
   
   *** BOT PIECES WERE EMITTED AT STEP 3 - CLIENT MISSED THEM ***
   
8. Game Page: board is empty (never received piece:deployed events)
9. gameStatus remains 'waiting' (never received game:started)
```

### Additional Issues Found

1. **Missing `game:started` listener** (game page line 114-265)
   - The `game:started` event contains the complete board state
   - But the client doesn't listen for it
   - Even if received, the board wouldn't be set

2. **Event name mismatch** (secondary issue)
   - Server emits: `auto-deploy`
   - Client listens: `bot:auto-deploy`
   - This prevents manual auto-deploy trigger

## What Needs to Be Fixed

### Primary Fix: Add `game:started` listener

**File:** `client/src/app/game/[roomId]/page.tsx`

**Location:** Inside the socket useEffect (around line 175)

**Change:** Add handler for `game:started` event that:
1. Sets the board from event payload
2. Sets gameStatus to 'deploying'
3. Sets currentTurn to 'red'

```typescript
const handleGameStarted = (data: { 
  board: (Piece | null)[][]; 
  currentTurn: 'red' | 'blue';
  status: 'deploying';
}) => {
  setBoard(data.board);
  setGameStatus('deploying');
  setTurn(data.currentTurn);
};

socket.on('game:started', handleGameStarted);
```

And add to cleanup:
```typescript
socket.off('game:started', handleGameStarted);
```

### Secondary Fix: Event name mismatch (optional)

**File:** `client/src/app/game/[roomId]/page.tsx`

**Change:** Either:
- Option A: Change server to emit `bot:auto-deploy` instead of `auto-deploy`
- Option B: Add additional listener for `auto-deploy`

Option A is cleaner (consistent naming).

## Recommended Approach

### Phase 1: Primary Fix (Critical)
1. Add `game:started` listener to game page
2. Test bot game flow - verify bot pieces appear on board
3. Test human vs human - verify both players see board after game starts

### Phase 2: Secondary Fix (Optional)
4. Fix event name mismatch for consistency

### Verification Steps
1. **Start the application:**
   ```bash
   cd server && npm run dev  # or npm start
   cd client && npm run dev
   ```

2. **Test bot game flow:**
   - Go to lobby with `?mode=bot`
   - Enter name, click "Create Room"
   - Verify page navigates to `/game/{roomId}`
   - **Expected:** Bot pieces should appear in blue zone (rows 5-7)
   - **Expected:** Game status should show "deploying"
   - **Expected:** Player should see deployment controls (piece palette, auto-deploy button)

3. **Test auto-deploy:**
   - Click "Auto-Deploy" button
   - **Expected:** Player's 21 pieces appear in red zone (rows 0-2)
   - **Expected:** Ready button becomes enabled

4. **Test human vs human flow:**
   - Open two browser tabs
   - Tab 1: Create room (online mode)
   - Tab 2: Join room with code
   - **Expected:** Both clients navigate to game page
   - **Expected:** Both see empty board with "deploying" status
   - Each player deploys and clicks Ready
   - **Expected:** Countdown, then game starts

## Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `client/src/app/game/[roomId]/page.tsx` | Add `game:started` listener | Critical |
| `client/src/app/game/[roomId]/page.tsx` | Fix event name mismatch | Optional |

## Related Files (for reference)

| File | Purpose |
|------|---------|
| `server/src/socket/handlers/roomHandler.ts` | Room creation, bot auto-deploy, game:started emission |
| `server/src/socket/handlers/gameHandler.ts` | Game logic, deploy-piece, make-move handlers |
| `client/src/store/gameStore.ts` | Game state (board, status, turn) |
| `client/src/app/lobby/page.tsx` | Room creation UI and navigation |