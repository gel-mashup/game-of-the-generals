# Requirements: Game of the Generals

**Defined:** 2026-03-18
**Core Value:** A playable two-player strategy game with real-time multiplayer and AI opponent, capturing the traditional Filipino Game of the Generals experience in a modern web interface.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: User can create a game room with a unique 6-character code ✓
- [x] **AUTH-02**: User can join an existing room using the room code ✓
- [x] **AUTH-03**: User can set their display name ✓
- [x] **AUTH-04**: User can leave a room at any time ✓

### Game Setup

- [x] **GS-01**: Board renders as a 9x8 grid ✓
- [x] **GS-02**: Each player has 21 pieces with correct ranks ✓
- [x] **GS-03**: Red player deployment zone is rows 0-2 ✓
- [x] **GS-04**: Blue player deployment zone is rows 5-7 ✓

### Deployment Phase

- [x] **DEP-01**: User can place pieces by clicking piece then board square
- [ ] **DEP-02**: User can only place pieces in their deployment zone
- [ ] **DEP-03**: User can use auto-deploy for random placement
- [x] **DEP-04**: User can signal ready when deployment is complete
- [x] **DEP-05**: Game starts when both players are ready

### Gameplay

- [x] **GAME-01**: Players alternate turns starting with Red
- [ ] **GAME-02**: User can select a piece during their turn
- [x] **GAME-03**: Valid moves are highlighted when piece selected
- [ ] **GAME-04**: User can move piece to adjacent orthogonal square
- [ ] **GAME-05**: User cannot move to square occupied by own piece
- [x] **GAME-06**: Battle occurs when moving to occupied square
- [ ] **GAME-07**: Higher rank wins; equal rank = both eliminated
- [ ] **GAME-08**: Spy beats all officers (rank 0+)
- [ ] **GAME-09**: Private beats Spy
- [ ] **GAME-10**: Flag captured by any piece

### Win Conditions

- [ ] **WIN-01**: Game ends when flag is captured
- [ ] **WIN-02**: Game ends when flag reaches opposite baseline with no adjacent enemies
- [ ] **WIN-03**: Game ends when player has no valid moves
- [ ] **WIN-04**: Winner is announced with reason

### AI Opponent

- [ ] **AI-01**: User can start game against AI opponent
- [ ] **AI-02**: AI uses Minimax algorithm with alpha-beta pruning
- [ ] **AI-03**: AI responds within 3 seconds
- [ ] **AI-04**: Bot is thinking indicator shown during AI turn

### Session Management

- [ ] **SES-01**: Session scores track wins/losses/draws
- [ ] **SES-02**: User can request rematch after game ends
- [ ] **SES-03**: Host can reset scores

## v2 Requirements

### UX Enhancements
- **UX-01**: Piece movement animations
- **UX-02**: Move history display
- **UX-03**: Undo move (friendly games only)

### Social
- **SOCL-01**: Chat during game
- **SOCL-02**: Friend list

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first approach |
| OAuth login | Email/name sufficient |
| Matchmaking queue | Room codes sufficient for v1 |
| Spectating | Not core to MVP |
| Leaderboards | Session scores only |
| Tournaments | Not needed for MVP |
| Real-time chat | Game is communication enough |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | ✓ Complete |
| AUTH-02 | Phase 1 | ✓ Complete |
| AUTH-03 | Phase 1 | ✓ Complete |
| AUTH-04 | Phase 1 | ✓ Complete |
| GS-01 | Phase 1 | ✓ Complete |
| GS-02 | Phase 1 | ✓ Complete |
| GS-03 | Phase 1 | ✓ Complete |
| GS-04 | Phase 1 | ✓ Complete |
| DEP-01 | Phase 2 | Complete |
| DEP-02 | Phase 2 | Pending |
| DEP-03 | Phase 2 | Pending |
| DEP-04 | Phase 2 | Complete |
| DEP-05 | Phase 2 | Complete |
| GAME-01 | Phase 2 | Complete |
| GAME-02 | Phase 2 | Pending |
| GAME-03 | Phase 2 | Complete |
| GAME-04 | Phase 2 | Pending |
| GAME-05 | Phase 2 | Pending |
| GAME-06 | Phase 2 | Complete |
| GAME-07 | Phase 2 | Pending |
| GAME-08 | Phase 2 | Pending |
| GAME-09 | Phase 2 | Pending |
| GAME-10 | Phase 2 | Pending |
| WIN-01 | Phase 3 | Pending |
| WIN-02 | Phase 3 | Pending |
| WIN-03 | Phase 3 | Pending |
| WIN-04 | Phase 3 | Pending |
| AI-01 | Phase 4 | Pending |
| AI-02 | Phase 4 | Pending |
| AI-03 | Phase 4 | Pending |
| AI-04 | Phase 4 | Pending |
| SES-01 | Phase 3 | Pending |
| SES-02 | Phase 3 | Pending |
| SES-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Phase 1 complete: 8/30
- Mapped to phases: 30
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after initial definition*
