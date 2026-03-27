# Multiplayer Lobby Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public room list to landing page with quick-join, and host controls for adding bots.

**Architecture:** Server maintains public room list (rooms with status='waiting'). Clients fetch this list on load and poll periodically. Host can add bot or start game from lobby.

**Tech Stack:** Socket.io (events), Zustand (client state), Next.js (UI)

---

## Task 1: Add PublicRoom type to server types

**Files:**
- Modify: `server/src/types/index.ts`

- [ ] **Step 1: Add PublicRoom interface**

```typescript
export interface PublicRoom {
  roomId: string;
  hostName: string;
  playerCount: number;
  isFull: boolean;
  isBotGame: boolean;
  status: 'waiting' | 'deploying' | 'playing' | 'finished';
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/types/index.ts
git commit -m "feat: add PublicRoom type"
```

---

## Task 2: Add publicRooms to server state

**Files:**
- Modify: `server/src/socket/rooms.ts`

- [ ] **Step 1: Add publicRooms map and helper functions**

```typescript
import type { Room, PublicRoom } from '../types';

export const rooms = new Map<string, Room>();
export const publicRooms = new Map<string, PublicRoom>();

export function addToPublicRooms(room: Room): void {
  const hostName = room.players.find(p => p.id === room.hostId)?.name || 'Unknown';
  publicRooms.set(room.id, {
    roomId: room.id,
    hostName,
    playerCount: room.players.length,
    isFull: room.players.length >= 2,
    isBotGame: room.isBotGame,
    status: room.status,
  });
}

export function updatePublicRoom(room: Room): void {
  const existing = publicRooms.get(room.id);
  if (!existing) return;
  
  publicRooms.set(room.id, {
    ...existing,
    playerCount: room.players.length,
    isFull: room.players.length >= 2,
    status: room.status,
  });
}

export function removeFromPublicRooms(roomId: string): void {
  publicRooms.delete(roomId);
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/socket/rooms.ts
git commit -m "feat: add publicRooms map and helpers"
```

---

## Task 3: Add socket events to roomHandler

**Files:**
- Modify: `server/src/socket/handlers/roomHandler.ts`
- Modify: `server/src/socket/rooms.ts` (import helpers)

- [ ] **Step 1: Import helpers in roomHandler**

```typescript
import { rooms, publicRooms, addToPublicRooms, updatePublicRoom, removeFromPublicRooms } from '../rooms';
```

- [ ] **Step 2: Modify create-room to add to public list**

After `rooms.set(roomId, room);` and `socket.join(roomId);`, add:
```typescript
// Add to public room list
addToPublicRooms(room);
io.emit('rooms:list', Array.from(publicRooms.values()));
```

- [ ] **Step 3: Modify join-room to update public list**

After player joins and `room.players.length === 2`, add:
```typescript
updatePublicRoom(room);
io.emit('rooms:list', Array.from(publicRooms.values()));
```

- [ ] **Step 4: Add get-rooms handler**

In roomHandler function, add:
```typescript
socket.on('get-rooms', () => {
  socket.emit('rooms:list', Array.from(publicRooms.values()));
});
```

- [ ] **Step 5: Add join-room-by-id handler**

```typescript
socket.on('join-room-by-id', ({ roomId, playerName }: { roomId: string; playerName: string }) => {
  const normalizedRoomId = roomId.trim().toUpperCase();
  const room = rooms.get(normalizedRoomId);

  if (!room) {
    socket.emit('error', { message: 'Room not found.' });
    return;
  }

  if (room.isBotGame && room.players.length >= 1) {
    socket.emit('error', { message: 'Room is full.' });
    return;
  }

  if (room.players.length >= 2) {
    socket.emit('error', { message: 'Room is full.' });
    return;
  }

  if (room.status !== 'waiting') {
    socket.emit('error', { message: 'Game already in progress.' });
    return;
  }

  const player: Player = {
    id: socket.id,
    name: playerName,
    side: 'blue',
  };

  room.players.push(player);
  socket.join(normalizedRoomId);

  socket.emit('room:joined', {
    roomId: normalizedRoomId,
    playerId: socket.id,
    playerSide: 'blue',
  });

  socket.to(normalizedRoomId).emit('player:joined', { player });
  
  // Update public rooms
  updatePublicRoom(room);
  io.emit('rooms:list', Array.from(publicRooms.values()));

  // Start game if now full
  if (room.players.length === 2) {
    room.status = 'deploying';
    removeFromPublicRooms(normalizedRoomId);
    io.emit('rooms:list', Array.from(publicRooms.values()));
    io.to(normalizedRoomId).emit('game:started', {
      board: room.board,
      currentTurn: 'red',
      status: 'deploying',
    });
  }
});
```

- [ ] **Step 6: Add add-bot handler**

```typescript
socket.on('add-bot', () => {
  // Find room where socket is host
  for (const [roomId, room] of rooms.entries()) {
    if (room.hostId === socket.id && room.status === 'waiting') {
      if (room.players.length >= 2 || room.isBotGame) {
        socket.emit('error', { message: 'Room is already full.' });
        return;
      }

      // Add synthetic bot player
      const botPlayer: Player = { id: `bot-${roomId}`, name: 'Bot', side: 'blue' };
      room.players.push(botPlayer);
      room.isBotGame = true;
      room.botSide = 'blue';

      // Update public rooms
      updatePublicRoom(room);
      removeFromPublicRooms(roomId);
      io.emit('rooms:list', Array.from(publicRooms.values()));

      // Auto-start game for PVB
      room.status = 'deploying';
      
      // Bot auto-deploy
      const botPositions = generateAutoDeploy('blue');
      for (const [typeKey, position] of botPositions) {
        const pieceType = typeKey.replace(/-\d+$/, '');
        const config = PIECE_CONFIG.find((p) => p.type === pieceType);
        if (!config) continue;

        const piece: Piece = {
          id: `${typeKey}-bot-${Math.random().toString(36).slice(2, 8)}`,
          type: pieceType as Piece['type'],
          owner: 'blue',
          rank: config.rank as Piece['rank'],
          revealed: false,
        };

        room.board[position.row][position.col] = piece;
        room.deployedPieces.blue.add(piece.id);

        io.to(roomId).emit('piece:deployed', {
          piece,
          row: position.row,
          col: position.col,
          deployedCount: room.deployedPieces.blue.size,
          board: room.board,
          autoDeployComplete: room.deployedPieces.blue.size === 21,
        });
      }

      io.to(roomId).emit('game:started', {
        board: room.board,
        currentTurn: 'red',
        status: 'deploying',
      });

      console.log(`Host ${socket.id} added bot to room ${roomId}`);
      break;
    }
  }
});
```

- [ ] **Step 7: Add start-game handler**

```typescript
socket.on('start-game', () => {
  for (const [roomId, room] of rooms.entries()) {
    if (room.hostId === socket.id && room.players.length === 2 && room.status === 'waiting') {
      room.status = 'deploying';
      
      // Remove from public list
      removeFromPublicRooms(roomId);
      io.emit('rooms:list', Array.from(publicRooms.values()));

      io.to(roomId).emit('game:started', {
        board: room.board,
        currentTurn: 'red',
        status: 'deploying',
      });

      console.log(`Host ${socket.id} started game in room ${roomId}`);
      break;
    }
  }
});
```

- [ ] **Step 8: Modify leave-room to update public list**

After player leaves and room still has players:
```typescript
// Update public rooms if room still exists
if (room) {
  if (room.players.length === 0) {
    removeFromPublicRooms(roomId);
  } else {
    updatePublicRoom(room);
  }
  io.emit('rooms:list', Array.from(publicRooms.values()));
}
```

- [ ] **Step 9: Commit**

```bash
git add server/src/socket/handlers/roomHandler.ts server/src/socket/rooms.ts
git commit -m "feat: add get-rooms, join-room-by-id, add-bot, start-game events"
```

---

## Task 3: Add PublicRoom type to client

**Files:**
- Modify: `client/src/types/index.ts`

- [ ] **Step 1: Add PublicRoom interface**

```typescript
export interface PublicRoom {
  roomId: string;
  hostName: string;
  playerCount: number;
  isFull: boolean;
  isBotGame: boolean;
  status: 'waiting' | 'deploying' | 'playing' | 'finished';
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/types/index.ts
git commit -m "feat: add PublicRoom type to client"
```

---

## Task 4: Update roomStore with rooms list

**Files:**
- Modify: `client/src/store/roomStore.ts`

- [ ] **Step 1: Add rooms state and actions**

```typescript
interface RoomState {
  // ... existing fields
  rooms: PublicRoom[];
  setRooms: (rooms: PublicRoom[]) => void;
  updateRoom: (room: PublicRoom) => void;
  removeRoom: (roomId: string) => void;
}
```

- [ ] **Step 2: Add initial state and implementations**

```typescript
export const useRoomStore = create<RoomState>((set) => ({
  // ... existing state
  rooms: [],

  setRooms: (rooms) => set({ rooms }),

  updateRoom: (room) =>
    set((state) => {
      const index = state.rooms.findIndex((r) => r.roomId === room.roomId);
      if (index === -1) return state;
      const newRooms = [...state.rooms];
      newRooms[index] = room;
      return { rooms: newRooms };
    }),

  removeRoom: (roomId) =>
    set((state) => ({
      rooms: state.rooms.filter((r) => r.roomId !== roomId),
    })),
}));
```

- [ ] **Step 3: Commit**

```bash
git add client/src/store/roomStore.ts
git commit -m "feat: add rooms list to roomStore"
```

---

## Task 5: Update landing page with room list

**Files:**
- Modify: `client/src/app/page.tsx`

- [ ] **Step 1: Read existing landing page (already done)**

- [ ] **Step 2: Replace landing page content**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/components/SocketProvider';
import { useRoomStore } from '@/store/roomStore';

export default function LandingPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const { rooms, setRooms, removeRoom } = useRoomStore();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch rooms on mount and poll periodically
  useEffect(() => {
    if (!socket) return;

    socket.emit('get-rooms');

    const handleRoomsList = (roomList: any[]) => {
      setRooms(roomList);
    };

    socket.on('rooms:list', handleRoomsList);

    const interval = setInterval(() => {
      socket.emit('get-rooms');
    }, 5000);

    return () => {
      socket.off('rooms:list', handleRoomsList);
      clearInterval(interval);
    };
  }, [socket, setRooms]);

  const handleJoinRoom = (roomId: string) => {
    if (!socket || !playerName.trim()) {
      setError('Please enter your name first');
      return;
    }
    setError(null);
    socket.emit('join-room-by-id', {
      roomId,
      playerName: playerName.trim(),
    });

    socket.once('room:joined', ({ roomId }: { roomId: string }) => {
      router.push(`/lobby?room=${roomId}`);
    });

    socket.once('error', ({ message }: { message: string }) => {
      setError(message);
    });
  };

  const waitingRooms = rooms.filter(r => r.status === 'waiting');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#1a2e1a]">
      <h1 className="text-4xl md:text-5xl font-bold text-[#d4a847] mb-4 text-center">
        Game of the Generals
      </h1>
      <p className="text-gray-400 text-center text-lg mb-8 max-w-md">
        The classic Filipino strategy game, online
      </p>

      {/* Name input */}
      <div className="mb-6 w-full max-w-sm">
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-3 bg-[#2d4a2d] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d4a847]"
          maxLength={20}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-300 text-sm max-w-sm w-full">
          {error}
        </div>
      )}

      {/* Create Room Button */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => {
            if (!playerName.trim()) {
              setError('Please enter your name first');
              return;
            }
            router.push('/lobby?mode=online&name=' + encodeURIComponent(playerName.trim()));
          }}
          className="px-8 py-3 bg-[#d4a847] hover:bg-[#c49a3d] text-[#1a2e1a] font-semibold rounded-lg text-lg"
        >
          + Create Room
        </button>
      </div>

      {/* Room List */}
      <div className="bg-[#2d4a2d] rounded-xl p-6 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Open Rooms</h2>
        
        {waitingRooms.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No open rooms. Create one to start!</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {waitingRooms.map((room) => (
              <div
                key={room.roomId}
                className="bg-[#1a2e1a] rounded-lg p-4 border border-gray-700 hover:border-gray-500 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-sm">
                      {room.hostName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold truncate">{room.hostName}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    room.isBotGame 
                      ? 'bg-green-600/20 text-green-400' 
                      : 'bg-yellow-600/20 text-yellow-400'
                  }`}>
                    {room.isBotGame ? 'vs Bot' : 'PVP'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 font-mono">{room.roomId}</span>
                  <span className="text-gray-400 text-sm">{room.playerCount}/2</span>
                </div>
                <button
                  onClick={() => handleJoinRoom(room.roomId)}
                  disabled={room.isFull}
                  className={`w-full mt-3 py-2 rounded text-sm font-medium ${
                    room.isFull
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {room.isFull ? 'Full' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/app/page.tsx
git commit -m "feat: add room list to landing page"
```

---

## Task 6: Update lobby page with host controls

**Files:**
- Modify: `client/src/app/lobby/page.tsx`

- [ ] **Step 1: Update imports and add host controls state**

Add to imports:
```typescript
import { useRoomStore } from '@/store/roomStore';
```

Add state:
```typescript
const { isHost, setRoom } = useRoomStore();
const [canAddBot, setCanAddBot] = useState(false);
const [canStartGame, setCanStartGame] = useState(false);
```

- [ ] **Step 2: Add socket listeners for host controls**

```typescript
// Listen for room updates to control button visibility
useEffect(() => {
  if (!socket || !isHost) return;

  const handleGameStarted = ({ status }: { status: string }) => {
    if (status === 'deploying') {
      setCanAddBot(false);
      setCanStartGame(false);
    }
  };

  const handlePlayerJoined = () => {
    setCanStartGame(true);
  };

  const handlePlayerLeft = () => {
    setCanStartGame(false);
    setCanAddBot(true);
  };

  socket.on('game:started', handleGameStarted);
  socket.on('player:joined', handlePlayerJoined);
  socket.on('player:left', handlePlayerLeft);

  // Initial state
  if (createdRoomId) {
    setCanAddBot(true);
  }

  return () => {
    socket.off('game:started', handleGameStarted);
    socket.off('player:joined', handlePlayerJoined);
    socket.off('player:left', handlePlayerLeft);
  };
}, [socket, isHost, createdRoomId]);
```

- [ ] **Step 3: Add Add Bot and Start Game handlers**

```typescript
const handleAddBot = () => {
  if (!socket) return;
  socket.emit('add-bot');
};

const handleStartGame = () => {
  if (!socket) return;
  socket.emit('start-game');
};
```

- [ ] **Step 4: Update waiting room UI**

Replace the waiting section with:
```typescript
{/* Waiting message */}
{mode === 'bot' ? (
  <>
    <div className="mb-4">
      <span className="inline-block bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm">
        vs Bot
      </span>
    </div>
    <p className="text-gray-400">Setting up bot game...</p>
  </>
) : !isJoined ? (
  <>
    <p className="text-gray-300 text-lg mb-2">Waiting for opponent&hellip;</p>
    <p className="text-gray-500 text-sm mb-6">Share the room code with a friend</p>
    
    {/* Host Controls - Add Bot */}
    {isHost && canAddBot && (
      <button
        onClick={handleAddBot}
        className="mb-4 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg text-sm"
      >
        + Add Bot
      </button>
    )}
  </>
) : isHost && canStartGame ? (
  <>
    <p className="text-gray-300 text-lg mb-4">Room is full!</p>
    <button
      onClick={handleStartGame}
      className="mb-4 px-6 py-3 bg-[#d4a847] hover:bg-[#c49a3d] text-[#1a2e1a] font-bold rounded-lg"
    >
      Start Game
    </button>
  </>
) : (
  <p className="text-gray-300 text-lg">Starting game...</p>
)}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/app/lobby/page.tsx
git commit -m "feat: add host controls (Add Bot, Start Game) to lobby"
```

---

## Task 7: Test end-to-end

**Files:**
- Test manually

- [ ] **Step 1: Start server and client**

```bash
cd server && npm run dev
cd client && npm run dev
```

- [ ] **Step 2: Test room list on landing page**

Open http://localhost:3000 - should show "No open rooms" initially

- [ ] **Step 3: Test create room**

Enter name, click "+ Create Room" - should go to lobby with room code

- [ ] **Step 4: Test room appears in list**

Open new tab to landing page - should see the room in the list

- [ ] **Step 5: Test join by click**

Click "Join" on room card - should join room

- [ ] **Step 6: Test Add Bot**

Host clicks "+ Add Bot" - should add bot and start game

- [ ] **Step 7: Test Start Game**

Create new room, join from another tab, host clicks "Start Game" - should start

- [ ] **Step 8: Commit**

```bash
git commit -m "test: verify multiplayer lobby works"
```

---

## Summary

This plan adds:
1. Public room tracking on server (publicRooms map)
2. Socket events: get-rooms, join-room-by-id, add-bot, start-game
3. Landing page with 2-column room grid
4. Host controls: Add Bot (waiting), Start Game (full room)

Total commits: ~8
