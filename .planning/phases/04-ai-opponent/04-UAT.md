---
status: testing
phase: 04-ai-opponent
source: 04-ai-opponent-01-SUMMARY.md, 04-ai-opponent-02-SUMMARY.md, 04-ai-opponent-03-SUMMARY.md, 04-ai-opponent-04-SUMMARY.md
started: 2026-03-19T05:45:00Z
updated: 2026-03-19T05:46:00Z
---

## Current Test

number: 2
name: Human Deployment and Ready
expected: |
  Human can deploy 21 red pieces in rows 0-2 by clicking pieces from the palette then clicking board squares. Auto-deploy button fills all 21 spots. Once all 21 pieces are placed, the Ready button appears and is clickable. After clicking Ready, a 3-second countdown begins.
awaiting: user response

## Tests

### 1. Bot Game Creation
expected: Clicking "Play vs Bot" on the landing page navigates to the lobby in bot mode. After entering a name and clicking create, a game room is created. The bot auto-deploys 21 blue pieces in rows 5-7 (not visible as face-down pieces). The game transitions to 'deploying' status — the human sees the board ready for their own deployment.
result: pass

### 2. Human Deployment and Ready
expected: Human can deploy 21 red pieces in rows 0-2 by clicking pieces from the palette then clicking board squares. Auto-deploy button fills all 21 spots. Once all 21 pieces are placed, the Ready button appears and is clickable. After clicking Ready, a 3-second countdown begins.
result: [pending]

### 3. Bot Auto-Ready and Countdown
expected: When the human clicks Ready, the bot automatically readies too (no manual action needed). The 3-second countdown completes and the game enters the playing phase. Red (human) moves first.
result: [pending]

### 4. Bot Makes a Move After Human
expected: After the human makes their first move, the bot automatically takes its turn. The bot selects a piece and moves it to a valid adjacent square. The board updates to show the bot's move.
result: [pending]

### 5. Bot Thinking Indicator
expected: While the bot is computing its move, a "Bot is thinking..." text overlay appears centered on the board. The overlay has a semi-transparent dark background with pulsing text. It disappears when the bot's move is complete.
result: [pending]

### 6. Battle with Bot
expected: When the human moves a piece onto a bot's piece, the battle reveal animation plays showing both pieces. The outcome (win/lose/tie) follows the game's rank rules. The losing piece is removed from the board.
result: [pending]

### 7. Bot Win Condition
expected: If the bot captures the human's flag, a win modal appears showing the bot as the winner with reason "flag captured". Scores update in the header. All pieces are revealed on the board.
result: [pending]

### 8. Human Win and Rematch
expected: If the human captures the bot's flag, the win modal shows the human as winner. Scores update. Clicking Rematch sends a rematch request — the bot auto-accepts. A fresh game starts with new deployments.
result: [pending]

## Summary

total: 8
passed: 1
issues: 0
pending: 7
skipped: 0

## Gaps

[none yet]
