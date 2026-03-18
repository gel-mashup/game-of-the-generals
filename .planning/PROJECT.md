# Game of the Generals

## What This Is

A real-time multiplayer web-based strategy board game (also known as Salpakan) where two players deploy pieces on a 9x8 board and maneuver to capture the opponent's flag or reach the opposite baseline. Features both online multiplayer and AI opponent modes.

## Core Value

A playable two-player strategy game with real-time multiplayer and AI opponent, capturing the traditional Filipino Game of the Generals experience in a modern web interface.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Real-time multiplayer game via WebSocket
- [ ] Two-player turn-based gameplay
- [ ] 9x8 board with deployment zones
- [ ] 21 pieces per player with ranked combat system
- [ ] Piece deployment phase with auto-deploy option
- [ ] Movement and battle resolution mechanics
- [ ] Win condition detection (flag capture, baseline reach, no valid moves)
- [ ] AI opponent using Minimax with alpha-beta pruning
- [ ] Room system with 6-character codes
- [ ] Session scoring

### Out of Scope

- Mobile apps — web-first
- OAuth login — email/password sufficient for v1
- Tournaments — basic multiplayer only
- Leaderboards — session scores only
- Chat — game-only communication
- Real-time spectating — out of scope

## Context

- Traditional Filipino board game invented by Sofronio H. Pasola Jr. in 1970
- Project structure: Next.js client + Express.js server with Socket.io
- Docker-based deployment
- Game rules documented in PROJECT_SPECS.md with full piece rankings, win conditions, and AI specification

## Constraints

- **Tech Stack**: Next.js 14, Express.js, Socket.io, TypeScript, Docker — user-specified
- **Timeline**: No hard deadline
- **AI Depth**: 3 ply for bot (balance between strength and response time)
- **Ports**: Client :3000, Server :3001

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| WebSocket for real-time | Required for multiplayer | — Pending |
| Minimax + alpha-beta for AI | Standard approach for perfect-information games | — Pending |
| Docker Compose | Simplifies local dev and deployment | — Pending |

---
*Last updated: 2026-03-18 after initialization*
