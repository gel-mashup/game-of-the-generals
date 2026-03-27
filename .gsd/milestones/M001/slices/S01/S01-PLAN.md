# S01: Foundation

**Goal:** Establish the complete project foundation: Docker Compose orchestration, Express + Socket.
**Demo:** Establish the complete project foundation: Docker Compose orchestration, Express + Socket.

## Must-Haves


## Tasks

- [x] **T01: 01-foundation 01**
  - Establish the complete project foundation: Docker Compose orchestration, Express + Socket.io server, Next.js client with Tailwind and Zustand, shared types, test infrastructure, and landing page.

Purpose: Creates the entire project scaffold from scratch. All subsequent features build on this infrastructure.
Output: Running monorepo with client on port 3000, server on port 3001, Socket.io connected, landing page rendered.
- [x] **T02: 01-foundation 02**
  - Implement the complete game board UI: 9x8 CSS Grid, piece rendering with rank display, piece palette for deployment, and deployment zone visualization. Complete lobby functionality with leave room. Human verification of visual components.

Purpose: Delivers the complete Phase 1 UI with board rendering, piece display, and deployment zones per GS-01 through GS-04.
Output: Playable lobby flow (create/join/leave) and visible game board with pieces and deployment zones.

## Files Likely Touched

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
- `client/src/features/game/Board.tsx`
- `client/src/features/game/Piece.tsx`
- `client/src/features/game/PiecePalette.tsx`
- `client/src/features/game/DeploymentZone.tsx`
- `client/src/app/game/[roomId]/page.tsx`
- `client/src/app/lobby/page.tsx`
- `server/src/socket/handlers/roomHandler.ts`
