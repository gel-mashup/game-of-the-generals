# T03: 02-game-core 03

**Slice:** S02 — **Milestone:** M001

## Description

Implement all client-side game features: extended gameStore, updated Board/Piece components, BattleReveal animation, and game page with Auto-Deploy/Ready buttons and playing-phase handlers. Human verification at end.

## Must-Haves

- [ ] "Deployment: clicking board square places selected palette piece after server validation"
- [ ] "Auto-Deploy button places all 21 pieces instantly, can re-randomize"
- [ ] "Ready button enabled when 21 pieces placed; countdown starts when both ready"
- [ ] "Playing phase: clicking own piece shows gold border selection"
- [ ] "Valid moves highlighted green when piece selected"
- [ ] "Battle reveal animation plays inline (~1s) showing attacker vs defender"

## Files

- `client/src/store/gameStore.ts`
- `client/src/features/game/Board.tsx`
- `client/src/features/game/Piece.tsx`
- `client/src/features/game/PiecePalette.tsx`
- `client/src/app/game/[roomId]/page.tsx`
- `client/src/features/game/BattleReveal.tsx`
