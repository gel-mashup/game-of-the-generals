# T01: 08-fog-of-war 01

**Slice:** S08 — **Milestone:** M001

## Description

Implement fog-of-war: hide enemy piece ranks as "?" during gameplay, reveal only at game over.

Purpose: Players should not know enemy piece identities until the game ends — maintaining strategic mystery throughout play.

Output: Modified Piece.tsx (fog rendering on board) and BattleReveal.tsx (fog in battle overlay).

## Must-Haves

- [ ] "Enemy pieces display '?' instead of rank symbol during all phases (deploying, countdown, playing)"
- [ ] "Own pieces always display true rank symbol regardless of phase"
- [ ] "BattleReveal shows '?' for enemy piece during battle (never reveals rank)"
- [ ] "All pieces instantly show true ranks when gameStatus becomes 'finished'"

## Files

- `client/src/features/game/Piece.tsx`
- `client/src/features/game/BattleReveal.tsx`
