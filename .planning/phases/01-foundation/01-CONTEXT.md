# Phase 1: Foundation - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the foundational project structure for the Game of the Generals web application. This includes:
- Docker Compose setup with client (Next.js) and server (Express.js) services
- Landing page with "Play vs Bot" and "Play Online" mode selection
- Lobby page with room creation/joining UI
- Socket.io room management (create, join, leave)
- Board component (9x8 grid, CSS Grid)
- Piece component with rank display
- Deployment zone visualization
- Piece palette for deployment phase

</domain>

<decisions>
## Implementation Decisions

### Project Structure
- Monorepo layout: client/ + server/ at root with docker-compose.yml
- Docker Compose orchestrates both services
- Shared types between client/server

### UI Framework
- Tailwind CSS for styling
- Feature-based component organization: features/lobby/, features/game/
- Board rendered with CSS Grid (9 columns, 8 rows)
- Alternating square colors with clear borders

### State Management
- Zustand for state management
- Two stores: gameStore + roomStore
- gameStore: board state, pieces, current turn, game status
- roomStore: room info, players, scores

### Socket Integration
- Socket.io provider component (context-based)
- Redis for room storage (user confirmed this choice for scaling)
- camelCase event naming convention
- Room codes: 6-character alphanumeric

### Technology Stack (from PROJECT.md)
- Next.js 14 (App Router)
- Express.js + Socket.io
- TypeScript throughout
- Docker Compose

</decisions>

<canonical_refs>
## Canonical References

**No external specs** — requirements are fully captured in decisions above.

### Project Documents
- `.planning/PROJECT.md` — Project vision, tech stack constraints
- `.planning/REQUIREMENTS.md` — AUTH-01 through GS-04 requirements
- `.planning/ROADMAP.md` — Phase 1 scope
- `PROJECT_SPECS.md` — Full game rules, piece rankings, win conditions

</canonical_refs>

<codebase_context>
## Existing Code Insights

This is a **greenfield project** — no existing code. First phase establishes the entire codebase structure.

### Starting Point
- Empty repository
- Need to create: client/, server/, docker-compose.yml
- Need to install: all dependencies

### Integration Points
- Landing page → Lobby page (mode selection)
- Lobby page → Game page (room join)
- Client Socket.io → Server Socket.io (real-time communication)
- Docker Compose → binds ports 3000 (client), 3001 (server)

</codebase_context>

<specifics>
## Specific Ideas

- Traditional Filipino board game feel — clean, simple interface
- Board should feel like a physical game board
- Piece icons: standard Game of the Generals notation (stars, bars)
- Deployment zones should be visually distinct

</specifics>

<deferred>
## Deferred Ideas

- Redis connection handling — Phase 4 (AI) or later if scaling issues arise
- Spectating — Phase 5+ (not in initial scope)

---

*Phase: 01-foundation*
*Context gathered: 2026-03-18*
