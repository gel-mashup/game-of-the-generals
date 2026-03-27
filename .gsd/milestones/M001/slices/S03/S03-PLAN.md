# S03: Game Flow

**Goal:** Implement server-side win condition detection and game-over/flow handlers.
**Demo:** Implement server-side win condition detection and game-over/flow handlers.

## Must-Haves


## Tasks

- [x] **T01: 03-game-flow 03-01** `est:29 min`
  - Implement server-side win condition detection and game-over/flow handlers. Server checks three win conditions after every move, emits game:over with winner+reason, tracks session scores, and handles rematch/reset-scores socket events.
- [x] **T02: 03-game-flow 03-02** `est:2min`
  - Extend client Zustand stores with win/scores/rematch state, and create the WinModal overlay component. These are the building blocks for Phase 03's client-side features.
- [x] **T03: 03-game-flow 03-03** `est:2min`
  - Wire WinModal, score display, and rematch socket handlers into the game page. Scores are always visible in the header, WinModal appears on game over, and rematch flow is fully connected to socket events.
- [x] **T04: 03-game-flow 04** `est:1.5min`
  - Close 2 gaps in the game page: (1) opponent rematch prompt not showing, and (2) host reset scores button missing.

## Files Likely Touched

- `server/src/game/engine.ts`
- `server/tests/engine.test.ts`
- `server/src/socket/handlers/gameHandler.ts`
- `server/src/socket/handlers/rematchHandler.ts`
- `server/src/socket/index.ts`
- `client/src/store/gameStore.ts`
- `client/src/store/roomStore.ts`
- `client/src/features/game/WinModal.tsx`
- `client/src/app/game/[roomId]/page.tsx`
- `client/src/app/game/[roomId]/page.tsx`
