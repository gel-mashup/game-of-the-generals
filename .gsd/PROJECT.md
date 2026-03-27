# Game of the Generals

## What This Is

A real-time multiplayer web-based strategy board game (Salpakan) where two players deploy 21 pieces on a 9x8 board, maneuver to capture the opponent's flag or reach the opposite baseline. Features online multiplayer and AI opponent using Minimax with alpha-beta pruning. Docker-deployable.

## Core Value

A playable two-player strategy game capturing the traditional Filipino Game of the Generals experience in a modern web interface.

## Current Milestone: v1.1 UI Redesign

**Goal:** Modernize the board layout and enforce fog-of-war by hiding enemy piece identities.

**Target features:**
- Deployment sidebar overlay on right side of board (visible during deployment, hidden during play)
- Swap player/bot positions: player deploys at bottom, bot on top
- Hide enemy pieces during gameplay (display "?" instead of rank symbols)

## Requirements

### Validated (v1.0)

- ✓ Room system with 6-character codes — v1.0
- ✓ 9x8 board with deployment zones — v1.0
- ✓ 21 pieces per player with ranked combat (spy > officers, private > spy) — v1.0
- ✓ Piece deployment with auto-deploy — v1.0
- ✓ Turn-based movement with orthogonal moves — v1.0
- ✓ Battle resolution with rank hierarchy — v1.0
- ✓ Win conditions (flag capture, baseline reach, no valid moves) — v1.0
- ✓ AI opponent (Minimax, depth 3, 3s timeout) — v1.0
- ✓ Session scores with rematch — v1.0
- ✓ Docker deployment — v1.0

### Active (v1.1)

- [ ] Board layout redesigned to side-by-side (board left, deployment panel right)
- [ ] Player deployment zone at bottom (rows 5-7), bot at top (rows 0-2)
- [ ] Enemy pieces hidden during gameplay (shown as "?" question marks)

### Deferred (v2)

- Piece movement animations
- Move history display
- Undo move (friendly games only)
- Chat during game
- Friend list

### Out of Scope

- Mobile app — web-first approach, PWA sufficient
- OAuth — email/name works for v1
- Matchmaking queue — room codes sufficient
- Spectating — not core
- Leaderboards — session scores only

## Context

- Traditional Filipino board game by Sofronio H. Pasola Jr. (1970)
- Tech stack: Next.js 14, Express.js, Socket.io, TypeScript, Docker
- 4,958 LOC across client and server
- 108 commits over 2 days (2026-03-18 → 2026-03-20)
- 6 phases, 18 plans, 34 requirements — all complete

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate server (Express+Socket.io :3001) from client (Next.js :3000) | WebSocket needs persistent connection | ✓ Good — clean separation |
| Two Zustand stores (gameStore + roomStore) | Separation of concerns | ✓ Good — clear data ownership |
| CSS Grid 9x8 board | Matches game spec exactly | ✓ Good — simple and performant |
| Minimax depth 3 with iterative deepening | Balance strength vs response time | ✓ Good — plays within 3s |
| Spy beats all officers; Private beats Spy | Game rules spec | ✓ Good — correct hierarchy |
| Multi-stage Docker builds | Small images, non-root security | ✓ Good — production ready |
| sync-game-state mechanism | Fix race condition on room join | ✓ Good — reliable state sync |

## Constraints

- **Tech Stack**: Next.js 14, Express.js, Socket.io, TypeScript, Docker
- **AI Depth**: 3 ply (balance strength vs 3s response time)
- **Ports**: Client :3000, Server :3001

---
*Last updated: 2026-03-20 after v1.1 milestone started*
