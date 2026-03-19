# Roadmap: Game of the Generals

**Created:** 2026-03-18
**Granularity:** Coarse (4 phases)
**Mode:** YOLO

---

## Phase Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|-------------|------------------|
| 1 | Foundation | Room system, landing page, board setup | AUTH-01, AUTH-02, AUTH-03, AUTH-04, GS-01, GS-02, GS-03, GS-04 | 8/8 ✓ |
| 2 | Game Core | Deployment, movement, battle resolution | DEP-01, DEP-02, DEP-03, DEP-04, DEP-05, GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-06, GAME-07, GAME-08, GAME-09, GAME-10 | 3/15 ✓ |
| 3 | Game Flow | Win conditions, scores, rematch | WIN-01, WIN-02, WIN-03, WIN-04, SES-01, SES-02, SES-03 | 0/7 |
| 4 | AI Opponent | Minimax bot integration | AI-01, AI-02, AI-03, AI-04 | 0/4 |

---

## Phase 1: Foundation

**Goal:** Room system, landing page, basic board setup

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, GS-01, GS-02, GS-03, GS-04

**Plans:** 2 plans

**Plan List:**
- [x] 01-01-PLAN.md — Project scaffold, Socket.io server, Zustand stores, landing page ✓ (2026-03-18)
- [x] 01-02-PLAN.md — Game board UI, pieces, deployment zones, lobby completion ✓ (2026-03-18)

**Success Criteria:**
1. Landing page shows "Play vs Bot" and "Play Online" buttons ✓
2. Room creation generates 6-character alphanumeric code ✓
3. Players can join rooms using room code ✓
4. Players can set and see display names ✓
5. Players can leave rooms ✓
6. Board renders 9x8 grid correctly ✓
7. Each player has 21 pieces with correct ranks ✓
8. Deployment zones visible and enforced (rows 0-2 for Red, 5-7 for Blue) ✓

**Status:** ✓ Complete (2026-03-18)

**Tasks:**
- [x] Setup Docker Compose with client/server
- [x] Landing page with mode selection
- [x] Lobby page with create/join room UI
- [x] Socket.io room management (create, join, leave)
- [x] Board component rendering 9x8 grid
- [x] Piece component with rank display
- [x] Deployment zone rendering
- [x] Piece palette for deployment phase

---

## Phase 2: Game Core

**Goal:** Deployment phase, movement, battle resolution

**Requirements:** DEP-01, DEP-02, DEP-03, DEP-04, DEP-05, GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-06, GAME-07, GAME-08, GAME-09, GAME-10

**Plans:** 6 plans in 3 waves

**Plan List:**
- [x] 02-01-PLAN.md — Server game engine (pure functions, unit tests) ✓ (2026-03-18)
- [x] 02-02-PLAN.md — Server game handler (socket events, bot integration) ✓ (2026-03-18)
- [x] 02-03-PLAN.md — Client game features (store, components, battle reveal) ✓ (2026-03-19)
- [x] 02-04-PLAN.md — Fix deploy-piece socket emission (gap closure) ✓ (2026-03-18)
- [x] 02-05-PLAN.md — Fix battleOutcome payload with attacker/defender pieces (gap closure) ✓ (2026-03-18)
- [x] 02-06-PLAN.md — Remove dead code block in handleCellClick (gap closure) ✓ (2026-03-18)

**Success Criteria:**
1. Users can place pieces by clicking piece then board square
2. Invalid squares (wrong zone, occupied) reject placement
3. Auto-deploy randomizes placement
4. Ready button works; both ready starts game
5. Red moves first
6. Clicking own piece highlights it
7. Valid moves shown on board
8. Clicking valid square moves piece
9. Cannot move to own piece squares
10. Moving to enemy square triggers battle
11. Higher rank wins; equal = both eliminated
12. Spy defeats officers (rank 0+)
13. Private defeats Spy
14. Any piece can capture Flag
15. Battle results displayed before state updates

**Tasks:**
- [x] Piece placement validation (Plan 01)
- [x] Ready state management (Plan 02)
- [x] Turn management (Red starts) (Plan 02)
- [x] Piece selection UI (Plan 03)
- [x] Valid move highlighting (Plan 03)
- [x] Move execution handler (Plan 02)
- [x] Server-side move validation (Plan 01)
- [x] Battle resolution logic (Plan 01)
- [x] Piece comparison (rank rules) (Plan 01)
- [x] State broadcast after actions (Plan 02)

**Status:** ✓ Complete (2026-03-18) — All 6 plans executed, all gap closures done

---

## Phase 3: Game Flow

**Goal:** Win conditions, session scores, rematch

**Requirements:** WIN-01, WIN-02, WIN-03, WIN-04, SES-01, SES-02, SES-03

**Success Criteria:**
1. Game ends when flag captured — winner announced
2. Game ends when flag reaches opposite baseline (no adjacent enemies)
3. Game ends when player has no valid moves
4. Win reason displayed (flag captured/baseline/no moves)
5. Session scores track wins/losses/draws
6. Rematch request works for both players
7. Host can reset session scores

**Tasks:**
- [ ] Flag capture detection
- [ ] Baseline reach detection (no adjacent enemies)
- [ ] No valid moves detection
- [ ] Game over state broadcast
- [ ] Winner announcement UI
- [ ] Score tracking (wins/losses/draws)
- [ ] Rematch flow (both players confirm)
- [ ] Score reset by host

**Plans:** 4 plans in 1 wave

**Plan List:**
- [x] 03-01-PLAN.md — Server win engine + game:over + rematch handlers ✓ (2026-03-19)
- [x] 03-02-PLAN.md — Client stores + WinModal component ✓ (2026-03-19)
- [x] 03-03-PLAN.md — Game page integration (score display, WinModal, rematch wiring) ✓ (2026-03-19)
- [ ] 03-04-PLAN.md — Fix rematch prompt + host reset scores (gap closure)

---

## Phase 4: AI Opponent

**Goal:** AI opponent using Minimax algorithm with alpha-beta pruning

**Requirements:** AI-01, AI-02, AI-03, AI-04

**Plans:** 3 plans in 2 waves

**Plan List:**
- [ ] 04-ai-opponent-01-PLAN.md — Bot AI Core (TDD: Minimax, alpha-beta, evaluation)
- [ ] 04-ai-opponent-02-PLAN.md — Bot Handler Integration (server-side bot wiring)
- [ ] 04-ai-opponent-03-PLAN.md — Bot Thinking Indicator (client-side UI)

**Success Criteria:**
1. User can start game with AI opponent (lobby already has bot mode)
2. AI makes valid moves using Minimax + alpha-beta (depth 1→3)
3. AI responds within 3 seconds (iterative deepening)
4. "Bot is thinking" indicator shown during AI turn

**Tasks:**
- [ ] Bot mode option in lobby
- [ ] Minimax algorithm implementation
- [ ] Alpha-beta pruning optimization
- [ ] Move ordering (captures first)
- [ ] Evaluation function (piece count, position, mobility)
- [ ] AI move execution with time limit
- [ ] Bot thinking UI indicator
- [ ] Bot integration with game flow

---

## Milestone Criteria

| Milestone | Phase | Criteria |
|-----------|-------|----------|
| MVP | Phase 3 | Two humans can play complete game |
| AI Mode | Phase 4 | Human vs AI playable |

---

*Roadmap created: 2026-03-18*
*Last updated: 2026-03-18*
