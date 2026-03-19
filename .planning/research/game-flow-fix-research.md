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
