# T02: 01-foundation 02

**Slice:** S01 — **Milestone:** M001

## Description

Implement the complete game board UI: 9x8 CSS Grid, piece rendering with rank display, piece palette for deployment, and deployment zone visualization. Complete lobby functionality with leave room. Human verification of visual components.

Purpose: Delivers the complete Phase 1 UI with board rendering, piece display, and deployment zones per GS-01 through GS-04.
Output: Playable lobby flow (create/join/leave) and visible game board with pieces and deployment zones.

## Must-Haves

- [ ] "Board renders as 9x8 grid with alternating green squares"
- [ ] "Each player has 21 pieces visible in PiecePalette"
- [ ] "Red deployment zone (rows 0-2) visually distinct with subtle red tint"
- [ ] "Blue deployment zone (rows 5-7) visually distinct with subtle blue tint"
- [ ] "Player can leave room and return to lobby"
- [ ] "Room code displayed on game page"

## Files

- `client/src/features/game/Board.tsx`
- `client/src/features/game/Piece.tsx`
- `client/src/features/game/PiecePalette.tsx`
- `client/src/features/game/DeploymentZone.tsx`
- `client/src/app/game/[roomId]/page.tsx`
- `client/src/app/lobby/page.tsx`
- `server/src/socket/handlers/roomHandler.ts`
