---
status: resolved
trigger: "Clicking on adjacent enemy piece deselects own piece instead of attacking"
created: 2026-03-20T00:00:00Z
updated: 2026-03-20T00:00:00Z
---

## Resolution Summary
**Root Cause:** In `client/src/features/game/Board.tsx` `handlePieceClick` (line 37-40), clicking an opponent piece called `selectPiece(null)` which cleared `selectedPiece` BEFORE the page-level `handleCellClick` could check if it was a valid attack move.

**Flow that was broken:**
1. Player selects own piece → `selectedPiece` set, `validMoves` computed (includes adjacent enemy cells)
2. Player clicks enemy cell → Board's `handlePieceClick` fires
3. Board calls `selectPiece(null)` → clears `selectedPiece`
4. Board returns WITHOUT calling `handleCellClick`
5. Page handler never runs → attack never triggers

**Fix:** Changed line 39 from `selectPiece(null)` to `handleCellClick(row, col)`. Now clicking an enemy piece passes through to the page-level handler, which correctly checks `validMoves.includes(enemyCell)` and executes the attack.

## Files Modified
- `client/src/features/game/Board.tsx` — line 39: `selectPiece(null)` → `handleCellClick(row, col)`

## Verification
- TypeScript compiles clean (`npx tsc --noEmit`)
- Docker build timed out (Docker daemon issue), needs manual rebuild
