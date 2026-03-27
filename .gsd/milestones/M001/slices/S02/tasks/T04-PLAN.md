# T04: 02-game-core 04

**Slice:** S02 — **Milestone:** M001

## Description

Fix the missing `deploy-piece` socket emission in the game page. After calling `deployPiece()` locally for optimistic UI update, emit `socket.emit('deploy-piece', { pieceId, row, col })` to sync with server. This resolves DEP-01 and DEP-04 being blocked.

## Must-Haves

- [ ] "Manual piece deployment syncs to server via socket event"
- [ ] "Second player joining sees manually deployed pieces on board"
- [ ] "Ready button enables after 21 pieces placed manually"

## Files

- `client/src/app/game/[roomId]/page.tsx`
