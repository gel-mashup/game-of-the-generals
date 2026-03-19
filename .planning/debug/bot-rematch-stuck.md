---
status: resolved
trigger: "Rematch vs bot gets stuck at 'waiting for opponent' — game never starts"
created: 2026-03-20T00:00:00Z
updated: 2026-03-20T00:00:00Z
---

## Resolution Summary
**Root Cause:** In `rematchHandler.ts` lines 86-93, the bot auto-deploy used a client round-trip (`bot:auto-deploy` → client re-emits `auto-deploy`). This routed through the human's socket, so `auto-deploy` in gameHandler.ts deployed the HUMAN's pieces instead of the bot's. After board reset, the bot had 0 pieces → could never be ready → game stuck at deploying.

**Fix:** Replaced client round-trip with direct server-side bot deployment (same pattern as roomHandler.ts initial game setup). Server generates bot positions, creates pieces, places them on board, and emits `piece:deployed` events directly.

## Files Modified
- `server/src/socket/handlers/rematchHandler.ts` — Lines 86-93 replaced with direct server-side bot deployment; added imports for `generateAutoDeploy` and `PIECE_CONFIG`

## Verification
- TypeScript compiles clean
- All 114 tests pass
