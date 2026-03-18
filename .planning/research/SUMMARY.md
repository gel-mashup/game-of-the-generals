# Research Summary: Game of the Generals

## Key Findings

### Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Zustand, Socket.io Client
- **Backend:** Node.js, Express.js, Socket.io 4.x, TypeScript, Jest
- **Real-time:** Socket.io with room-based architecture
- **AI:** Custom Minimax + alpha-beta pruning (depth 3)

### Table Stakes
- Room system with shareable codes
- Real-time move sync via WebSocket
- Board rendering (9x8 grid)
- Deployment and movement phases
- Battle resolution and win detection
- Session scores and rematch

### Differentiators
- AI opponent with variable depth
- Auto-deploy option
- Move highlighting and valid move indicators

### Watch Out For
1. **Server-authoritative logic** — All game rules must run on server
2. **State sync** — Broadcast full board state after every action
3. **AI performance** — Implement move ordering, limit depth
4. **Race conditions** — Queue moves, process sequentially
5. **Win detection** — Check all conditions after every move

---

## Confidence
- Stack: HIGH
- Real-time architecture: HIGH
- AI implementation: MEDIUM (custom, requires careful optimization)
