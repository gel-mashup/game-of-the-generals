---
phase: 02
slug: game-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest |
| **Config file** | `server/jest.config.js` |
| **Quick run command** | `cd server && npm test -- --testPathPattern="engine" -x` |
| **Full suite command** | `cd server && npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd server && npm test -- --testPathPattern="engine" -x`
- **After every plan wave:** Run `cd server && npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DEP-01, DEP-02 | unit | `npm test -- engine.test.ts::validates deployment zone` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DEP-03 | unit | `npm test -- engine.test.ts::auto-deploy places 21 pieces` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | GAME-07, GAME-08, GAME-09, GAME-10 | unit | `npm test -- engine.test.ts::resolveBattle` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | GAME-04, GAME-05 | unit | `npm test -- engine.test.ts::validates move` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | DEP-01, DEP-04 | integration | `npm test -- gameHandler.test.ts::deploys pieces` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | DEP-04, DEP-05 | integration | `npm test -- gameHandler.test.ts::ready and countdown` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 2 | GAME-01, GAME-02, GAME-03 | integration | `npm test -- gameHandler.test.ts::selects and moves piece` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 2 | GAME-06, GAME-07 | integration | `npm test -- gameHandler.test.ts::triggers battle` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | GAME-03 | e2e | Browser test: valid moves highlighted | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 3 | GAME-07, GAME-08, GAME-09 | e2e | Browser test: battle outcome displayed | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/src/game/engine.ts` — stubs for battle resolution, move validation, deployment validation, auto-deploy
- [ ] `server/src/game/engine.test.ts` — unit tests for all game logic
- [ ] `server/src/socket/handlers/gameHandler.test.ts` — socket integration tests
- [ ] `server/src/types/index.ts` — extend Room type with deployedPieces, readyPlayers
- [ ] `server/jest.config.js` — Jest configuration (if not exists)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Turn indicator (3-part system) | GAME-02 | Visual feedback, timing | Click own piece, verify header text + side glow + board tint |
| Battle reveal animation | GAME-07 | Visual/CSS animation | Move to enemy piece, verify pieces slide, reveal, apply result |
| Equal rank explosion effect | GAME-07 | Visual effect | Move equal-rank pieces into each other, verify explosion particles |
| Countdown display | DEP-05 | Timing-sensitive | Both players ready, verify "3... 2... 1..." text appears |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

