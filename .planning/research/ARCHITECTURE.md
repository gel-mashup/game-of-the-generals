# Architecture Research: Game of the Generals

## Component Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│  Pages          │  Components      │  State (Zustand)        │
│  - Landing      │  - Board        │  - roomState            │
│  - Lobby        │  - Piece        │  - gameState            │
│  - Game         │  - GameHeader   │  - playerState          │
└─────────────────────────────────────────────────────────────┘
                              │
                    Socket.io Client
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server (Express + Socket.io)              │
├─────────────────────────────────────────────────────────────┤
│  Socket Handler  │  Game Engine      │  AI Bot              │
│  - Events        │  - Board logic    │  - Minimax            │
│  - Room mgmt    │  - Battle         │  - Alpha-beta         │
│                  │  - Win detection  │  - Evaluation        │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

1. **Client connects** → Socket handshake → Assigned to room
2. **Host creates room** → Server generates 6-char code → Returns to client
2. **Player joins** → Server validates room → Joins room
3. **Deployment** → Client sends piece positions → Server validates → Broadcasts
4. **Playing** → Client sends move intent → Server validates/executes → Broadcasts result
5. **Game over** → Server detects win → Broadcasts winner → Updates scores

---

## Suggested Build Order

### Phase 1: Foundation
1. Server setup with Socket.io
2. Room creation/join logic
3. Basic client pages (Landing, Lobby)

### Phase 2: Game Core
4. Board rendering
5. Deployment phase
6. Movement validation
7. Battle resolution

### Phase 3: Game Flow
8. Win condition detection
9. Game state transitions
10. Scores and rematch

### Phase 4: AI
11. Minimax implementation
12. Alpha-beta pruning
13. Bot integration

---

## Key Design Decisions

1. **Server-authoritative** — Server validates all moves, prevents cheating
2. **In-memory state** — Room state in server memory, not database
3. **Event-driven** — Socket events for all game actions
4. **TypeScript** — Shared types between client/server

---

*Generated: 2026-03-18*
