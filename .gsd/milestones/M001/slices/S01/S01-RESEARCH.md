# Phase 01: Foundation - Research

**Researched:** 2026-03-18
**Domain:** Full-stack multiplayer board game foundation — monorepo, Socket.io rooms, board rendering, state management
**Confidence:** HIGH

## Summary

Phase 01 establishes the entire codebase from scratch. The critical architectural insight is that **the Express/Socket.io server is a completely separate process** from Next.js (ports 3001 vs 3000), meaning no custom Next.js server is needed — the client connects directly to the external Socket.io server. This is the recommended Socket.io pattern and enables clean separation of concerns.

The project uses a **root-level monorepo** with `client/` and `server/` directories orchestrated by Docker Compose. Next.js 14 App Router with TypeScript, Tailwind CSS, and Zustand form the client stack. The Socket.io client uses a React context provider pattern (`SocketProvider.tsx`) to maintain a single connection across the app. Room management leverages Socket.io's built-in `socket.join(roomId)` API with a 6-character alphanumeric code system.

Board rendering uses CSS Grid (9 columns × 8 rows) with Tailwind's `nth-child` variant for alternating colors and visually distinct deployment zones. Two Zustand stores (`gameStore`, `roomStore`) provide state management with typed interfaces.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Monorepo layout: client/ + server/ at root with docker-compose.yml
- Docker Compose orchestrates both services
- Next.js 14 (App Router) for client
- Express.js + Socket.io for server
- TypeScript throughout
- Tailwind CSS for styling
- Zustand for state management (two stores: gameStore + roomStore)
- Socket.io provider component (context-based)
- Room codes: 6-character alphanumeric
- Feature-based component organization: features/lobby/, features/game/
- Board rendered with CSS Grid (9 columns, 8 rows)
- Greenfield project — no existing code

### Claude's Discretion
- Specific landing page layout/design
- Specific lobby page UI
- Specific piece visual design (notation, icons, colors)

### Deferred Ideas (OUT OF SCOPE)
- Redis connection handling — Phase 4 (AI) or later
- Spectating — Phase 5+ (not in initial scope)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can create a game room with a unique 6-character code | Socket.io room creation, `nanoid` for code generation, server room handler |
| AUTH-02 | User can join an existing room using the room code | Socket.io join-room event, room validation |
| AUTH-03 | User can set their display name | Room payload includes player name, stored on server |
| AUTH-04 | User can leave a room at any time | Socket.io `socket.leave(roomId)`, client-side cleanup |
| GS-01 | Board renders as a 9x8 grid | CSS Grid with `grid-template-columns: repeat(9, 1fr)` and 8 rows |
| GS-02 | Each player has 21 pieces with correct ranks | Piece data model with 21-piece configuration per player |
| GS-03 | Red player deployment zone is rows 0-2 | Tailwind conditional classes, row-indexed rendering |
| GS-04 | Blue player deployment zone is rows 5-7 | Tailwind conditional classes, row-indexed rendering |
</phase_requirements>

---

## Standard Stack

### Core Client
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 14.x | React framework, App Router | User-specified |
| `react` | 18.x | UI library | Bundled with Next.js |
| `typescript` | ^5.x | Type safety | User-specified |
| `tailwindcss` | ^3.x | Styling | User-specified |
| `zustand` | ^4.x | State management | User-specified |
| `socket.io-client` | ^4.x | WebSocket client | User-specified |

### Core Server
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `express` | ^4.x | HTTP server | User-specified |
| `socket.io` | ^4.x | WebSocket server | User-specified |
| `typescript` | ^5.x | Type safety | User-specified |
| `cors` | ^2.x | CORS middleware | Required for cross-origin |
| `nanoid` | ^5.x | Room code generation | Clean, URL-safe IDs |
| `jest` | ^29.x | Testing | Per PROJECT_SPECS.md |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/node` | ^20.x | Node type definitions | Server TypeScript |
| `@types/express` | ^4.x | Express type definitions | Server TypeScript |
| `@types/cors` | ^2.x | Cors type definitions | Server TypeScript |
| `tsx` | ^4.x | TypeScript execution | `npm run dev` without transpilation |

**Installation:**
```bash
# Client
cd client && npm install socket.io-client zustand

# Server
cd server && npm install express socket.io cors nanoid
cd server && npm install -D jest ts-jest @types/jest typescript @types/node @types/express @types/cors tsx
```

---

## Architecture Patterns

### Recommended Project Structure

```
gotg/                          # Root monorepo
├── docker-compose.yml         # Docker orchestration
├── .dockerignore
├── client/                    # Next.js Frontend
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── page.tsx     # Landing page
│   │   │   ├── layout.tsx   # Root layout with SocketProvider
│   │   │   ├── lobby/
│   │   │   │   └── page.tsx
│   │   │   └── game/
│   │   │       └── [roomId]/
│   │   │           └── page.tsx
│   │   ├── features/        # Feature-based components
│   │   │   ├── lobby/
│   │   │   │   ├── CreateRoomForm.tsx
│   │   │   │   ├── JoinRoomForm.tsx
│   │   │   │   └── LobbyPage.tsx
│   │   │   └── game/
│   │   │       ├── Board.tsx
│   │   │       ├── Piece.tsx
│   │   │       └── PiecePalette.tsx
│   │   ├── components/      # Shared UI components
│   │   │   ├── SocketProvider.tsx
│   │   │   └── ui/          # Generic UI
│   │   ├── store/           # Zustand stores
│   │   │   ├── gameStore.ts
│   │   │   └── roomStore.ts
│   │   ├── types/           # Shared types (copied from server)
│   │   │   └── index.ts
│   │   └── lib/              # Utilities
│   │       └── socket.ts     # Socket instance singleton
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── Dockerfile
│
└── server/                   # Express + Socket.io Backend
    ├── src/
    │   ├── index.ts          # Entry point (Express + Socket.io)
    │   ├── socket/
    │   │   ├── index.ts      # Socket.io setup
    │   │   └── handlers/    # Event handlers
    │   │       ├── roomHandler.ts
    │   │       └── gameHandler.ts
    │   ├── game/
    │   │   └── types.ts     # Game type definitions
    │   └── types/
    │       └── index.ts     # Shared interfaces
    ├── tests/
    │   └── socket.test.ts    # Jest + Socket.io tests
    ├── package.json
    ├── tsconfig.json
    └── Dockerfile
```

### Pattern 1: Separate Socket.io Server (RECOMMENDED)

**What:** Express server on port 3001 hosts Socket.io alongside HTTP endpoints. Next.js client on port 3000 connects directly to the Socket.io server URL.

**When to use:** Always for this project — user specified separate Express server.

**Why not embedded in Next.js:** Socket.io docs recommend separate server for scalability. Vercel doesn't support WebSocket anyway. This avoids Next.js custom server complexity.

**Example:**
```typescript
// server/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Socket.io handlers
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  socket.on('create-room', (data) => {
    const roomId = generateRoomCode(); // 6-char alphanumeric
    socket.join(roomId);
    socket.emit('room:created', { roomId, playerId: socket.id });
  });
  
  socket.on('join-room', (data) => {
    const room = rooms.get(data.roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    socket.join(data.roomId);
    socket.emit('room:joined', { roomId: data.roomId, playerId: socket.id });
    socket.to(data.roomId).emit('player:joined', { playerId: socket.id });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Source:** [Socket.io official docs - "Separate WebSocket Server"](https://socket.io/how-to/use-with-nextjs) (2024)

### Pattern 2: Socket.io React Context Provider

**What:** A `'use client'` React context that creates and manages a single Socket.io connection, exposed via `useSocket()` hook.

**When to use:** Wraps the entire app in `layout.tsx` so all pages can access the socket.

**Example:**
```typescript
// client/src/components/SocketProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected:', socketInstance.id);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
```

```typescript
// client/src/app/layout.tsx
import { SocketProvider } from '@/components/SocketProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SocketProvider>{children}</SocketProvider>
      </body>
    </html>
  );
}
```

**Source:** [Socket.io official docs - React integration](https://socket.io/how-to/use-with-nextjs) (2024)

### Pattern 3: Zustand Typed Store

**What:** Create a typed Zustand store with explicit interfaces for state and actions.

**When to use:** Both `gameStore` and `roomStore`.

**Example:**
```typescript
// client/src/store/roomStore.ts
import { create } from 'zustand';

interface Player {
  id: string;
  name: string;
  side: 'red' | 'blue';
}

interface RoomState {
  roomId: string | null;
  playerId: string | null;
  players: Player[];
  isHost: boolean;
  isBotGame: boolean;
  // Actions
  setRoom: (roomId: string, playerId: string, isHost: boolean) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  playerId: null,
  players: [],
  isHost: false,
  isBotGame: false,
  
  setRoom: (roomId, playerId, isHost) => 
    set({ roomId, playerId, isHost }),
  
  addPlayer: (player) =>
    set((state) => ({ players: [...state.players, player] })),
  
  removePlayer: (playerId) =>
    set((state) => ({ players: state.players.filter((p) => p.id !== playerId) })),
  
  clearRoom: () =>
    set({ roomId: null, playerId: null, players: [], isHost: false, isBotGame: false }),
}));
```

```typescript
// client/src/store/gameStore.ts
import { create } from 'zustand';
import type { Piece, Position } from '@/types';

interface GameState {
  board: (Piece | null)[][];
  currentTurn: 'red' | 'blue';
  gameStatus: 'waiting' | 'deploying' | 'playing' | 'finished';
  selectedPiece: Position | null;
  // Actions
  setBoard: (board: (Piece | null)[][]) => void;
  selectPiece: (pos: Position | null) => void;
  setTurn: (turn: 'red' | 'blue') => void;
  setGameStatus: (status: GameState['gameStatus']) => void;
}

export const useGameStore = create<GameState>((set) => ({
  board: Array(8).fill(null).map(() => Array(9).fill(null)),
  currentTurn: 'red',
  gameStatus: 'waiting',
  selectedPiece: null,
  
  setBoard: (board) => set({ board }),
  selectPiece: (pos) => set({ selectedPiece: pos }),
  setTurn: (turn) => set({ currentTurn: turn }),
  setGameStatus: (status) => set({ gameStatus: status }),
}));
```

**Source:** [Zustand docs - TypeScript guide](https://github.com/pmndrs/zustand) (2024)

### Pattern 4: CSS Grid Board with Deployment Zones

**What:** CSS Grid renders a 9×8 board with alternating square colors. Deployment zones get distinct background colors.

**When to use:** Game board rendering.

**Example:**
```tsx
// client/src/features/game/Board.tsx
'use client';

import React from 'react';
import { useGameStore } from '@/store/gameStore';
import Piece from './Piece';

const ROWS = 8;
const COLS = 9;

export default function Board() {
  const { board, selectedPiece } = useGameStore();

  const isDeploymentZone = (row: number, side: 'red' | 'blue') => {
    if (side === 'red') return row >= 0 && row <= 2;
    return row >= 5 && row <= 7;
  };

  const isValidMove = (row: number, col: number) => {
    if (!selectedPiece) return false;
    const dr = Math.abs(row - selectedPiece.row);
    const dc = Math.abs(col - selectedPiece.col);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  };

  return (
    <div className="grid grid-cols-9 grid-rows-8 gap-0 w-full max-w-2xl aspect-[9/8] border-4 border-gray-800">
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const isDark = (rowIndex + colIndex) % 2 === 1;
          const isSelected = selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex;
          const validMove = isValidMove(rowIndex, colIndex);
          
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`
                relative flex items-center justify-center aspect-square
                ${isDark ? 'bg-amber-900' : 'bg-amber-100'}
                ${isSelected ? 'ring-4 ring-yellow-400 ring-inset' : ''}
                ${validMove ? 'ring-2 ring-green-400 ring-inset' : ''}
                border border-gray-700
              `}
            >
              {piece && <Piece piece={piece} position={{ row: rowIndex, col: colIndex }} />}
            </div>
          );
        })
      )}
    </div>
  );
}
```

**Deployment zone visualization (separate component or overlay):**
```tsx
// client/src/features/game/DeploymentZone.tsx
// Red zone: rows 0-2, Blue zone: rows 5-7
<div
  className={`
    absolute inset-0 pointer-events-none
    ${side === 'red' ? 'bg-red-500/20' : 'bg-blue-500/20'}
    ${side === 'red' ? 'top-0' : 'bottom-0'}
    h-3/8
    border-b-2 border-dashed border-red-500/50
  `}
/>
```

**Source:** [LinkedIn - CSS Grid chessboard pattern](https://www.linkedin.com/posts/utsavmeena_build-a-chessboard-in-css-fast-and-easy-activity-7293272003434684416-gloh) (2024), [GeeksforGeeks - Chessboard in React](https://www.geeksforgeeks.org/create-a-chessboard-pattern-in-react-js/) (2025)

### Pattern 5: Room Code Generation

**What:** Generate a 6-character alphanumeric room code using `nanoid`.

**When to use:** `create-room` event handler on server.

**Example:**
```typescript
// server/src/socket/handlers/roomHandler.ts
import { customAlphabet } from 'nanoid';

// 6-character alphanumeric (uppercase + lowercase + digits, excluding ambiguous chars)
const generateRoomCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', 6);

io.on('connection', (socket) => {
  socket.on('create-room', ({ hostName, isBotMode }) => {
    const roomId = generateRoomCode();
    
    const room = {
      id: roomId,
      hostId: socket.id,
      players: [{ id: socket.id, name: hostName, side: 'red' }],
      status: 'waiting' as const,
      board: Array(8).fill(null).map(() => Array(9).fill(null)),
      currentTurn: 'red' as const,
      deployedPieces: { red: new Set<string>(), blue: new Set<string>() },
      scores: { red: 0, blue: 0, draws: 0, gamesPlayed: 0 },
      isBotGame: isBotMode ?? false,
      botSide: isBotMode ? 'blue' : null,
      createdAt: Date.now(),
    };
    
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit('room:created', {
      roomId,
      playerId: socket.id,
      playerSide: 'red',
      isBotGame: room.isBotGame,
    });
  });
});
```

**Source:** [Socket.io Rooms documentation](https://socket.io/docs/v3/rooms/) (2024)

### Pattern 6: Socket.io Event Naming Convention

**What:** Use `camelCase` event names with namespace prefixes for response events.

**When to use:** All Socket.io communication.

**Event convention from PROJECT_SPECS.md:**
```
Client → Server: create-room, join-room, leave-room, deploy-piece, ready, make-move
Server → Client: room:created, room:joined, player:joined, game:started, piece:deployed, player:ready
```

**Example:**
```typescript
// Server side
socket.emit('room:created', { roomId, playerId, playerSide });
socket.to(roomId).emit('player:joined', { player });
io.to(roomId).emit('game:started', { board, currentTurn });

// Client side
socket.emit('create-room', { hostName, isBotMode });
socket.emit('join-room', { roomId, playerName });
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Room code uniqueness | Manual random string generation | `nanoid` with custom alphabet | Collision resistance, URL-safe, tested |
| Socket connection management | Raw `useEffect` with socket refs | React Context + Provider pattern | Clean lifecycle, no prop drilling, testable |
| Board styling | Absolute positioning or table layout | CSS Grid | Native support, responsive, performant |
| Alternating cell colors | JavaScript-based color calculation | CSS `:nth-child` | Zero JS overhead, SSR-safe |
| Socket.io testing setup | ad-hoc mock servers | `socket.io-client` `ioc` + Jest | Official recommended approach |

---

## Common Pitfalls

### Pitfall 1: Socket Disconnecting on Page Navigation
**What goes wrong:** Socket connection drops when navigating between Next.js pages because the component using the socket unmounts.
**Why it happens:** Socket.io client library cleans up on unmount by default, and Next.js App Router may unmount layout-level components during navigation.
**How to avoid:** Mount `SocketProvider` in `layout.tsx` (not individual pages). Use `useEffect` with empty deps `[]` so connection persists across navigation. Ensure the provider itself doesn't unmount.
**Warning signs:** `"Socket disconnected"` logs on every page transition, missed real-time events.

### Pitfall 2: Socket Singleton Created Per-Component
**What goes wrong:** Each component that accesses the socket creates its own connection.
**Why it happens:** Using `io()` at module level or in component body without a shared instance.
**How to avoid:** Use the React Context pattern (Pattern 2 above). The context holds ONE socket instance created once per app.
**Warning signs:** Multiple `"Socket connected"` logs with different socket IDs, server seeing duplicate connections from same player.

### Pitfall 3: Next.js SSR Attempting to Initialize Socket
**What goes wrong:** Socket.io client code runs during server-side rendering, causing errors like `"localStorage is not defined"`.
**Why it happens:** `'use client'` directive not on all files importing socket client, or socket initialized at module level.
**How to avoid:** Mark all socket-related components with `'use client'`. Initialize socket inside `useEffect`, not at module level.
**Warning signs:** `"ReferenceError: localStorage is not defined"` during `npm run build`.

### Pitfall 4: Docker Port Conflicts with Dev Server
**What goes wrong:** Docker container can't bind to ports because a local dev server is already running on those ports.
**Why it happens:** `docker-compose.yml` binds host ports (3000, 3001) while developer also runs `npm run dev` locally.
**How to avoid:** Use Docker exclusively for development OR ensure only Docker containers run the services. Document clearly in README.
**Warning signs:** `"EADDRINUSE: address already in use"` when running `docker-compose up`.

### Pitfall 5: CORS Blocking Socket.io Connections
**What goes wrong:** Browser blocks WebSocket connection with CORS error.
**Why it happens:** Socket.io CORS config doesn't include the client's origin.
**How to avoid:** Set `cors.origin` to `'http://localhost:3000'` in development, use `CORS_ORIGIN` env var in production.
**Warning signs:** `"Access to fetch at 'http://localhost:3001' from origin 'http://localhost:3000' has been blocked by CORS policy"`.

---

## Code Examples

### Landing Page
```tsx
// client/src/app/page.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold text-amber-400 mb-4">Game of the Generals</h1>
      <p className="text-gray-400 mb-12 text-center max-w-md">
        A Filipino strategic board game. Deploy your pieces, outmaneuver your opponent, and capture the flag.
      </p>
      
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => router.push('/lobby?mode=bot')}
          className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
        >
          Play vs Bot
        </button>
        
        <button
          onClick={() => router.push('/lobby?mode=online')}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
        >
          Play Online
        </button>
      </div>
    </main>
  );
}
```

### Lobby Page (Create Room)
```tsx
// client/src/features/lobby/LobbyPage.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/components/SocketProvider';
import { useRoomStore } from '@/store/roomStore';

export default function LobbyPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const { setRoom } = useRoomStore();
  const [playerName, setPlayerName] = useState('');
  const [mode, setMode] = useState<'bot' | 'online'>('online');
  const [roomCode, setRoomCode] = useState('');

  const handleCreateRoom = () => {
    if (!socket || !playerName.trim()) return;
    
    socket.emit('create-room', { hostName: playerName, isBotMode: mode === 'bot' });
    
    socket.once('room:created', ({ roomId, playerId }) => {
      setRoom(roomId, playerId, true);
      router.push(`/game/${roomId}`);
    });
  };

  const handleJoinRoom = () => {
    if (!socket || !playerName.trim() || !roomCode.trim()) return;
    
    socket.emit('join-room', { roomId: roomCode.toUpperCase(), playerName });
    
    socket.once('room:joined', ({ roomId, playerId, playerSide }) => {
      setRoom(roomId, playerId, false);
      router.push(`/game/${roomId}`);
    });
    
    socket.once('error', ({ message }) => {
      alert(message);
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-md mx-auto space-y-8">
        {/* Mode selector */}
        <div className="flex gap-4">
          <button
            onClick={() => setMode('bot')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              mode === 'bot' ? 'bg-green-600' : 'bg-gray-700'
            }`}
          >
            vs Bot
          </button>
          <button
            onClick={() => setMode('online')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              mode === 'online' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            Online
          </button>
        </div>

        {/* Player name */}
        <input
          type="text"
          placeholder="Your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
        />

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={handleCreateRoom}
            disabled={!playerName.trim()}
            className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg"
          >
            Create Room
          </button>

          {mode === 'online' && (
            <>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-600" />
                <span className="text-gray-500">or</span>
                <div className="flex-1 h-px bg-gray-600" />
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white uppercase tracking-widest text-center font-mono"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!playerName.trim() || roomCode.length !== 6}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg"
                >
                  Join
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Piece Component
```tsx
// client/src/features/game/Piece.tsx
'use client';

import React from 'react';
import type { Piece } from '@/types';
import { useGameStore } from '@/store/gameStore';

const PIECE_SYMBOLS: Record<string, string> = {
  '5star': '★',
  '4star': '☆',
  'colonel': 'Col',
  'sergeant': 'Sgt',
  'private': 'Pvt',
  'spy': 'Spy',
  'flag': '⚑',
};

interface PieceProps {
  piece: Piece;
  position: { row: number; col: number };
}

export default function Piece({ piece, position }: PieceProps) {
  const { selectPiece, selectedPiece, gameStatus, currentTurn } = useGameStore();
  
  const isSelected = selectedPiece?.row === position.row && selectedPiece?.col === position.col;
  const canSelect = gameStatus === 'playing' && piece.owner === currentTurn && piece.revealed;

  const handleClick = () => {
    if (canSelect) {
      selectPiece(isSelected ? null : position);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!canSelect}
      className={`
        w-full h-full flex items-center justify-center
        text-xs font-bold rounded-full
        transition-all duration-150
        ${piece.owner === 'red' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}
        ${isSelected ? 'ring-4 ring-yellow-400 scale-110' : ''}
        ${canSelect ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
        ${!piece.revealed ? 'opacity-60' : ''}
        shadow-lg
      `}
    >
      {PIECE_SYMBOLS[piece.type] ?? piece.type[0].toUpperCase()}
    </button>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| Redux + Thunk | Zustand | ~2021 | ~90% less boilerplate, hooks-based |
| Custom WebSocket wrapper | Socket.io Client | ~2014 | Built-in reconnection, fallback transports |
| Table-based board layout | CSS Grid | ~2017 (CSS Grid widely supported) | Responsive, no JS layout calculation |
| Rooms stored in MongoDB | In-memory Map + Redis later | Phase 4 | Simplicity for v1, Redis for scaling |
| Next.js custom server for Socket.io | Separate Express server | ~2023 | Better separation, Vercel incompatibility acknowledged |

**Deprecated/outdated:**
- **Socket.io in Next.js API routes**: App Router route handlers don't expose `res.socket`. Use separate server.
- **Pages Router for Socket.io**: App Router requires `'use client'` and context pattern, but is the modern standard.

---

## Open Questions

1. **Should shared types live in a `shared/` package or just duplicate files?**
   - What we know: TypeScript interfaces for `Piece`, `Room`, `Move` are identical on client and server.
   - What's unclear: Whether to use npm workspace, symlinks, or simple file duplication.
   - Recommendation: For a two-package monorepo, just copy `types/index.ts` to both `client/src/types/` and `server/src/types/`. Revisit if more shared code emerges.

2. **Dev workflow with Docker vs local npm**
   - What we know: Docker Compose orchestrates both services. The project is greenfield.
   - What's unclear: Whether developers should run `docker-compose up` exclusively or run services locally for hot-reload.
   - Recommendation: Document both options. Docker Compose as primary, local `npm run dev` as alternative.

3. **Session scores persistence across page refreshes**
   - What we know: `Room` interface has `scores` field. Requirements mention session scores.
   - What's unclear: Whether scores should persist in localStorage, memory, or Redis.
   - Recommendation: In-memory for Phase 1 (scores reset on server restart). localStorage for client-side display continuity.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest ^29.x (per PROJECT_SPECS.md) |
| Config file | `server/jest.config.js` |
| Quick run command | `cd server && npm test -- --testPathPattern=room` |
| Full suite command | `cd server && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Room creation with 6-char code | unit | `npm test -- --testPathPattern=room --testNamePattern="create"` | ❌ Wave 0 |
| AUTH-02 | Join existing room | unit | `npm test -- --testPathPattern=room --testNamePattern="join"` | ❌ Wave 0 |
| AUTH-03 | Display name stored | unit | `npm test -- --testPathPattern=room --testNamePattern="player"` | ❌ Wave 0 |
| AUTH-04 | Leave room cleans up | unit | `npm test -- --testPathPattern=room --testNamePattern="leave"` | ❌ Wave 0 |
| GS-01 | Board renders 9x8 grid | smoke | manual browser test | ❌ Wave 0 |
| GS-02 | 21 pieces per player | unit | `npm test -- --testPathPattern=pieces` | ❌ Wave 0 |
| GS-03 | Red deployment zone rows 0-2 | smoke | manual browser test | ❌ Wave 0 |
| GS-04 | Blue deployment zone rows 5-7 | smoke | manual browser test | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern=room --passWithNoTests`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `server/tests/room.test.ts` — covers AUTH-01 through AUTH-04 (socket event handling)
- [ ] `server/tests/pieces.test.ts` — covers GS-02 (piece configuration)
- [ ] `server/jest.config.js` — Jest configuration for TypeScript + Socket.io
- [ ] `server/package.json` — add `jest`, `ts-jest`, `@types/jest` dev dependencies

---

## Sources

### Primary (HIGH confidence)
- [Socket.io official docs - How to use with Next.js](https://socket.io/how-to/use-with-nextjs) — verified 2024-12
- [Socket.io official docs - Rooms](https://socket.io/docs/v3/rooms/) — verified 2024
- [Socket.io official docs - Testing](https://socket.io/docs/v4/testing/) — verified 2024
- [Zustand GitHub - TypeScript guide](https://github.com/pmndrs/zustand) — verified 2024
- [Docker Multi-Stage Build Best Practices](https://oneuptime.com/blog/post/2026-02-20-docker-multi-stage-builds/view) — verified 2026-02

### Secondary (MEDIUM confidence)
- [Kamleshpaul.com - WebSocket in Next.js App Router](https://kamleshpaul.com/posts/how-to-use-websocket-in-nextjs-app-router-with-socketio) — verified 2024-12
- [Medium - Real-time Chat with Express + Socket.io + Next.js](https://d2ymvn.medium.com/building-a-real-time-chat-application-with-express-typescript-socket-io-next-js-and-tailwindcss-774f1ee6c9e2) — verified 2024-10
- [DEV Community - Docker Best Practices](https://dev.to/teguh_coding/stop-writing-bad-dockerfiles-production-ready-best-practices-that-actually-work-4419) — verified 2025
- [GeeksforGeeks - Chessboard in React](https://www.geeksforgeeks.org/create-a-chessboard-pattern-in-react-js/) — verified 2025

### Tertiary (LOW confidence — marked for validation)
- [LinkedIn - CSS Grid chessboard pattern](https://www.linkedin.com/posts/utsavmeena_build-a-chessboard-in-css-fast-and-easy-activity-7293272003434684416-gloh) — social post, verify with actual CSS Grid docs

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — user-specified stack with verified versions
- Architecture: HIGH — Socket.io separate server pattern is documented and stable
- Pitfalls: HIGH — documented issues are well-known with clear solutions
- Code Examples: MEDIUM — patterns verified, specific code is illustrative of the patterns

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (30 days — stable stack, no fast-moving dependencies)