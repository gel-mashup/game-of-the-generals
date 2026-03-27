# T03: 07-side-by-side-layout-board-perspective-flip 03

**Slice:** S07 — **Milestone:** M001

## Description

Migrated from legacy planning format.

## Must-Haves

- [ ] "When playerSide is 'red', board grid rotates 180° so red deployment zone (rows 0-2) appears at bottom of screen"
- [ ] "When playerSide is 'blue', board displays normally (no rotation)"
- [ ] "Piece text/icons remain right-side-up after board flip (counter-rotation on cell content)"
- [ ] "Cell click coordinates still resolve to correct logical row/col (data-row/data-col unchanged by CSS transform)"
- [ ] "DeploymentZone gold highlight aligns with the visually-bottom 3 rows after flip"
- [ ] "BattleReveal overlay covers the entire board correctly after flip"
- [ ] "WinModal overlay covers the entire board correctly after flip"
- [ ] "Bot thinking overlay covers the entire board correctly after flip"

## Files

- `client/src/features/game/Board.tsx`
- `client/src/features/game/DeploymentZone.tsx`
