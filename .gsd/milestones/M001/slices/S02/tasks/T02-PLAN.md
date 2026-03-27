# T02: 02-game-core 02

**Slice:** S02 — **Milestone:** M001

## Description

Implement the server game handler: socket events for deployment (deploy-piece, auto-deploy, ready) and playing phases (make-move, turn management). Integrates with engine.ts from Plan 01.

## Must-Haves

- [ ] "deploy-piece event validates zone, updates board, broadcasts to all players"
- [ ] "auto-deploy event places all 21 pieces randomly in correct zones"
- [ ] "ready event tracks ready state; 3-second countdown starts when both ready"
- [ ] "deploy:complete transitions to playing phase with Red moving first"
- [ ] "make-move event validates turn/ownership/adjacency, executes move, resolves battle"
- [ ] "move:result broadcasts outcome to all players with updated board"

## Files

- `server/src/socket/handlers/gameHandler.ts`
- `server/src/socket/index.ts`
- `server/src/types/index.ts`
