# S02: Game Core

**Goal:** Implement the server-side game engine: pure functions for deployment validation, move validation, battle resolution, and auto-deploy randomization.
**Demo:** Implement the server-side game engine: pure functions for deployment validation, move validation, battle resolution, and auto-deploy randomization.

## Must-Haves


## Tasks

- [x] **T01: 02-game-core 01** `est:10min`
  - Implement the server-side game engine: pure functions for deployment validation, move validation, battle resolution, and auto-deploy randomization. This is the foundation all game logic depends on — unit-testable, no side effects.
- [x] **T02: 02-game-core 02** `est:3min`
  - Implement the server game handler: socket events for deployment (deploy-piece, auto-deploy, ready) and playing phases (make-move, turn management). Integrates with engine.ts from Plan 01.
- [x] **T03: 02-game-core 03** `est:6 min`
  - Implement all client-side game features: extended gameStore, updated Board/Piece components, BattleReveal animation, and game page with Auto-Deploy/Ready buttons and playing-phase handlers. Human verification at end.
- [x] **T04: 02-game-core 04** `est:1min`
  - Fix the missing `deploy-piece` socket emission in the game page. After calling `deployPiece()` locally for optimistic UI update, emit `socket.emit('deploy-piece', { pieceId, row, col })` to sync with server. This resolves DEP-01 and DEP-04 being blocked.
- [x] **T05: 02-game-core 05** `est:8min`
  - Fix the incomplete battleOutcome payload so BattleReveal renders attacker and defender pieces correctly. The server must include attacker and defender pieces in the move:result payload, and the client must transform it into the client's BattleOutcome type.
- [x] **T06: 02-game-core 06** `est:2min`
  - Remove the dead code block (lines 102-117) in handleCellClick that duplicates playing-phase logic without the `gameStatus === 'playing'` guard. This code runs unconditionally after the playing phase block closes and references potentially stale state.

## Files Likely Touched

- `server/src/game/engine.ts`
- `server/src/game/engine.test.ts`
- `server/src/types/index.ts`
- `server/src/socket/handlers/gameHandler.ts`
- `server/src/socket/index.ts`
- `server/src/types/index.ts`
- `client/src/store/gameStore.ts`
- `client/src/features/game/Board.tsx`
- `client/src/features/game/Piece.tsx`
- `client/src/features/game/PiecePalette.tsx`
- `client/src/app/game/[roomId]/page.tsx`
- `client/src/features/game/BattleReveal.tsx`
- `client/src/app/game/[roomId]/page.tsx`
- `server/src/socket/handlers/gameHandler.ts`
- `server/src/types/index.ts`
- `client/src/store/gameStore.ts`
- `client/src/app/game/[roomId]/page.tsx`
- `client/src/app/game/[roomId]/page.tsx`
