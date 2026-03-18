---
phase: 01
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest ^29.x (per PROJECT_SPECS.md) |
| **Config file** | `server/jest.config.js` |
| **Quick run command** | `cd server && npm test -- --testPathPattern=room` |
| **Full suite command** | `cd server && npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** `cd server && npm test -- --testPathPattern=room --passWithNoTests`
- **After every plan wave:** `cd server && npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | AUTH-01 | unit | `npm test -- --testPathPattern=room --testNamePattern="create"` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | AUTH-01 | unit | `npm test -- --testPathPattern=room --testNamePattern="code format"` | ❌ W0 | ⬜ pending |
| 01-02-01 | 01 | 2 | GS-01 | smoke | manual browser test | ❌ W0 | ⬜ pending |
| 01-02-02 | 01 | 2 | GS-02 | unit | `npm test -- --testPathPattern=pieces --testNamePattern="21 pieces"` | ❌ W0 | ⬜ pending |
| 01-03-01 | 02 | 1 | AUTH-02 | unit | `npm test -- --testPathPattern=room --testNamePattern="join"` | ❌ W0 | ⬜ pending |
| 01-03-02 | 02 | 1 | AUTH-03 | unit | `npm test -- --testPathPattern=room --testNamePattern="player"` | ❌ W0 | ⬜ pending |
| 01-04-01 | 02 | 2 | AUTH-04 | unit | `npm test -- --testPathPattern=room --testNamePattern="leave"` | ❌ W0 | ⬜ pending |
| 01-04-02 | 02 | 2 | GS-03, GS-04 | smoke | manual browser test | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/room.test.ts` — covers AUTH-01 through AUTH-04 (socket event handling)
- [ ] `server/tests/pieces.test.ts` — covers GS-02 (piece configuration)
- [ ] `server/jest.config.js` — Jest configuration for TypeScript + Socket.io
- [ ] `server/package.json` — add `jest`, `ts-jest`, `@types/jest` dev dependencies

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Board renders 9x8 grid | GS-01 | Visual verification of CSS Grid layout | Visit `/game/[roomId]`, open DevTools, inspect board grid element has 9 columns × 8 rows |
| Deployment zones visible | GS-03, GS-04 | Visual verification of zone overlays | Visit game page, verify red tint on rows 0-2, blue tint on rows 5-7 |

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
