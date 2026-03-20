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
