# Multiplayer Lobby - TODO

## What's Done
- Public room list on landing page (2-column grid)
- Quick join by clicking room cards
- "+ Add Bot" button for host while waiting
- "Start Game" button when room is full
- Server socket events: get-rooms, join-room-by-id, add-bot, start-game
- Auto-create room when creating from landing page

## Issue Being Fixed
When host clicks "+ Add Bot", the client should navigate to game page after bot is added. Currently navigating doesn't work because:
- `createdRoomId` state is null (set only on `room:created` event)
- Need to use URL param as fallback

## Fix Applied and Tested ✅
In `client/src/app/lobby/page.tsx`, modified `handleGameStarted` to use URL param fallback:

```typescript
const roomId = createdRoomId || searchParams.get('room');
if (roomId) {
  router.push(`/game/${roomId}`);
}
```

## Test Results (Mar 28, 2026)
- ✅ Rebuild succeeded
- ✅ "+ Add Bot" now navigates to /game/{roomId}
- ✅ Room appears in public list
- ✅ Click Join navigates to game
- ✅ Room removed from list when game starts

## Next Steps
- None - issue is fixed and all flows verified

## Files Changed
- server/src/socket/handlers/roomHandler.ts - add-bot now accepts roomId param
- client/src/app/lobby/page.tsx - Add Bot button, handleAddBot, handleGameStarted
- client/src/app/page.tsx - room list UI
- client/src/store/roomStore.ts - rooms state
- client/src/types/index.ts - PublicRoom type
- server/src/types/index.ts - PublicRoom type  
- server/src/socket/rooms.ts - publicRooms map
