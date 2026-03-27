# T01: 02-game-core 01

**Slice:** S02 — **Milestone:** M001

## Description

Implement the server-side game engine: pure functions for deployment validation, move validation, battle resolution, and auto-deploy randomization. This is the foundation all game logic depends on — unit-testable, no side effects.

## Must-Haves

- [ ] "Deployment zone validation prevents pieces outside rows 0-2 (red) or 5-7 (blue)"
- [ ] "Auto-deploy places exactly 21 pieces per player in correct zones"
- [ ] "Valid moves are orthogonal-adjacent squares within board bounds"
- [ ] "Own-piece squares are never valid move destinations"
- [ ] "Flag capture ends battle with attacker winning"
- [ ] "Higher rank wins; equal rank eliminates both pieces"
- [ ] "Spy beats officers (rank ≥ 0); Private beats Spy"

## Files

- `server/src/game/engine.ts`
- `server/src/game/engine.test.ts`
- `server/src/types/index.ts`
