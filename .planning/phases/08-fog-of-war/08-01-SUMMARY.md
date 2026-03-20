---
phase: 08-fog-of-war
plan: 01
subsystem: ui
tags: [fog-of-war, zustand, react, typescript, game-ui]

# Dependency graph
requires:
  - phase: 07-side-by-side-layout-board-perspective-flip
    provides: Board perspective flip, Piece component with opacity-60, gameStore with gameStatus field, roomStore with playerSide field
provides:
  - Fog-of-war rendering on board pieces (enemy pieces show "?" instead of rank)
  - Fog-aware battle overlay (BattleReveal shows "?" for enemy pieces)
  - Automatic rank reveal on game-over via derived state
  - Rematch fog re-application via gameStatus reset
affects: [game-ui, game-flow, battle-system]

# Tech tracking
tech-stack:
  added: []
  patterns: [Derived state for fog rendering — no store mutations needed, auto-resets on game state transitions]

key-files:
  created: []
  modified:
    - client/src/features/game/Piece.tsx
    - client/src/features/game/BattleReveal.tsx

key-decisions:
  - "Derived fog state: isFogged = piece.owner !== playerSide && gameStatus !== 'finished' — no store mutations, auto-resets on rematch"
  - "Fog applies during all phases: deploying, countdown, playing — only clears when gameStatus === 'finished'"
  - "Fogged pieces are fully opaque — removed opacity-60 per user decision"
  - "BattleReveal fogs both attacker and defender — whichever piece belongs to enemy shows '?'"

patterns-established:
  - "Pattern: Use Zustand store-derived booleans for UI state — eliminates cleanup bugs on rematch"
  - "Pattern: Fog symbol '?' consistent across board and overlay — same visual treatment everywhere"

requirements-completed: [FOGWAR-01, FOGWAR-02, FOGWAR-03, FOGWAR-04]

# Metrics
duration: 2 min
completed: 2026-03-20
---

# Phase 8 Plan 1: Fog-of-War Rendering Summary

**Fog-of-war: enemy pieces show "?" on board and in battles, own pieces always show ranks, all pieces reveal at game-over via derived state**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T07:35:59Z
- **Completed:** 2026-03-20T07:38:32Z
- **Tasks:** 2 (Task 3 is human-verify checkpoint, auto-approved via auto_advance)
- **Files modified:** 2

## Accomplishments
- Enemy pieces render as "?" on the board during all non-finished game phases
- Own pieces always show true rank symbols regardless of phase
- BattleReveal overlay shows "?" for whichever piece belongs to the enemy (attacker or defender)
- All pieces instantly reveal true ranks when game ends (gameStatus === 'finished')
- Rematch re-applies fog automatically via derived state (gameStatus reset to 'deploying')

## Task Commits

Each task was committed atomically:

1. **Task 1: Add fog-of-war rendering to Piece.tsx** - `99d34cc` (feat)
2. **Task 2: Add fog to BattleReveal overlay** - `5c14f31` (feat)

**Plan metadata:** `docs(08-01): complete fog-of-war plan 1`

## Files Created/Modified
- `client/src/features/game/Piece.tsx` - Added fog-of-war: derives isFogged from piece.owner !== playerSide && gameStatus !== 'finished', renders "?" for enemy pieces, removed opacity-60
- `client/src/features/game/BattleReveal.tsx` - Added fog to battle overlay: attacker and defender symbols fogged when owner !== playerSide, battle label text also fogged

## Decisions Made
- Derived fog state approach chosen over store mutations — stateless, auto-resets on rematch via resetForRematch() resetting gameStatus
- Fog applies during all phases (deploying, countdown, playing) per 08-CONTEXT.md decisions
- Opacity-60 removed — fogged pieces are fully opaque per user decision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Fog-of-war implementation complete across both board and battle overlay
- Phase 8 plan 1 fully functional — ready for any remaining Phase 8 plans

---

*Phase: 08-fog-of-war*
*Completed: 2026-03-20*
