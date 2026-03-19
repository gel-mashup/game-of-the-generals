---
status: resolved
trigger: "After creating and joining a room, bot pieces are placed on the board and the player starts placing their own pieces"
created: 2026-03-19T12:00:00Z
updated: 2026-03-19T12:30:00Z
---

## Resolution Summary
**Root Cause:** Server emitted `game:started` and `piece:deployed` events synchronously during room creation, BEFORE the client navigated to game page and set up listeners.

**Final Fix:** Added `sync-game-state` event mechanism:
- Server: New handler sends current game state to requesting client
- Client: Game page emits `sync-game-state` on mount

## Files Modified
- `server/src/socket/handlers/gameHandler.ts` - Added sync-game-state handler
- `client/src/app/game/[roomId]/page.tsx` - Added sync-game-state emit on mount

## Verification
Tested end-to-end flow:
1. Create bot room → bot auto-deploys
2. Client joins game page → requests sync
3. Server responds with state → game enters "deploying"
4. Player auto-deploys and clicks Ready → countdown → "playing"

Server logs confirm:
```
Synced game state to TxX4o4Ledl-AIyGkAAAE for room B8XyRJ
Player TxX4o4Ledl-AIyGkAAAE ready in room B8XyRJ. Ready count: 1
Room B8XyRJ countdown complete — game now in 'playing' phase
```
