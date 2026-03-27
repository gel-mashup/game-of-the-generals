# T01: 07-side-by-side-layout-board-perspective-flip 01

**Slice:** S07 — **Milestone:** M001

## Description

Migrated from legacy planning format.

## Must-Haves

- [ ] "Desktop (>= 768px): board on left, sidebar overlay on right"
- [ ] "Mobile (< 768px): board on top, sidebar stacked below board as relative block"
- [ ] "Sidebar only visible during deployment phase (gameStatus === 'deploying')"
- [ ] "Sidebar hidden during playing/finished phases with slide-out transition"
- [ ] "Sidebar has glass-morphism appearance (translucent navy with backdrop blur)"
- [ ] "Sidebar contains: deploy header, piece palette slot, Auto-Deploy button, Ready button"

## Files

- `client/src/app/game/[roomId]/page.tsx`
- `client/src/features/game/DeploymentSidebar.tsx`
