# Features Research: Game of the Generals

## Table Stakes
Must-have features or users won't engage:

### Multiplayer
- Room creation with shareable codes
- Real-time move synchronization
- Player turn management
- Game state broadcast

### Core Gameplay
- Board rendering (9x8 grid)
- Piece placement during deployment
- Move validation (orthogonal, one square)
- Battle resolution (rank comparison)
- Win condition detection

### Session Management
- Session scores (wins/losses)
- Rematch functionality

---

## Differentiators
Competitive advantages beyond basic gameplay:

### AI Opponent
- Minimax with alpha-beta pruning
- Variable difficulty (depth settings)
- Responsive feel (move time limits)

### UX Polish
- Auto-deploy option
- Piece selection highlighting
- Valid move indicators
- Smooth animations

---

## Anti-features
Deliberately NOT building:

| Feature | Reason for Exclusion |
|---------|---------------------|
| Matchmaking queue | Too complex for v1; room codes sufficient |
| Leaderboards | Not in scope |
| Spectating | Out of scope |
| Mobile apps | Web-first approach |
| Real-time chat | Game is communication enough |
| OAuth | Email/password sufficient |
| Tournaments | Not needed for MVP |

---

## Feature Dependencies

```
Room System
    └── Game Lobby UI
           └── Game Board UI
                  ├── Deployment Phase
                  │      └── Battle Resolution
                  │             └── Win Conditions
                  └── AI Bot (optional)
```

---

*Generated: 2026-03-18*
