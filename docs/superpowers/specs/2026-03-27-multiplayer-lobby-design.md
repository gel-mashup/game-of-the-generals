# Multiplayer Lobby Design

## Overview
Add public room list to landing page with quick-join functionality and host controls for adding bots.

## UI/UX Specification

### Landing Page
- Replace "Play Online" button with 2-column grid of room cards
- Each room card displays:
  - Host avatar (colored circle with initial)
  - Host name
  - Mode badge (PVP / vs Bot)
  - Room code (monospace)
  - Player count (1/2 or 2/2)
  - "Join" button (or "Full" disabled button if 2/2)
- "+ Create Room" button at top to access lobby

### Host Waiting Room (Lobby Page)
- Show room code prominently
- "Waiting for opponent..." message
- "Share the room code" prompt
- "+ Add Bot" button (visible only to host while status is 'waiting')
- "Leave Room" button

### Full Room (Lobby Page)
- When room has 2 players, show player slots
- "Start Game" button (visible only to host)

## Server Changes

### Data Model
```typescript
interface PublicRoom {
  roomId: string;
  hostName: string;
  playerCount: number;
  isFull: boolean;
  isBotGame: boolean;
  status: 'waiting' | 'deploying' | 'playing' | 'finished';
}
```

### Socket Events
| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `get-rooms` | C→S | - | Request public room list |
| `rooms:list` | S→C | `PublicRoom[]` | Public room list |
| `join-room-by-id` | C→S | `{ roomId: string, playerName: string }` | Join via click |
| `add-bot` | C→S | - | Host adds bot (waiting only) |
| `start-game` | C→S | - | Host starts (full room only) |
| `room:updated` | S→C | `PublicRoom` | Room status changed |
| `room:removed` | S→C | `{ roomId: string }` | Room removed from list |

### Room Lifecycle
1. Room created → added to public list
2. Player joins → update count
3. Host adds bot → update mode to "vs Bot", count = 2
4. Game starts (deploying) → remove from public list
5. Game finishes → room deleted

## Client Changes

### Store (roomStore)
- Add `rooms: PublicRoom[]` state
- Add socket listeners for room events

### Landing Page
- Fetch rooms on mount and periodically (every 5s)
- Render room cards in 2-column grid
- Handle room click to join

### Lobby Page
- Show "Add Bot" button when: host AND status = 'waiting'
- Show "Start Game" button when: host AND playerCount = 2
- Emit events on button click

## Acceptance Criteria
1. Landing page shows all open (waiting) rooms in 2-column grid
2. Clicking "Join" on a room joins that room
3. Host sees "Add Bot" button while waiting
4. Host sees "Start Game" button when room is full
5. Room removed from list when game starts
6. Works with existing bot game flow (PVB)
7. Existing room code join still works
