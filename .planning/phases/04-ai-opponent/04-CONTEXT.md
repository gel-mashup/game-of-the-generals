# Phase 4: AI Opponent - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement AI opponent using Minimax algorithm with alpha-beta pruning. Human plays red, bot plays blue. Bot joins the same room as an AI player slot. Game completes with bot deploying via auto-deploy, making strategic moves, and showing a thinking indicator.

Requirements: AI-01, AI-02, AI-03, AI-04

</domain>

<decisions>
## Implementation Decisions

### Search Depth
- Iterative deepening: start at depth 1, increase until depth 3 or time limit
- Time limit: 3 seconds maximum per move
- Standard alpha-beta pruning with move ordering (captures first)

### Evaluation Function
- Base: Material count using standard Stratego ranking (Colonel=10 down to Private=1)
- Flag value: very high (100) — protecting own flag, threatening opponent's
- Mobility bonus: small bonus for number of valid moves available
- No position bonuses (forward advance, center control) — Claude's discretion for fine-tuning

### Bot Integration
- Human plays red, bot plays blue (human vs bot)
- Bot joins via same room lobby — "select bot as opponent" flow
- Bot deployment: auto-deploy (randomized placement via Fisher-Yates shuffle)
- Bot starts thinking immediately when its turn begins
- Brief 0.5-1 second delay before bot moves to show the thinking indicator
- Bot auto-confirms rematches (already implemented in rematchHandler)

### Thinking Indicator
- Style: text overlay
- Position: board overlay (covering the board like WinModal/BattleReveal)
- Text: simple "Bot is thinking..."
- No depth indicator — just text
- Removed when bot makes its move

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Game Mechanics
- `PROJECT_SPECS.md` §3 — Game rules: ranks, movement, capture, win conditions
- `PROJECT_SPECS.md` §4.2 — Room scores tracking (relevant for AI session scoring)
- `PROJECT_SPECS.md` §10.2 — AI evaluation includes win bonuses for flag capture/baseline

### Prior Phase Decisions
- `.planning/phases/02-game-core/02-CONTEXT.md` — Auto-deploy pattern (Fisher-Yates shuffle)
- `.planning/phases/03-game-flow/03-CONTEXT.md` — Modal overlay pattern (WinModal, BattleReveal)
- `.planning/STATE.md` Decision 54 — Bot auto-deploy via `socket.emit('auto-deploy')`
- `.planning/STATE.md` Decision 59 — Bot auto-confirms rematch in rematchHandler

### AI Algorithm
- Standard Minimax with alpha-beta pruning
- Iterative deepening (depth 1 → 3)
- Move ordering: captures first
- Time limit: 3 seconds

### Socket Events
- `PROJECT_SPECS.md` §6.1 — Client events: `auto-deploy`, `make-move`
- Bot socket events to be added: `bot:thinking-start`, `bot:thinking-end`

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `server/src/game/engine.ts` — Pure functions: getValidMoves, applyMove, battle — AI will reuse these
- `server/src/socket/handlers/rematchHandler.ts` — Bot auto-confirm already implemented
- `client/src/features/game/BattleReveal.tsx` — Pattern for board overlay with animation
- `client/src/features/game/WinModal.tsx` — Pattern for modal overlay styling

### Established Patterns
- Socket.io persistent connection via SocketProvider
- Zustand stores for game state and room state
- Bot integration via socket events (bot:auto-deploy already exists)
- Board overlay animation pattern (BattleReveal)

### Integration Points
- Lobby: add "Select opponent" dropdown (Human / Bot)
- Bot socket handler: registers bot as a pseudo-player in the room
- Bot AI module: server/src/game/botAI.ts (new file)
- gameHandler: bot turn detection triggers AI computation
- game page: bot:thinking-start/end socket events trigger overlay

</codebase_context>

<specifics>
## Specific Ideas

- "Keep it simple — the AI should play reasonably well but not be frustrating"
- Bot should feel like playing against another person (timing, not perfect play)
- Thinking indicator should be subtle — not a full-screen blocker

</specifics>

<deferred>
## Deferred Ideas

- Bot difficulty levels (easy/medium/hard) — future phase
- Multi-bot tournament mode — future phase
- Bot personality/profile (aggressive vs defensive style) — future phase

</deferred>

---

*Phase: 04-ai-opponent*
*Context gathered: 2026-03-19*
