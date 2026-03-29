# Game of the Generals - TODO

## Branch: fixes (pushed to origin/fixes)

## What's Done

### 1. Room List - Public Rooms Fixed
- **File:** `server/src/socket/handlers/roomHandler.ts`
- **Fix:** Added `removeFromPublicRooms(roomId)` in create-room handler when bot game starts directly
- **Result:** Rooms are now removed from public list when game starts (both PVP and PVB)

### 2. Host Navigation - Game Page Direct
- **File:** `client/src/app/page.tsx`
- **Fix:** Host now navigates directly to `/game/{roomId}?name=...` instead of `/lobby?mode=online&name=...&room=...`
- **Result:** Host goes straight to game page after creating room

### 3. Socket Event Handling
- **Files:** 
  - `client/src/app/page.tsx`
  - `server/src/socket/handlers/roomHandler.ts`
- **Fixes:**
  - Changed from `socket.once` to `socket.on` with proper cleanup for event handlers
  - Added null checks for socket before calling methods
  - Added debug logging for tracing socket events
  - Added socket.connected check before emitting

### 4. Server-Side Room Handling
- **File:** `server/src/socket/handlers/roomHandler.ts`
- **Fixes:**
  - Added check for existing player in room before adding new player (allows rejoining)
  - Server now includes `isHost` in `room:joined` response
  - Added debug logging for `join-room-by-id` handler

## Known Issues Remaining

### Issue 1: Join Button Not Properly Triggering
**Symptom:** When clicking "Join" on a room card from the landing page:
- Client console shows `[DEBUG] Emitting join-room-by-id for: ROOMCODE`
- Server logs do NOT show `[SERVER] join-room-by-id received: ...`
- But player STILL gets to game page via `sync-game-state` fallback

**Root Cause:** The socket event is being emitted but not reaching the server properly. Likely a timing issue with socket.io event listeners.

**Files to debug:**
- `client/src/app/page.tsx` - handleJoinRoom, performJoinRoom functions
- `server/src/socket/handlers/roomHandler.ts` - join-room-by-id handler

**Next steps:**
1. Add more debug logging to trace the socket emit path
2. Check if event listeners are being properly registered before emit
3. Consider using a different event name or approach

### Issue 2: Auto-Deploy Not Working
**Symptom:** After game starts, clicking "Auto-Deploy" button doesn't deploy pieces, and "Ready" button never enables.

**Root Cause:** The game isn't receiving the `piece:deployed` event properly from server.

**Files to debug:**
- `server/src/socket/handlers/gameHandler.ts` - auto-deploy handler
- `client/src/app/game/[roomId]/page.tsx` - piece deployment handling

**Server auto-deploy flow:**
1. Server receives `auto-deploy` event
2. Generates random positions
3. Emits `piece:deployed` for each piece
4. When all 21 pieces deployed, emits `auto-deploy-complete` and enables Ready

**Debug:**
1. Check server logs for auto-deploy handling
2. Add client-side logging for `piece:deployed` events
3. Verify board state is being updated

### Issue 3: Full Gameplay Testing Needed
**What to test:**
1. Both players deploy pieces (Auto-Deploy or manual)
2. Both players click Ready
3. Game starts - red plays first
4. Make moves until flag is captured
5. Verify win condition works

## Files Changed

### Server
- `server/src/socket/handlers/roomHandler.ts` - Room creation, joining, public rooms
- `server/src/socket/handlers/gameHandler.ts` - Game state handling (not changed in this session)

### Client
- `client/src/app/page.tsx` - Landing page, create/join room handling
- `client/src/app/lobby/page.tsx` - Lobby page (changes from earlier session)
- `client/src/app/game/[roomId]/page.tsx` - Game page (not changed in this session)

## Testing Commands

```bash
# Build and start
docker compose build client && docker compose up -d

# Run tests
cd server && npm test

# View logs
docker compose logs -f server
```

## Commits on fixes Branch (newest first)
- 83d2d15 - fix: debug socket event handling for room join flow
- 34ffcc0 - fix: improve client-side socket event handling for room creation/joining
- ad65002 - fix: multiple lobby and game flow issues
- e0ec9b1 - fix: lobby should use room ID from URL instead of creating new room
- d95f8db - fix: remove room from public list when bot game starts
- 8cd4717 - fix: Add Bot navigation to game page works now
