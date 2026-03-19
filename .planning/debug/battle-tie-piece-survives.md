---
status: resolved
trigger: "Equal rank battle (tie) leaves attacker piece on board, player can attack again"
created: 2026-03-20T00:00:00Z
updated: 2026-03-20T00:00:00Z
---

## Resolution Summary
**Root Cause:** `applyMove` and `applyBotMove` in `server/src/game/engine.ts` unconditionally placed the attacker at the destination cell AFTER the captured-piece removal loop. On ties and defender wins, the attacker was re-placed on the board even though it should have been eliminated.

**Fix:** Added conditional guard — attacker is only placed at destination when `attackerWins === true` (or no battle). On ties (`attackerWins === null`) and defender wins (`attackerWins === false`), the attacker is NOT re-placed.

## Files Modified
- `server/src/game/engine.ts` — `applyMove` (line ~329), `applyBotMove` (line ~486)
- `server/tests/engine.test.ts` — Added 7 new tests for battle board state

## Verification
All 114 tests pass (107 existing + 7 new).
- `applyMove` tie test: both pieces null on board ✓
- `applyMove` defender-wins test: attacker gone, defender stays ✓
- `applyBotMove` tie test: both pieces null on board ✓
- `applyBotMove` defender-wins test: attacker gone, defender stays ✓
