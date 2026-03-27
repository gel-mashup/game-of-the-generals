# T05: 02-game-core 05

**Slice:** S02 — **Milestone:** M001

## Description

Fix the incomplete battleOutcome payload so BattleReveal renders attacker and defender pieces correctly. The server must include attacker and defender pieces in the move:result payload, and the client must transform it into the client's BattleOutcome type.

## Must-Haves

- [ ] "BattleReveal displays attacker and defender pieces from battle outcome"
- [ ] "Battle reveal animation renders defined attacker and defender symbols"

## Files

- `server/src/socket/handlers/gameHandler.ts`
- `server/src/types/index.ts`
- `client/src/store/gameStore.ts`
- `client/src/app/game/[roomId]/page.tsx`
