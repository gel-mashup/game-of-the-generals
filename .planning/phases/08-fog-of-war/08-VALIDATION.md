---
phase: 08
slug: fog-of-war
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (ts-jest) — server-side only |
| **Config file** | `server/jest.config.js` |
| **Quick run command** | `cd server && npx jest --testPathPattern=fog -x` |
| **Full suite command** | `cd server && npx jest` |
| **Estimated runtime** | ~5 seconds |

**Note:** No client-side test framework exists (no jest.config/vitest.config in client/). UI verification relies on manual gameplay testing for this pure-UI phase.

---

## Sampling Rate

- **After every task commit:** Manual visual verification — check fog rendering in browser
- **After every plan wave:** Manual gameplay test — verify all FOGWAR behaviors
- **Before `/gsd-verify-work`:** Full server suite + manual UI verification
- **Max feedback latency:** N/A (manual verification)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | FOGWAR-01 | manual | Manual gameplay test | N/A | ⬜ pending |
| 08-01-01 | 01 | 1 | FOGWAR-02 | manual | Manual gameplay test | N/A | ⬜ pending |
| 08-01-01 | 01 | 1 | FOGWAR-03 | manual | Manual gameplay test | N/A | ⬜ pending |
| 08-01-01 | 01 | 1 | FOGWAR-04 | manual | Manual gameplay test | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No client-side test framework configured. This is a pure UI phase with simple conditional rendering — manual verification via gameplay testing is acceptable.

*Existing infrastructure (server Jest) covers game logic but not UI rendering. Manual gameplay testing is the primary validation method for FOGWAR-01 through FOGWAR-04.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Enemy pieces display "?" | FOGWAR-01 | No client test framework | Start game, deploy all, verify enemy pieces show "?" not rank symbols |
| Own pieces show rank | FOGWAR-02 | No client test framework | Start game, verify own pieces show rank symbols normally |
| Enemy shows "?" during BattleReveal | FOGWAR-03 | No client test framework | Attack enemy piece, verify BattleReveal shows "?" not rank |
| All pieces reveal on game-over | FOGWAR-04 | No client test framework | Win/lose game, verify all pieces switch to true rank symbols |

---

## Validation Sign-Off

- [ ] All tasks have manual verification steps documented
- [ ] Sampling continuity: manual checks after each plan wave
- [ ] Wave 0: N/A — no client test infrastructure (manual testing used)
- [ ] No watch-mode flags
- [ ] Feedback latency: manual (browser testing)
- [ ] `nyquist_compliant: true` set in frontmatter (manual verification only)

**Approval:** pending