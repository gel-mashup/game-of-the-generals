# Game Issues Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two remaining issues: (1) Join button socket event not reaching server, (2) Auto-deploy not working. Then perform full gameplay testing.

**Architecture:** Debug socket event flow and auto-deploy event chain. The join issue is likely a race condition between socket connect and event emit. The auto-deploy issue is likely missing event listener or improper cleanup.

**Tech Stack:** Socket.io, Next.js, TypeScript

---

### Task 1: Fix Join Button Socket Event Issue

**Files:**
- Modify: `client/src/app/page.tsx:37-83` - handleJoinRoom and performJoinRoom
- Modify: `server/src/socket/handlers/roomHandler.ts:190-259` - join-room-by-id handler

- [ ] **Step 1: Add debug logging to client emit path**

In `client/src/app/page.tsx`, add logging before and after socket.emit to trace the exact flow:

```typescript
// Around line 78, before emit
console.log('[DEBUG] Socket state before emit:', {
  id: socket.id,
  connected: socket.connected,
  namespace: socket.nsp,
  roomId
});

// Add this AFTER emit call (after line 81)
setTimeout(() => {
  console.log('[DEBUG] No response after 2s, socket state:', {
    id: socket.id,
    connected: socket.connected
  });
}, 2000);
```

- [ ] **Step 2: Check server handler for room status issue**

In `server/src/socket/handlers/roomHandler.ts`, the handler at line 221-224 checks:
```typescript
if (room.status !== 'waiting') {
  socket.emit('error', { message: 'Game already in progress.' });
  return;
}
```

Add debug logging to see if this condition is being hit:
```typescript
console.log(`[SERVER] Room ${normalizedRoomId} status: ${room.status}`);
```

- [ ] **Step 3: Test join flow**

Run:
```bash
docker compose logs -f server
```

1. Open landing page in browser
2. Enter name
3. Click Create Room (host)
4. In a different browser, open landing page
5. Enter different name
6. Click Join on the room

Check if:
- Client shows "Emitting join-room-by-id"
- Server shows "join-room-by-id received"
- Player navigates to game page

- [ ] **Step 4: If server still doesn't receive event, check socket.io namespace**

The client might be on a different socket.io namespace. Check `client/src/components/SocketProvider.tsx` to see what namespace is used.

- [ ] **Step 5: Commit**

```bash
git add client/src/app/page.tsx server/src/socket/handlers/roomHandler.ts
git commit -m "fix: debug join-room-by-id socket event flow"
```

---

### Task 2: Fix Auto-Deploy Not Working

**Files:**
- Modify: `server/src/socket/handlers/gameHandler.ts:264-332` - auto-deploy handler
- Modify: `client/src/app/game/[roomId]/page.tsx:136-148` - piece:deployed handler
- Modify: `client/src/app/game/[roomId]/page.tsx:259-262` - bot:auto-deploy handler

- [ ] **Step 1: Add server-side debug logging for auto-deploy**

In `server/src/socket/handlers/gameHandler.ts`, add logging to auto-deploy handler:

```typescript
// Around line 264, add at start of handler
socket.on('auto-deploy', () => {
  console.log(`[SERVER] auto-deploy received from socket: ${socket.id}`);
  
  let room: Room | undefined;
  let roomId: string | undefined;
  // ... existing code
  
  if (!room || !roomId) {
    console.log('[SERVER] auto-deploy: room not found');
    return;
  }
  
  const player = getPlayerFromSocket(socket.id, room);
  if (!player) {
    console.log('[SERVER] auto-deploy: player not found');
    return;
  }
  
  console.log(`[SERVER] auto-deploy: player ${player.side}, status: ${room.status}`);
  // ... continue with rest of handler
});
```

- [ ] **Step 2: Add client-side debug logging for piece:deployed**

In `client/src/app/game/[roomId]/page.tsx`, add logging to handlePieceDeployed:

```typescript
// Around line 136
const handlePieceDeployed = (data: { piece: Piece; row: number; col: number; deployedCount: number; board: (Piece | null)[][]; autoDeployComplete?: boolean }) => {
  console.log('[CLIENT] piece:deployed received:', {
    piece: data.piece,
    row: data.row,
    col: data.col,
    deployedCount: data.deployedCount,
    autoDeployComplete: data.autoDeployComplete
  });
  // ... rest of handler
};
```

- [ ] **Step 3: Check bot:auto-deploy listener**

In `client/src/app/game/[roomId]/page.tsx:259-262`:
```typescript
socket.on('bot:auto-deploy', () => {
  socket.emit('auto-deploy');
});
```

This should trigger auto-deploy when bot receives game:started. Add logging:
```typescript
socket.on('bot:auto-deploy', () => {
  console.log('[CLIENT] bot:auto-deploy received, emitting auto-deploy');
  socket.emit('auto-deploy');
});
```

- [ ] **Step 4: Test auto-deploy flow**

Run:
```bash
docker compose logs -f server
docker compose logs -f client
```

1. Create a bot game (host adds bot or creates bot game)
2. Check server logs for auto-deploy handling
3. Check client logs for piece:deployed events
4. Verify board state updates

- [ ] **Step 5: If pieces deployed but Ready not enabled, check allPiecesDeployed**

In `client/src/app/game/[roomId]/page.tsx:66-67`:
```typescript
const totalDeployed = Object.values(deployedCounts).reduce((a, b) => a + b, 0);
const allPiecesDeployed = totalDeployed === 21;
```

Add debug logging to verify count:
```typescript
console.log('[DEBUG] deployedCounts:', deployedCounts, 'total:', totalDeployed);
```

- [ ] **Step 6: Commit**

```bash
git add client/src/app/game/[roomId]/page.tsx server/src/socket/handlers/gameHandler.ts
git commit -m "fix: debug auto-deploy and piece:deployed event flow"
```

---

### Task 3: Full Gameplay Testing

**Goal:** Verify complete game flow works end-to-end.

- [ ] **Step 1: Test PVP Game Flow**

1. Build and start:
```bash
docker compose build client && docker compose up -d
```

2. Player 1 (Host):
   - Open landing page
   - Enter name "Player1"
   - Click Create Room
   - Note the room code

3. Player 2 (Joiner):
   - Open landing page in different browser/incognito
   - Enter name "Player2"
   - Click Join on Player1's room

4. Deployment Phase:
   - Both players should see game page at /game/{roomId}
   - Player 1 (red) deploys first, Player 2 (blue) deploys second
   - Test Auto-Deploy button works for both
   - Test Ready button enables after 21 pieces

5. Game Start:
   - After both ready, countdown 3-2-1-GO!
   - Red plays first

6. Make Moves:
   - Click piece to select (shows valid moves)
   - Click valid square to move
   - Turn switches after move

7. Win Condition:
   - Continue until flag is captured
   - Verify win modal shows

- [ ] **Step 2: Test PVB (Player vs Bot) Game Flow**

1. Host creates bot game (or adds bot from lobby)
2. Host deploys pieces (or uses Auto-Deploy)
3. Host clicks Ready
4. Bot auto-deploys and auto-readies
5. Countdown starts
6. Host makes moves, bot responds

- [ ] **Step 3: Test Rematch Flow**

1. After game over, click Rematch
2. Verify new game starts
3. Verify scores persist

- [ ] **Step 4: Commit test results**

```bash
git commit -m "test: verified full gameplay flow for PVP and PVB"
```

---

### Task 4: Final Cleanup

- [ ] **Step 1: Remove debug logging**

After fixing issues, remove temporary debug logging added in Tasks 1-2.

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "fix: resolved join button and auto-deploy issues"
```
