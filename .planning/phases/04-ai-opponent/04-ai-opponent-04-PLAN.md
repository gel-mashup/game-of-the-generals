---
phase: 04-ai-opponent
plan: 04
type: execute
wave: 1
depends_on: []
files_modified:
  - server/src/socket/handlers/roomHandler.ts
autonomous: true
gap_closure: true
requirements:
  - AI-01
user_setup: []

must_haves:
  truths:
    - "User can start a game with AI opponent"
    - "Bot auto-deploys when game starts in bot mode"
    - "Bot auto-readies after auto-deploy completes"
    - "Bot thinks and moves after deploy:complete (human goes first = red, bot is blue)"
  artifacts:
    - path: "server/src/socket/handlers/roomHandler.ts"
      provides: "Bot room creation with auto-start"
      contains: "isBotGame, botSide, generateAutoDeploy"
  key_links:
    - from: "roomHandler.ts (create-room)"
      to: "gameHandler.ts (ready handler)"
      via: "bot synthetic player in room.players"
      pattern: "players.*bot"
    - from: "roomHandler.ts (create-room)"
      to: "all clients in room"
      via: "io.to(roomId).emit('game:started')"
      pattern: "game:started"
---

<objective>
Fix bot game startup flow. When a human creates a bot game via "Play vs Bot", the server must: (1) add a synthetic bot player to room.players, (2) auto-deploy bot's 21 pieces, (3) emit game:started so the room transitions from 'waiting' to 'deploying'. This unblocks the human deployment, ready button, countdown, and bot gameplay.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@server/src/socket/handlers/roomHandler.ts
@server/src/socket/handlers/gameHandler.ts
@server/src/game/engine.ts
@server/src/types/index.ts
</context>

<interfaces>
<!-- Room type (from types/index.ts) -->
```typescript
interface Room {
  id: string;
  hostId: string;
  players: Player[];          // Human + synthetic bot player
  status: 'waiting' | 'deploying' | 'playing' | 'finished';
  board: (Piece | null)[][];
  currentTurn: 'red' | 'blue';
  isBotGame: boolean;
  botSide: 'red' | 'blue' | null;
  scores: { red: number; blue: number; draws: number; gamesPlayed: number };
  deployedPieces: { red: Set<string>; blue: Set<string> };
  readyPlayers: Set<string>;
  rematchRequests: Set<string>;
  rematchTimeout: NodeJS.Timeout | null;
}

interface Player {
  id: string;
  name: string;
  side: 'red' | 'blue';
}
```

<!-- Bot synthetic player pattern -->
// Bot has NO socket — uses synthetic ID so it's findable by ready handler
// Synthetic ID format: `bot-${roomId}` (e.g., "bot-ABC123")
// Bot player: { id: `bot-${roomId}`, name: 'Bot', side: 'blue' }

// generateAutoDeploy returns Map<pieceType, Position>
// PIECE_CONFIG: array of { type, rank, count }

// Bot auto-deploy emits piece:deployed for each of 21 pieces
// Same payload as gameHandler auto-deploy socket handler
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Fix create-room for bot games</name>
  <files>server/src/socket/handlers/roomHandler.ts</files>
  <action>
    Modify server/src/socket/handlers/roomHandler.ts to fix bot game startup:

    **1. Add imports at the top (after existing imports):**
    ```typescript
    import { generateAutoDeploy } from '../../game/engine';
    import { PIECE_CONFIG } from '../../types';
    ```

    **2. Modify the `create-room` handler's `isBotMode` block.** Find this section (after `socket.emit('room:created', ...)` and `console.log`):
    ```typescript
    socket.emit('room:created', {
      roomId,
      playerId: socket.id,
      playerSide: 'red',
      isBotGame: room.isBotGame,
    });

    console.log(`Room ${roomId} created by ${hostName} (${socket.id}), bot mode: ${room.isBotGame}`);
  });
    ```

    **Replace the entire `create-room` handler body with:**
    ```typescript
    socket.on('create-room', ({ hostName, isBotMode }: { hostName: string; isBotMode?: boolean }) => {
      const roomId = generateRoomCode();

      // Ensure room ID is unique
      while (rooms.has(roomId)) {
        // This is extremely unlikely with nanoid's collision resistance
      }

      const room: Room = {
        id: roomId,
        hostId: socket.id,
        players: [{ id: socket.id, name: hostName, side: 'red' }],
        status: 'waiting',
        board: createEmptyBoard(),
        currentTurn: 'red',
        isBotGame: isBotMode ?? false,
        botSide: isBotMode ? 'blue' : null,
        scores: { red: 0, blue: 0, draws: 0, gamesPlayed: 0 },
        deployedPieces: { red: new Set<string>(), blue: new Set<string>() },
        readyPlayers: new Set<string>(),
        rematchRequests: new Set<string>(),
        rematchTimeout: null,
      };

      rooms.set(roomId, room);
      socket.join(roomId);

      socket.emit('room:created', {
        roomId,
        playerId: socket.id,
        playerSide: 'red',
        isBotGame: room.isBotGame,
      });

      console.log(`Room ${roomId} created by ${hostName} (${socket.id}), bot mode: ${room.isBotGame}`);

      // For bot games: add synthetic bot player, auto-deploy bot, start game
      if (room.isBotGame) {
        // Add synthetic bot player to room (needed by ready handler to find bot)
        const botPlayer: Player = { id: `bot-${roomId}`, name: 'Bot', side: 'blue' };
        room.players.push(botPlayer);

        // Bot auto-deploys: generate positions and emit piece:deployed for each piece
        const botPositions = generateAutoDeploy('blue');
        for (const [typeKey, position] of botPositions) {
          const pieceType = typeKey.replace(/-\d+$/, '');
          const config = PIECE_CONFIG.find((p) => p.type === pieceType);
          if (!config) continue;

          const piece: Piece = {
            id: `${typeKey}-bot-${Math.random().toString(36).slice(2, 8)}`,
            type: pieceType as Piece['type'],
            owner: 'blue',
            rank: config.rank as Piece['rank'],
            revealed: false,
          };

          room.board[position.row][position.col] = piece;
          room.deployedPieces.blue.add(piece.id);

          io.to(roomId).emit('piece:deployed', {
            piece,
            row: position.row,
            col: position.col,
            deployedCount: room.deployedPieces.blue.size,
            board: room.board,
            autoDeployComplete: room.deployedPieces.blue.size === 21,
          });
        }

        // Transition to deploying and emit game:started
        room.status = 'deploying';
        io.to(roomId).emit('game:started', {
          board: room.board,
          currentTurn: 'red',
          status: 'deploying',
        });

        console.log(`Bot game ${roomId}: bot auto-deployed, game started in deploying phase`);
      }
    });
    ```

    **Key implementation points:**
    - Synthetic bot player ID format: `bot-${roomId}` (e.g., "bot-ABC123")
    - Bot player is added to `room.players` so the ready handler can find it by side
    - Bot pieces deployed to blue zone (rows 5-7) via `generateAutoDeploy('blue')`
    - `piece:deployed` events emitted for each bot piece (same payload as gameHandler auto-deploy)
    - `game:started` emitted to room so client transitions from 'waiting' to 'deploying'
    - `room.status` set to 'deploying' so ready handler accepts ready signals
    - The human's socket is in the room (via `socket.join(roomId)`), so it receives all emitted events
    - No new imports for gameHandler needed — bot auto-ready is already wired in ready handler (lines 326-337)
  </action>
  <verify>
    <automated>cd server && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>Bot game room transitions to 'deploying' status. Bot auto-deploys 21 pieces. game:started emitted to client. Human can deploy and click Ready. Bot auto-readies via existing ready handler logic.</done>
</task>

<task type="auto">
  <name>Task 2: Verify TypeScript compilation</name>
  <files>server/src/socket/handlers/roomHandler.ts</files>
  <action>
    Run TypeScript compiler to verify no type errors:

    ```bash
    cd server && npx tsc --noEmit 2>&1
    ```

    Fix any type errors. Common issues:
    - Missing `Piece` import from types
    - Room type augmented with `rematchRequests`/`rematchTimeout` fields
    - `generateAutoDeploy` returns `Map<string, Position>` (key is piece type string)

    Also verify the existing gameHandler.ts bot auto-ready logic still works:
    ```bash
    grep -n "botPlayer\|botSide" server/src/socket/handlers/gameHandler.ts | head -10
    ```
    Confirm the ready handler's bot auto-ready finds the synthetic bot player by `room.players.find((p) => p.side === botSide)`.
  </action>
  <verify>
    <automated>cd server && npx tsc --noEmit 2>&1</automated>
  </verify>
  <done>TypeScript compiles with zero errors. Bot synthetic player findable by ready handler.</done>
</task>

</tasks>

<verification>
- cd server && npx tsc --noEmit → zero errors
- Bot synthetic player: `room.players.find((p) => p.side === 'blue')` returns bot player
- Bot pieces: 21 pieces deployed to blue zone (rows 5-7)
- game:started: emitted to room with status='deploying', board, currentTurn='red'
- Full flow testable via browser: Create bot game → navigate to game page → see bot pieces deployed → deploy own pieces → click Ready → bot auto-readies → countdown → playing phase
</verification>

<success_criteria>
- Bot game room transitions to 'deploying' immediately after room creation
- Bot's 21 pieces visible on board in blue zone (rows 5-7)
- Client game page shows 'deploying' status (not 'waiting')
- Human can deploy pieces and click Ready
- Bot auto-readies when human clicks Ready (via existing ready handler logic)
- Countdown starts, deploy:complete fires, game enters 'playing' phase
- Bot takes its turn after human's first move (via triggerBotMove in make-move handler)
</success_criteria>

<output>
After completion, update VERIFICATION.md with gap closure results, then create `.planning/phases/04-ai-opponent/04-ai-opponent-04-SUMMARY.md`
</output>
