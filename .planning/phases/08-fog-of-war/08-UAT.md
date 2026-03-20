---
status: complete
phase: 08-fog-of-war
source: 08-01-SUMMARY.md
started: 2026-03-20T15:54:00Z
updated: 2026-03-20T15:54:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Enemy Pieces Show Question Mark
expected: During gameplay (playing phase), enemy pieces display as "?" on the board instead of their rank symbols. The "?" should be fully opaque (not faded).
result: pass

### 2. Own Pieces Show Rank
expected: Your own pieces always display their correct rank symbols (5★, 4★, etc.) regardless of game phase.
result: pass

### 3. Fog During All Non-Finished Phases
expected: Enemy pieces show "?" during deployment phase, countdown, and playing phase. Fog only clears when the game ends.
result: pass

### 4. Battle Reveal Shows Fog
expected: When pieces battle, the BattleReveal overlay shows "?" for whichever piece belongs to the enemy (attacker or defender). The battle outcome still resolves correctly.
result: pass

### 5. All Pieces Reveal at Game Over
expected: When the game ends, all pieces on the board immediately show their true rank symbols (no more "?").
result: pass
note: "win modal hides board - user requests 'show board' button to view revealed pieces"

### 6. Rematch Reapplies Fog
expected: After a rematch starts, enemy pieces immediately show "?" again. No stale state from the previous game.
result: pass

## Summary

total: 6
passed: 6
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "When the game ends, user can view all revealed pieces on the board"
  status: failed
  reason: "User reported: win modal hides the board so cannot see revealed pieces. Requested 'show board' button in win modal."
  severity: minor
  test: 5
  artifacts: []
  missing: []
