---
phase: 07
slug: side-by-side-layout-board-perspective-flip
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (from existing project setup) |
| **Config file** | client/vite.config.ts |
| **Quick run command** | `cd client && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd client && npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `grep` verification on modified files (CSS classes, layout structure)
- **After every plan wave:** Run manual visual verification
- **Before `/gsd-verify-work`:** Manual UI verification required
- **Max feedback latency:** 5 seconds (grep-based) / manual (visual)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | LAYOUT-01 | grep | `grep -q "md:flex-row" client/src/app/game/[roomId]/page.tsx` | ✅ | ⬜ pending |
| 07-01-01 | 01 | 1 | LAYOUT-02 | grep | `grep -q "flex-col" client/src/app/game/[roomId]/page.tsx` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | LAYOUT-03 | grep | `grep -q "rotate(180deg)" client/src/features/game/Board.tsx` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | PALETTE-01 | grep | `grep -q "flex-col" client/src/features/game/PiecePalette.tsx` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | PALETTE-02 | grep | `grep -q "Generals\|Officers\|Special\|Privates" client/src/features/game/PiecePalette.tsx` | ✅ | ⬜ pending |
| 07-01-03 | 01 | 1 | LAYOUT-04 | grep | `grep -q "deploying" client/src/app/game/[roomId]/page.tsx` | ✅ | ⬜ pending |
| 07-01-03 | 01 | 1 | LAYOUT-05 | manual | Manual: overlay positioning check | - | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- No automated test framework setup needed — existing vitest covers structure
- All requirements are visual layout changes — manual verification is appropriate

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Board flip works visually | LAYOUT-03 | CSS transform effect requires visual check | Start game as Red, verify board flip, verify text readable (counter-rotation) |
| Sidebar glass-morphism | LAYOUT-01 | Visual effect check | Verify sidebar overlay with blur and navy tint |
| Sidebar hide/show | LAYOUT-04 | Animation timing requires visual check | Deploy → playing phase transition, sidebar slides out |
| Mobile stacked layout | LAYOUT-02 | Responsive breakpoint requires resize | Resize below 768px, verify stack layout |
| Palette vertical grouping | PALETTE-01, PALETTE-02 | Visual layout check | Verify grouped by tier with headers |
| Overlay positioning | LAYOUT-05 | Position depends on container structure | Test DeploymentZone, BattleReveal, WinModal in new layout |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

*Generated: 2026-03-20*
*Phase: 07-side-by-side-layout-board-perspective-flip*