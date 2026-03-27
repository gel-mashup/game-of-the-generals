# T01: 03-game-flow 03-01

**Slice:** S03 — **Milestone:** M001

## Description

Implement server-side win condition detection and game-over/flow handlers. Server checks three win conditions after every move, emits game:over with winner+reason, tracks session scores, and handles rematch/reset-scores socket events.

## Must-Haves

- [ ] "Server detects flag capture after every move"
- [ ] "Server detects flag at opposite baseline with no adjacent enemies"
- [ ] "Server detects when a player has no valid moves"
- [ ] "Server emits game:over with winner and reason when game ends"
- [ ] "Server tracks session scores across rematches"
- [ ] "Both players can confirm rematch with 30s timeout"
- [ ] "Host can reset session scores"

## Files

- `server/src/game/engine.ts`
- `server/tests/engine.test.ts`
- `server/src/socket/handlers/gameHandler.ts`
- `server/src/socket/handlers/rematchHandler.ts`
- `server/src/socket/index.ts`
