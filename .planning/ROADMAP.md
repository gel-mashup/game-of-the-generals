# Roadmap: Game of the Generals

**Created:** 2026-03-18

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-20)
- 🚧 **v1.1 UI Redesign** — Phases 7-8 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-20</summary>

- [x] Phase 1: Foundation (2/2 plans) — completed 2026-03-18
- [x] Phase 2: Game Core (6/6 plans) — completed 2026-03-18
- [x] Phase 3: Game Flow (4/4 plans) — completed 2026-03-19
- [x] Phase 4: AI Opponent (4/4 plans) — completed 2026-03-19
- [x] Phase 5: Dockerize (1/1 plan) — completed 2026-03-19
- [x] Phase 6: Debug Game Flow (1/1 plan) — completed 2026-03-19

**18 plans, 34 requirements — all complete.** Full archive: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

### 🚧 v1.1 UI Redesign (In Progress)

**Milestone Goal:** Modernize the board layout and enforce fog-of-war by hiding enemy piece identities.

- [x] **Phase 7: Side-by-Side Layout + Board Perspective Flip** - Restructure UI to board-left/sidebar-right, flip board so player deploys at bottom, restyle piece palette
- [x] **Phase 8: Fog-of-War** - Hide enemy piece identities during gameplay, reveal on battle and game over (completed 2026-03-20)

## Phase Details

### Phase 7: Side-by-Side Layout + Board Perspective Flip
**Goal**: Board displays on left with deployment panel as sidebar overlay on right; player always sees their deployment zone at the bottom; piece palette renders as categorized vertical list in sidebar
**Depends on**: Nothing (first v1.1 phase)
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, LAYOUT-05, PALETTE-01, PALETTE-02
**Success Criteria** (what must be TRUE):
  1. User sees board on left and deployment panel on right on desktop (>= 768px), stacked vertically on mobile
  2. User always sees their deployment zone at the bottom of the board regardless of player color
  3. Deployment sidebar is visible during deployment phase and hidden during playing phase
  4. All overlays (DeploymentZone, BattleReveal, WinModal, bot thinking) remain correctly positioned in the new layout
  5. Piece palette displays as a vertical list grouped by rank tier (Generals, Officers, Special, Privates) in the sidebar
**Plans**: 3 plans in 3 waves

Plans:
- [x] 07-01: Layout restructure + sidebar component (Wave 1)
- [x] 07-02: Piece palette vertical layout + color scheme (Wave 2)
- [x] 07-03: Board perspective flip + overlay verification (Wave 3)

### Phase 8: Fog-of-War
**Goal**: Enemy piece identities are hidden during gameplay, revealed only on battle or game over
**Depends on**: Phase 7
**Requirements**: FOGWAR-01, FOGWAR-02, FOGWAR-03, FOGWAR-04
**Success Criteria** (what must be TRUE):
  1. User sees enemy pieces displayed as "?" during the playing phase instead of rank symbols
  2. User always sees their own pieces with correct rank symbols
  3. User sees actual enemy piece ranks revealed during BattleReveal when pieces engage in combat
  4. User sees all pieces revealed with true ranks when the game ends
**Plans**: 1 plan in 1 wave

Plans:
- [ ] 08-01: Fog-of-war rendering + battle overlay fog + verification (Wave 1)

## Progress

**Execution Order:**
Phases execute in numeric order: 7 → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 7. Side-by-Side Layout + Board Perspective Flip | v1.1 | 3/3 | Complete | 2026-03-20 |
| 8. Fog-of-War | 1/1 | Complete   | 2026-03-20 | - |

---

*Last updated: 2026-03-20*
