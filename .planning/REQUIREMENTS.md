# Requirements: Game of the Generals

**Defined:** 2026-03-20
**Core Value:** A playable two-player strategy game capturing the traditional Filipino Game of the Generals experience in a modern web interface.

## v1.1 Requirements

Requirements for v1.1 UI Redesign. Each maps to roadmap phases.

### Layout

- [x] **LAYOUT-01**: Deployment panel renders as sidebar overlay on the right side of the board during deployment phase
- [x] **LAYOUT-02**: Layout stacks vertically on mobile (below 768px) — board on top, controls below
- [x] **LAYOUT-03**: Player always sees their deployment zone at the bottom of the board (board perspective flip)
- [x] **LAYOUT-04**: Deployment sidebar hidden during playing phase (only visible during deployment)
- [x] **LAYOUT-05**: All overlays (DeploymentZone, BattleReveal, WinModal, bot thinking) remain correctly positioned in new layout

### Fog-of-War

- [x] **FOGWAR-01**: Enemy pieces display "?" instead of rank symbol during playing phase
- [x] **FOGWAR-02**: Own pieces always show their rank symbol
- [x] **FOGWAR-03**: Enemy piece ranks revealed when pieces battle (BattleReveal shows actual ranks)
- [x] **FOGWAR-04**: All pieces revealed on game-over (winner decided)

### Piece Palette

- [x] **PALETTE-01**: PiecePalette renders as vertical list in side panel during deployment (not horizontal scroll)
- [x] **PALETTE-02**: Pieces grouped by rank tier (Generals, Officers, Special, Privates)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Polish

- **POLISH-01**: Row/column coordinate labels on board edges
- **POLISH-02**: Subtle rank indicator for pieces that won battles

### Previous v2 (carried forward)

- Piece movement animations
- Move history display
- Undo move (friendly games only)
- Chat during game
- Friend list

## Out of Scope

| Feature | Reason |
|---------|--------|
| Server-side piece filtering | Client-side hiding sufficient for casual play; server filtering is a v2 concern for competitive mode |
| Drag-and-drop deployment | Click-to-select is proven; drag adds unnecessary complexity |
| Animated piece movement | Deferred per original v2 backlog |
| Spectating | Not core to v1.1 goals |
| Mobile app | Web-first, PWA sufficient |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | Phase 7 | Complete |
| LAYOUT-02 | Phase 7 | Complete |
| LAYOUT-03 | Phase 7 | Complete |
| LAYOUT-04 | Phase 7 | Complete |
| LAYOUT-05 | Phase 7 | Complete |
| FOGWAR-01 | Phase 8 | Complete |
| FOGWAR-02 | Phase 8 | Complete |
| FOGWAR-03 | Phase 8 | Complete |
| FOGWAR-04 | Phase 8 | Complete |
| PALETTE-01 | Phase 7 | Complete |
| PALETTE-02 | Phase 7 | Complete |

**Coverage:**
- v1.1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓ (100% coverage)

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after initial definition*
