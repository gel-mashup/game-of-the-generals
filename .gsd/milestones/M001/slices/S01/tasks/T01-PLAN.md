# T01: 01-foundation 01

**Slice:** S01 — **Milestone:** M001

## Description

Establish the complete project foundation: Docker Compose orchestration, Express + Socket.io server, Next.js client with Tailwind and Zustand, shared types, test infrastructure, and landing page.

Purpose: Creates the entire project scaffold from scratch. All subsequent features build on this infrastructure.
Output: Running monorepo with client on port 3000, server on port 3001, Socket.io connected, landing page rendered.

## Must-Haves

- [ ] "User sees landing page with Play vs Bot and Play Online buttons"
- [ ] "Docker Compose starts both client (port 3000) and server (port 3001)"
- [ ] "Socket.io server handles create-room, join-room, leave-room events"
- [ ] "Server generates 6-character alphanumeric room codes"
- [ ] "Server stores player display names in room state"
- [ ] "Client connects to Socket.io server via SocketProvider context"
- [ ] "Zustand stores manage game state (board, pieces) and room state (players)"

## Files

- `docker-compose.yml`
- `Dockerfile`
- `.dockerignore`
- `server/package.json`
- `client/package.json`
- `client/tsconfig.json`
- `client/tailwind.config.ts`
- `client/next.config.js`
- `client/src/app/page.tsx`
- `client/src/app/layout.tsx`
- `server/src/index.ts`
- `server/src/socket/index.ts`
- `server/src/socket/handlers/roomHandler.ts`
- `server/src/types/index.ts`
- `client/src/types/index.ts`
- `client/src/store/gameStore.ts`
- `client/src/store/roomStore.ts`
- `client/src/components/SocketProvider.tsx`
- `server/tests/room.test.ts`
- `server/tests/pieces.test.ts`
- `server/jest.config.js`
