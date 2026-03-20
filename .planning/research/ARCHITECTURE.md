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
