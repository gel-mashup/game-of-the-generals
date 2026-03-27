# M001: Migration

**Vision:** A real-time multiplayer web-based strategy board game (Salpakan) where two players deploy 21 pieces on a 9x8 board, maneuver to capture the opponent's flag or reach the opposite baseline.

## Success Criteria


## Slices

- [x] **S01: Foundation** `risk:medium` `depends:[]`
  > After this: Establish the complete project foundation: Docker Compose orchestration, Express + Socket.
- [x] **S02: Game Core** `risk:medium` `depends:[S01]`
  > After this: Implement the server-side game engine: pure functions for deployment validation, move validation, battle resolution, and auto-deploy randomization.
- [x] **S03: Game Flow** `risk:medium` `depends:[S02]`
  > After this: Implement server-side win condition detection and game-over/flow handlers.
- [x] **S04: Ai Opponent** `risk:medium` `depends:[S03]`
  > After this: unit tests prove ai-opponent works
- [x] **S05: Dockerize** `risk:medium` `depends:[S04]`
  > After this: unit tests prove dockerize works
- [x] **S06: Debug Game Flow Issue Where Pieces Are Not Placed After Joining Room** `risk:medium` `depends:[S05]`
  > After this: unit tests prove debug-game-flow-issue-where-pieces-are-not-placed-after-joining-room works
- [x] **S07: Side By Side Layout Board Perspective Flip** `risk:medium` `depends:[S06]`
  > After this: unit tests prove side-by-side-layout-board-perspective-flip works
- [x] **S08: Fog Of War** `risk:medium` `depends:[S07]`
  > After this: Implement fog-of-war: hide enemy piece ranks as "?
