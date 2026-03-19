---
phase: 03
slug: game-flow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x + ts-jest |
| **Config file** | `server/jest.config.js` |
| **Quick run command** | `cd server && npm test -- --testPathPattern="engine" --verbose` |
| **Full suite command** | `cd server && npm test --verbose` |
| **Estimated runtime** | ~10 seconds (engine tests ~52+ tests) |

---

## Sampling Rate

- **After every task commit:** Run `cd server && npm test -- --testPathPattern="engine" --verbose`
- **After every plan wave:** Run `cd server && npm test --verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | WIN-01, WIN-02, WIN-03 | unit | `npm test -- --testPathPattern="engine" --testNamePattern="checkFlagCapture\|checkFlagBaseline\|checkNoValidMoves" -x` | ✅ engine.test.ts | ⬜ pending |
| 03-01-02 | 01 | 1 | WIN-01, WIN-02, WIN-03 | unit | `npm test -- --testPathPattern="engine" --verbose` | ✅ engine.test.ts | ⬜ pending |
| 03-01-03 | 01 | 1 | WIN-04 | unit | `npm test -- --testPathPattern="engine" --verbose` | ✅ engine.test.ts | ⬜ pending |
| 03-01-04 | 01 | 1 | SES-02, SES-03 | unit | `cd server && npx tsc --noEmit` | ✅ rematchHandler.ts (new) | ⬜ pending |
| 03-02-01 | 02 | 1 | WIN-04, SES-01 | unit | `cd client && npx tsc --noEmit` | ✅ gameStore.ts (extended) | ⬜ pending |
| 03-02-02 | 02 | 1 | WIN-04, SES-01 | unit | `cd client && npx tsc --noEmit` | ✅ roomStore.ts (extended) | ⬜ pending |
| 03-02-03 | 02 | 1 | WIN-04 | unit | `cd client && npx tsc --noEmit` | ✅ WinModal.tsx (new) | ⬜ pending |
| 03-03-01 | 03 | 2 | WIN-04, SES-01, SES-02 | unit | `cd client && npx tsc --noEmit` | ✅ page.tsx (wired) | ⬜ pending |
| 03-03-02 | 03 | 2 | WIN-04, SES-01, SES-02 | unit | `cd client && npx tsc --noEmit` | ✅ page.tsx (UI) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/game-over.test.ts` — integration tests for game:over emission, scores update, rematch handler (SES-02, SES-03)
- [ ] `client/src/store/__tests__/gameStore.test.ts` — gameStore win state and resetForRematch tests
- [ ] `client/src/store/__tests__/roomStore.test.ts` — roomStore scores and rematch state tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WinModal overlay renders on game over | WIN-04 | Requires full browser render | Load game page, trigger game over, verify modal appears with winner+reason+scores |
| Score display in header during gameplay | SES-01 | Header display | Load game page during playing phase, verify scores visible |
| Rematch mutual confirm flow | SES-02 | Socket.io state machine | Two players: one clicks Rematch, other sees prompt, both confirm, new game starts |
| Rematch timeout at 30s | SES-02 | Timer-based | Click Rematch, wait 31s, verify prompt clears |
| Scores persist across rematch | SES-01 | Multi-game session | Play game, rematch, play again, verify scores accumulate |
| Host-only reset-scores | SES-03 | Auth guard | Non-host sends reset-scores, verify error; host sends, verify success |
| Board freezes on game over | WIN-04 | UI interaction | Trigger game over, verify no piece selection or valid move highlights |
| All pieces revealed on game over | WIN-04 | Board state | Trigger game over, verify no pieces show as hidden |
| Bot game rematch auto-confirm | SES-02 | Bot integration | Play vs bot, game over, click Rematch, verify new game starts immediately |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

