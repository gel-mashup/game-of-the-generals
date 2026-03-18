# Stack Research: Game of the Generals

## Technology Recommendations

### Backend Runtime
- **Node.js 20+** — Required for the project (user-specified)
- **Express.js** — HTTP server framework (user-specified)

### Real-time Communication
- **Socket.io 4.x** — WebSocket abstraction with rooms, events, fallbacks
  - Confidence: HIGH
  - Well-documented for multiplayer games
  - Native room support for game sessions

### Game State
- **In-memory Map** — Store active rooms per server instance
  - Room state lost on restart (acceptable for MVP)
  - Avoid Redis complexity for single-server deployment

### AI Engine
- **Custom Minimax + Alpha-Beta** — From scratch implementation
  - Confidence: HIGH
  - Standard approach for perfect-information games
  - Implement move ordering for efficiency

### Testing
- **Jest** — Unit testing (user-specified)

---

## What NOT to Use

| Avoid | Reason |
|-------|--------|
| Firebase Realtime DB | Overkill for turn-based; costs scale with usage |
| Redis Pub/Sub | Add complexity without need for multi-server |
| Binary WebSocket | JSON sufficient for board state |
| External game engines | Custom rules require full control |

---

## Confidence Levels
- Backend stack: HIGH
- Real-time: HIGH  
- AI: MEDIUM (custom implementation needed)
- Deployment: HIGH

---

*Generated: 2026-03-18*
