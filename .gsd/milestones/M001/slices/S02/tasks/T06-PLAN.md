# T06: 02-game-core 06

**Slice:** S02 — **Milestone:** M001

## Description

Remove the dead code block (lines 102-117) in handleCellClick that duplicates playing-phase logic without the `gameStatus === 'playing'` guard. This code runs unconditionally after the playing phase block closes and references potentially stale state.

## Must-Haves

- [ ] "Dead code block removed from handleCellClick"
- [ ] "No duplicate playing-phase logic outside gameStatus === 'playing' guard"

## Files

- `client/src/app/game/[roomId]/page.tsx`
