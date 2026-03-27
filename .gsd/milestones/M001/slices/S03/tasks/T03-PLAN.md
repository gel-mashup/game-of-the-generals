# T03: 03-game-flow 03-03

**Slice:** S03 — **Milestone:** M001

## Description

Wire WinModal, score display, and rematch socket handlers into the game page. Scores are always visible in the header, WinModal appears on game over, and rematch flow is fully connected to socket events.

## Must-Haves

- [ ] "Score display visible in game header during all phases"
- [ ] "WinModal appears when gameStatus === 'finished' with winner, reason, scores"
- [ ] "Rematch button emits 'rematch' socket event; opponent sees rematch prompt"
- [ ] "Leave button navigates back to landing page"
- [ ] "scores:update event keeps header in sync"
- [ ] "rematch:ready / rematch:timeout events control rematch UI state"
- [ ] "rematch:confirmed resets client state for new deployment"

## Files

- `client/src/app/game/[roomId]/page.tsx`
