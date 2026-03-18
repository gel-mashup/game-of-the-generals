# Project Specifications: Game of the Generals

## 1. Project Overview

### 1.1 Project Name
**Game of the Generals** (also known as *Salpakan*)

### 1.2 Project Type
Real-time multiplayer web-based strategy board game

### 1.3 Core Functionality
A two-player turn-based strategy game where players deploy pieces on a board and maneuver them to capture the opponent's flag or reach the opposite baseline. The game features real-time multiplayer via WebSocket and an AI opponent using the Minimax algorithm with alpha-beta pruning.

### 1.4 Target Users
- Casual gamers looking for strategic board game experience
- Filipino players familiar with the traditional Salpakan game
- Strategy game enthusiasts wanting to play against AI or friends

---

## 2. Technology Stack

### 2.1 Frontend
| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Real-time Communication | Socket.io Client |

### 2.2 Backend
| Component | Technology |
|-----------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Real-time | Socket.io |
| Language | TypeScript |
| Testing | Jest |

### 2.3 Infrastructure
| Component | Technology |
|-----------|------------|
| Container | Docker |
| Orchestration | Docker Compose |

---

## 3. Game Rules and Mechanics

### 3.1 Board Configuration

#### Board Dimensions
- **Total Size:** 9 columns × 8 rows (72 squares)
- **Deployment Zone:** First 3 rows per player (27 squares each)

#### Deployment Zones
- **Red Player:** Rows 0-2 (top of board)
- **Blue Player:** Rows 5-7 (bottom of board)

### 3.2 Pieces

Each player has 21 pieces with different ranks. The rank determines the piece's strength and what it can capture.

#### Piece Configuration

| Piece Type | Rank | Quantity | Beats |
|------------|------|----------|-------|
| 5-Star General | 11 | 1 | All ranks below, Private, Flag |
| 4-Star General | 10 | 1 | All ranks below, Private, Flag |
| 3-Star General | 9 | 1 | All ranks below, Private, Flag |
| 2-Star General | 8 | 1 | All ranks below, Private, Flag |
| 1-Star General | 7 | 1 | All ranks below, Private, Flag |
| Colonel | 6 | 1 | All ranks below, Private, Flag |
| Lieutenant Colonel | 5 | 1 | All ranks below, Private, Flag |
| Major | 4 | 1 | All ranks below, Private, Flag |
| Captain | 3 | 1 | All ranks below, Private, Flag |
| 1st Lieutenant | 2 | 1 | Sergeant, Private, Flag |
| 2nd Lieutenant | 1 | 1 | Sergeant, Private, Flag |
| Sergeant | 0 | 1 | Private, Flag |
| Private | -1 | 6 | Spy, Flag |
| Spy | -2 | 2 | All Officers (SGT to 5★), Flag |
| Flag | -3 | 1 | Cannot move; captured by any piece |

### 3.3 Special Rules

#### Spy (Rank -2)
- Beats ALL officers (Sergeant rank 0 and above)
- Only the **Private** can eliminate a Spy
- If a Spy attacks a Private, the Private wins

#### Flag (Rank -3)
- Cannot move once deployed
- Captured by ANY opposing piece (including the opponent's Flag)
- Game ends immediately when flag is captured

#### Tie Rule
- When two pieces of **equal rank** clash, both pieces are eliminated from the board

### 3.4 Movement Rules

- **Direction:** Orthogonal only (horizontal or vertical)
- **Distance:** One square per move
- **Valid Directions:** Forward, backward, left, right (no diagonal)
- **Restrictions:**
  - Cannot move to a square occupied by own piece
  - Flag cannot move at all
  - Cannot move outside board boundaries

### 3.5 Win Conditions

The game ends when one of the following conditions is met:

1. **Flag Capture:** A player captures the opponent's Flag
2. **Flag Reached Baseline:** A player's Flag reaches the opposite baseline (row 0 for Red, row 7 for Blue) with no adjacent enemy pieces
3. **No Valid Moves:** A player has no valid moves available (opponent wins)

### 3.6 Game Phases

#### Phase 1: Waiting
- Players join or create a room
- Room code generated (6-character alphanumeric)
- Waiting for second player or bot

#### Phase 2: Deployment
- Both players place their 21 pieces in their deployment zone
- Each player has their own deployment zone (top 3 rows for Red, bottom 3 rows for Blue)
- Players can use "Auto Deploy" for random placement
- Players click "Ready" when satisfied with deployment
- Game begins when both players are ready

#### Phase 3: Playing
- Players alternate turns starting with Red
- On each turn, a player moves one piece to an adjacent square
- When moving to an occupied square, a battle occurs
- Both pieces are revealed simultaneously
- Higher rank wins; equal rank = both eliminated

#### Phase 4: Finished
- Game over when win condition is met
- Winner announced with reason (flag captured, flag reached baseline, or no moves)
- Session scores updated

---

## 4. Architecture

### 4.1 Project Structure

```
the_generals_game/
├── docker-compose.yml           # Docker orchestration
├── client/                      # Next.js Frontend
│   ├── src/
│   │   ├── app/                # Pages
│   │   │   ├── page.tsx        # Landing page
│   │   │   ├── lobby/          # Lobby (create/join room)
│   │   │   └── game/[roomId]/  # Game board
│   │   ├── components/        # UI Components
│   │   │   ├── Board.tsx       # Game board
│   │   │   ├── Piece.tsx       # Piece component
│   │   │   └── GameHeader.tsx  # Game info header
│   │   └── store/              # Zustand state
│   └── package.json
│
└── server/                     # Node.js Backend
    ├── src/
    │   ├── index.ts            # Server entry point
    │   ├── socket/             # Socket.io handlers
    │   │   └── handler.ts
    │   ├── game/               # Game logic
    │   │   ├── engine.ts        # Board, movement, battle
    │   │   └── bot.ts           # AI opponent
    │   └── types/              # Shared types
    │       └── index.ts
    └── package.json
```

### 4.2 Client Architecture

#### Pages
1. **Landing Page (`/`)** - Entry point with options to play vs Bot or play Online
2. **Lobby Page (`/lobby`)** - Create or join rooms
3. **Game Page (`/game/[roomId]`)** - The actual game board

#### Components
- **Board:** Renders 8x9 grid of squares
- **Piece:** Renders individual piece with appropriate icon
- **GameHeader:** Shows game status, scores, current turn

#### State Management (Zustand)
- Room information
- Player information
- Board state
- Current turn
- Game status
- Scores

### 4.3 Server Architecture

#### Socket Handlers
- `create-room` - Create new game room
- `join-room` - Join existing room
- `start-game` - Host starts the game
- `deploy-piece` - Place piece during deployment
- `ready` - Signal deployment complete
- `make-move` - Execute a move
- `rematch` - Request new game
- `reset-scores` - Reset session scores

#### Game Engine (`engine.ts`)
- Board creation and management
- Piece creation
- Deployment validation
- Movement validation
- Battle resolution
- Win condition detection
- Move execution

#### Bot AI (`bot.ts`)
- Minimax algorithm with alpha-beta pruning
- Depth: 3 ply
- Evaluation factors:
  - Piece count
  - Officer count
  - Piece rank value
  - Mobility
  - Territory control
  - Flag protection
  - Exposed high-rank penalty

---

## 5. User Interface

### 5.1 Landing Page
- Title and game branding
- Two action buttons: "Play vs Bot" and "Play Online"

### 5.2 Lobby Page
- **Create Room:** Enter name, optional bot mode toggle
- **Join Room:** Enter room code and name
- Display of room code to share

### 5.3 Game Page

#### Deployment Phase
- Piece palette showing available pieces
- Click piece then click board to place
- "Ready" button when done
- "Auto Deploy" for random placement

#### Playing Phase
- Click piece to select (valid moves highlighted)
- Click destination to move
- Turn indicator showing current player

#### Game Over
- Winner announcement
- Reason for win
- Session scores
- "Rematch" and "Leave" buttons

---

## 6. Socket Events

### 6.1 Client to Server

| Event | Payload | Description |
|-------|---------|-------------|
| `create-room` | `{ hostName: string, isBotMode?: boolean }` | Create new room |
| `join-room` | `{ roomId: string, playerName: string }` | Join existing room |
| `start-game` | - | Host starts game |
| `deploy-piece` | `{ pieceId: string, row: number, col: number }` | Deploy a piece |
| `ready` | - | Signal ready |
| `auto-deploy` | - | Random deployment |
| `make-move` | `{ from: Position, to: Position }` | Make a move |
| `get-scores` | - | Request scores |
| `rematch` | - | Request rematch |
| `reset-scores` | - | Reset scores (host) |
| `leave-room` | - | Leave current room |

### 6.2 Server to Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room:created` | `{ roomId, playerId, playerSide, isBotGame }` | Room created |
| `room:joined` | `{ roomId, playerId, playerSide }` | Joined room |
| `player:joined` | `{ player }` | New player joined |
| `game:started` | `{ board, currentTurn }` | Game started |
| `piece:deployed` | `{ pieceId, row, col, deployedCount, board, autoDeployComplete? }` | Piece placed |
| `player:ready` | `{ playerId }` | Player ready |
| `deploy:complete` | `{ board, currentTurn }` | Deployment complete |
| `move:result` | `{ move, outcome, board, currentTurn }` | Move result |
| `game:over` | `{ winner, reason, scores }` | Game over |
| `scores:update` | `{ scores }` | Scores updated |
| `rematch:ready` | `{ bothReady }` | Rematch status |
| `bot:thinking` | `{ isThinking: boolean }` | Bot is thinking |
| `player:left` | `{ playerId, reason }` | Player left |
| `error` | `{ message }` | Error occurred |

---

## 7. API Endpoints

### 7.1 Server
- **Port:** 3001
- **Base URL:** http://localhost:3001

### 7.2 Client
- **Port:** 3000
- **Base URL:** http://localhost:3000

---

## 8. Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGIN` | Allowed origins | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Server URL for client | `http://localhost:3001` |

---

## 9. Game State Machine

```
waiting → deploying → playing → finished
              ↑            ↓
              └────────────┘ (rematch)
```

### 9.1 State Details

**waiting**
- Room created, waiting for players
- Host can start game when 2 players (or 1 + bot)

**deploying**
- Players place pieces in deployment zone
- Both players must be ready to proceed

**playing**
- Alternating turns
- Players make moves
- Game ends when win condition met

**finished**
- Winner declared
- Scores updated
- Rematch or leave

---

## 10. Bot AI Specification

### 10.1 Algorithm
- **Minimax** with **Alpha-Beta Pruning**
- Search depth: 3 ply
- Time limit: 3000ms per move

### 10.2 Evaluation Function

The evaluation function returns a score where higher is better for the AI:

```
score = 
  + pieceCount * 10
  + officerCount * 15
  + pieceValue
  - exposedPenalty * 5
  + exposedPenaltyOpponent * 5
  + mobility * 2
  - mobilityOpponent * 2
  + territory * 3
  - territoryOpponent * 3
  + flagProtection
  - flagProtectionOpponent
```

**Win Bonuses:**
- Flag captured: +10000
- Flag at baseline: +9000
- Flag captured by opponent: -10000
- Flag at baseline by opponent: -9000

### 10.3 Move Ordering
1. Capture moves (highest piece value target first)
2. Forward advancement moves
3. Random tiebreaker

---

## 11. Data Models

### 11.1 Piece
```typescript
interface Piece {
  id: string;
  type: PieceType;
  owner: 'red' | 'blue';
  rank: PieceRank;
  revealed: boolean;
}
```

### 11.2 Room
```typescript
interface Room {
  id: string;
  hostId: string;
  players: Player[];
  status: 'waiting' | 'deploying' | 'playing' | 'finished';
  board: (Piece | null)[][];
  currentTurn: 'red' | 'blue';
  deployedPieces: { red: Set<string>, blue: Set<string> };
  scores: { red: number, blue: number, draws: number, gamesPlayed: number };
  isBotGame: boolean;
  botSide: 'red' | 'blue';
  createdAt: number;
}
```

### 11.3 Move
```typescript
interface Move {
  id: string;
  from: Position;
  to: Position;
  player: 'red' | 'blue';
  timestamp: number;
  outcome?: {
    attacker: Piece;
    defender: Piece | null;
    winner: 'red' | 'blue' | 'tie' | null;
    captured: boolean;
  };
}
```

---

## 12. Deployment

### 12.1 Docker Compose
```bash
docker-compose up --build
```

### 12.2 Manual Setup

**Server:**
```bash
cd server
npm install
npm run build
npm start
```

**Client:**
```bash
cd client
npm install
npm run build
npm start
```

### 12.3 Production Deployment (Railway)
1. Create two services (Server and Client)
2. Set environment variables
3. Deploy with appropriate build commands

---

## 13. Testing

### 13.1 Server Tests
- Game engine unit tests (Jest)
- Battle resolution tests
- Win condition tests

Run tests:
```bash
cd server
npm test
```

---

## 14. Acknowledgments

- Game invented by Sofronio H. Pasola Jr. in 1970
- Also known as "Salpakan" in the Philippines
- Inspired by Stratego