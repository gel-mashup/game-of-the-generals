---
phase: 04
slug: ai-opponent
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (existing `server/jest.config.js`) |
| **Quick run command** | `cd server && npm test -- --testPathPattern=botAI -x` |
| **Full suite command** | `cd server && npm test` |
| **Estimated runtime** | ~5-10 seconds (botAI tests) |

---

## Sampling Rate

- **After every task commit:** `cd server && npm test -- --testPathPattern=botAI -x`
- **After every plan wave:** `cd server && npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | AI-03 | unit | `npm test -- --testPathPattern=botAI --testNamePattern="findBestMove\|alphaBeta\|makeMove\|unmakeMove" -x` | ❌ Wave 0 | ⬜ pending |
| 04-01-02 | 01 | 1 | AI-03 | unit | `npm test -- --testPathPattern=botAI --testNamePattern="evaluate\|terminal\|moveOrdering" -x` | ❌ Wave 0 | ⬜ pending |
| 04-01-03 | 01 | 1 | AI-03 | unit | `npm test -- --testPathPattern=botAI --testNamePattern="time\|depth" -x` | ❌ Wave 0 | ⬜ pending |
| 04-02-01 | 02 | 2 | AI-01, AI-02 | unit | `cd server && npx tsc --noEmit` | ✅ (compile check) | ⬜ pending |
| 04-02-02 | 02 | 2 | AI-03 | unit | `cd server && npx tsc --noEmit` | ✅ (compile check) | ⬜ pending |
| 04-03-01 | 03 | 2 | AI-04 | unit | `cd client && npx tsc --noEmit` | ✅ (compile check) | ⬜ pending |
| 04-03-02 | 03 | 2 | AI-04 | unit | `cd client && npx tsc --noEmit` | ✅ (compile check) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/botAI.test.ts` — Minimax search, alpha-beta, make/unmake, time limit, evaluation, terminal detection, move ordering (~30 tests)
- [ ] `server/tests/botEvaluation.test.ts` — Evaluation function with hidden piece handling (~10 tests)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bot thinking indicator appears during computation | AI-04 | Socket event + UI overlay | Start vs bot game, make a move as red, verify "Bot is thinking..." overlay appears on blue's turn |
| Bot thinking indicator hides after move | AI-04 | UI interaction | Watch bot's turn, verify overlay disappears within 1s after bot moves |
| Bot makes move within 3 seconds | AI-03 | Time measurement | Play vs bot, measure time from turn change to bot move, verify ≤ 3s |
| Bot plays blue vs human red | AI-01 | Full game integration | Create bot game, verify human is red, bot is blue |
| Bot auto-deploys | AI-02 | Bot integration | Start bot game, verify bot pieces auto-placed without clicking |
| Bot auto-confirms rematch | AI-02 | Bot integration | Play vs bot, game over, click Rematch, verify new game starts immediately |

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
