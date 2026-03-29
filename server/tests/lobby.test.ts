import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { roomHandler } from '../src/socket/handlers/roomHandler';
import { gameHandler } from '../src/socket/handlers/gameHandler';
import { rooms } from '../src/socket/rooms';

function createServerPair() {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    roomHandler(io, socket);
    gameHandler(io, socket);
  });

  return new Promise<{ httpServer: ReturnType<typeof createServer>; io: Server; port: number }>(
    (resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        resolve({ httpServer, io, port });
      });
    }
  );
}

function connectClient(port: number): Promise<ClientSocket> {
  const client = ioc(`http://localhost:${port}`, {
    transports: ['websocket'],
    forceNew: true,
  });
  return new Promise((resolve) => {
    client.on('connect', () => resolve(client));
  });
}

function waitForEvent<T = any>(
  socket: ClientSocket | Server,
  event: string,
  timeoutMs = 3000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    (socket as any).once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// Collect N events of a given type into an array
function collectEvents<T = any>(
  socket: ClientSocket,
  event: string,
  count: number,
  timeoutMs = 3000
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout: collected ${results.length}/${count} "${event}" events`));
    }, timeoutMs);

    const handler = (data: T) => {
      results.push(data);
      if (results.length >= count) {
        clearTimeout(timer);
        socket.off(event, handler);
        resolve(results);
      }
    };
    socket.on(event, handler);
  });
}

async function cleanup(
  clients: ClientSocket[],
  io: Server,
  httpServer: ReturnType<typeof createServer>
) {
  for (const c of clients) c.disconnect();
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
}

afterEach(() => {
  rooms.clear();
});

// ─── rejoin-room ───────────────────────────────────────────────────────────────

describe('rejoin-room', () => {
  test('host rejoin emits room:created with host info', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string; playerId: string; playerSide: string; isBotGame: boolean }>(host, 'room:created');

    // Host rejoins (simulates navigating to lobby after create)
    host.emit('rejoin-room', { roomId: created.roomId });
    const rejoined = await waitForEvent(host, 'room:created');

    expect(rejoined.roomId).toBe(created.roomId);
    expect(rejoined.playerId).toBe(created.playerId);
    expect(rejoined.playerSide).toBe('red');
    expect(rejoined.isBotGame).toBe(false);

    // Should NOT receive game:started (room still waiting)
    let gameStartedReceived = false;
    host.on('game:started', () => { gameStartedReceived = true; });
    await new Promise((r) => setTimeout(r, 300));
    expect(gameStartedReceived).toBe(false);

    await cleanup([host], io, httpServer);
  });

  test('non-host player rejoin emits room:joined with player info', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);
    const player = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    player.emit('join-room', { roomId: created.roomId, playerName: 'Bob' });
    const joined = await waitForEvent<{ roomId: string; playerSide: string; isHost: boolean }>(player, 'room:joined');

    // Player rejoins (simulates navigating to lobby after join)
    player.emit('rejoin-room', { roomId: created.roomId });
    const rejoined = await waitForEvent(player, 'room:joined');

    expect(rejoined.roomId).toBe(created.roomId);
    expect(rejoined.playerSide).toBe('blue');
    expect(rejoined.isHost).toBe(false);

    await cleanup([host, player], io, httpServer);
  });

  test('rejoin-room for non-existent room emits error', async () => {
    const { httpServer, io, port } = await createServerPair();
    const client = await connectClient(port);

    client.emit('rejoin-room', { roomId: 'FAKE123' });
    const err = await waitForEvent<{ message: string }>(client, 'error');

    expect(err.message).toContain('Room not found');

    await cleanup([client], io, httpServer);
  });

  test('rejoin-room by unknown player emits error', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);
    const stranger = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    // Stranger tries to rejoin a room they were never in
    stranger.emit('rejoin-room', { roomId: created.roomId });
    const err = await waitForEvent<{ message: string }>(stranger, 'error');

    expect(err.message).toContain('Not authorized');

    await cleanup([host, stranger], io, httpServer);
  });

  test('host rejoin when game already started emits game:started', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);
    const player = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    player.emit('join-room', { roomId: created.roomId, playerName: 'Bob' });
    await waitForEvent(player, 'room:joined');

    // Wait for the first game:started from join-room
    await waitForEvent(host, 'game:started');

    // Host rejoins after game already started — should get room:created + game:started
    const rejoinedAndStarted = Promise.all([
      waitForEvent(host, 'room:created'),
      waitForEvent(host, 'game:started'),
    ]);
    host.emit('rejoin-room', { roomId: created.roomId });
    const [rejoined, started] = await rejoinedAndStarted;

    expect(rejoined.roomId).toBe(created.roomId);
    expect(started.status).toBe('deploying');

    await cleanup([host, player], io, httpServer);
  });

  test('non-host rejoin when game already started emits game:started', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);
    const player = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    // Set up collector for ALL game:started events BEFORE player joins
    const startedCollector = collectEvents<any>(player, 'game:started', 2);

    player.emit('join-room', { roomId: created.roomId, playerName: 'Bob' });
    await waitForEvent(player, 'room:joined');

    // Player rejoins — server should emit room:joined + game:started
    player.emit('rejoin-room', { roomId: created.roomId });
    const rejoined = await waitForEvent(player, 'room:joined');

    // Both game:started events should arrive (1st from join, 2nd from rejoin)
    const startedEvents = await startedCollector;

    expect(rejoined.roomId).toBe(created.roomId);
    expect(rejoined.isHost).toBe(false);
    expect(startedEvents.length).toBe(2);
    expect(startedEvents[0].status).toBe('deploying');
    expect(startedEvents[1].status).toBe('deploying');

    await cleanup([host, player], io, httpServer);
  });

  test('host rejoin does NOT emit game:started when room still waiting', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    // Collect game:started events during rejoin
    let gameStartedCount = 0;
    host.on('game:started', () => { gameStartedCount++; });

    host.emit('rejoin-room', { roomId: created.roomId });
    await waitForEvent(host, 'room:created');

    await new Promise((r) => setTimeout(r, 300));
    expect(gameStartedCount).toBe(0);

    await cleanup([host], io, httpServer);
  });
});

// ─── add-bot ───────────────────────────────────────────────────────────────────

describe('add-bot', () => {
  test('host can add bot to waiting PVP room', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    // Host adds bot via add-bot event (lobby flow)
    host.emit('add-bot', { roomId: created.roomId });
    const started = await waitForEvent<{ status: string }>(host, 'game:started');

    expect(started.status).toBe('deploying');

    const room = rooms.get(created.roomId);
    expect(room!.players).toHaveLength(2);
    expect(room!.players[1].name).toBe('Bot');
    expect(room!.players[1].side).toBe('blue');
    expect(room!.isBotGame).toBe(true);
    expect(room!.botSide).toBe('blue');
    expect(room!.status).toBe('deploying');
    expect(room!.deployedPieces.blue.size).toBe(21);

    await cleanup([host], io, httpServer);
  });

  test('host can add bot without specifying roomId (auto-detect)', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    // Host adds bot WITHOUT roomId - server should auto-detect
    host.emit('add-bot', {});
    const started = await waitForEvent<{ status: string }>(host, 'game:started');

    expect(started.status).toBe('deploying');

    const room = rooms.get(created.roomId);
    expect(room!.isBotGame).toBe(true);
    expect(room!.players).toHaveLength(2);

    await cleanup([host], io, httpServer);
  });

  test('non-host cannot add bot', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);
    const player = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    // Non-host joins the room (room has 2 players, auto-transitions to deploying)
    player.emit('join-room', { roomId: created.roomId, playerName: 'Bob' });
    await waitForEvent(player, 'room:joined');

    // Player tries to add bot — fails because room already started (deploying)
    player.emit('add-bot', { roomId: created.roomId });
    const err = await waitForEvent<{ message: string }>(player, 'error');

    // Room auto-started when 2nd player joined, so status check fires first
    expect(err.message).toMatch(/not the host|already in progress/);

    await cleanup([host, player], io, httpServer);
  });

  test('cannot add bot when room already has 2 players (auto-started)', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);
    const player = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    player.emit('join-room', { roomId: created.roomId, playerName: 'Bob' });
    await waitForEvent(player, 'room:joined');

    // Room auto-started to 'deploying' when 2nd player joined
    // Host tries to add bot — fails because game already started
    host.emit('add-bot', { roomId: created.roomId });
    const err = await waitForEvent<{ message: string }>(host, 'error');

    expect(err.message).toContain('already in progress');

    await cleanup([host, player], io, httpServer);
  });

  test('cannot add bot to a room that is already a bot game', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    // Add bot first time — transitions to deploying
    host.emit('add-bot', { roomId: created.roomId });
    await waitForEvent(host, 'game:started');

    // Try to add another bot — room is already deploying
    host.emit('add-bot', { roomId: created.roomId });
    const err = await waitForEvent<{ message: string }>(host, 'error');

    expect(err.message).toContain('already in progress');

    await cleanup([host], io, httpServer);
  });

  test('cannot add bot to a room that already started (bot mode)', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);

    // Set up listeners BEFORE emitting — both events fire near-synchronously in bot mode
    const events = Promise.all([
      waitForEvent<{ roomId: string }>(host, 'room:created'),
      waitForEvent(host, 'game:started'),
    ]);
    host.emit('create-room', { hostName: 'Alice', isBotMode: true });
    const [created] = await events;

    // Room is already deploying (bot game auto-starts). Try add-bot.
    host.emit('add-bot', { roomId: created.roomId });
    const err = await waitForEvent<{ message: string }>(host, 'error');

    expect(err.message).toContain('already in progress');

    await cleanup([host], io, httpServer);
  });

  test('bot auto-deploys 21 pieces and emits piece:deployed events', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    // Collect piece:deployed events
    const deployedPromise = collectEvents<any>(host, 'piece:deployed', 21);

    host.emit('add-bot', { roomId: created.roomId });
    await waitForEvent(host, 'game:started');
    const deployedPieces = await deployedPromise;

    expect(deployedPieces.length).toBe(21);

    // Verify all bot pieces are in blue zone (rows 5-7)
    for (const dep of deployedPieces) {
      expect(dep.piece.owner).toBe('blue');
      expect(dep.row).toBeGreaterThanOrEqual(5);
      expect(dep.row).toBeLessThanOrEqual(7);
    }

    // Last deployment should have autoDeployComplete: true
    const lastDeploy = deployedPieces[deployedPieces.length - 1];
    expect(lastDeploy.autoDeployComplete).toBe(true);
    expect(lastDeploy.deployedCount).toBe(21);

    await cleanup([host], io, httpServer);
  });

  test('add-bot removes room from public rooms list', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);
    const observer = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    // Room should be in public list
    observer.emit('get-rooms');
    const beforeList = await waitForEvent<any[]>(observer, 'rooms:list');
    expect(beforeList.some((r: any) => r.roomId === created.roomId)).toBe(true);

    // Add bot
    host.emit('add-bot', { roomId: created.roomId });
    await waitForEvent(host, 'game:started');

    // Room should be removed from public list after game starts
    await new Promise((r) => setTimeout(r, 100));
    observer.emit('get-rooms');
    const afterList = await waitForEvent<any[]>(observer, 'rooms:list');
    expect(afterList.some((r: any) => r.roomId === created.roomId)).toBe(false);

    await cleanup([host, observer], io, httpServer);
  });
});

// ─── start-game ────────────────────────────────────────────────────────────────

describe('start-game', () => {
  test('join-room with 2 players auto-starts game (deploying)', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);
    const player = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    // Listen for game:started on both sockets BEFORE player joins
    const startedPromise = Promise.all([
      waitForEvent<{ status: string }>(host, 'game:started'),
      waitForEvent<{ status: string }>(player, 'game:started'),
    ]);

    player.emit('join-room', { roomId: created.roomId, playerName: 'Bob' });
    await waitForEvent(player, 'room:joined');

    const [hostStarted, playerStarted] = await startedPromise;

    expect(hostStarted.status).toBe('deploying');
    expect(playerStarted.status).toBe('deploying');

    const room = rooms.get(created.roomId);
    expect(room!.status).toBe('deploying');

    await cleanup([host, player], io, httpServer);
  });

  test('non-host start-game is silently ignored', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);
    const player = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    player.emit('join-room', { roomId: created.roomId, playerName: 'Bob' });
    await waitForEvent(player, 'room:joined');

    // Consume auto-started game:started events
    await waitForEvent(host, 'game:started');

    // Non-host tries to start — room is already deploying, silently ignored
    let extraGameStarted = false;
    host.on('game:started', () => { extraGameStarted = true; });
    player.emit('start-game');
    await new Promise((r) => setTimeout(r, 300));

    // Should not cause any error or extra game:started
    expect(extraGameStarted).toBe(false);

    await cleanup([host, player], io, httpServer);
  });

  test('cannot start game with only 1 player', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    await waitForEvent(host, 'room:created');

    // Host tries to start alone
    host.emit('start-game');

    let gameStartedReceived = false;
    host.on('game:started', () => { gameStartedReceived = true; });
    await new Promise((r) => setTimeout(r, 500));

    expect(gameStartedReceived).toBe(false);

    const room = rooms.get(Array.from(rooms.keys())[0]);
    expect(room!.status).toBe('waiting');

    await cleanup([host], io, httpServer);
  });
});

// ─── Full lobby flow ───────────────────────────────────────────────────────────

describe('full lobby flow', () => {
  test('PVP: host creates → rejoins → 2nd player joins → rejoins → game starts', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);
    const player = await connectClient(port);

    // 1. Host creates room (on landing page)
    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string; playerSide: string }>(host, 'room:created');
    expect(created.playerSide).toBe('red');

    // 2. Host navigates to lobby and rejoins
    host.emit('rejoin-room', { roomId: created.roomId });
    const hostRejoined = await waitForEvent(host, 'room:created');
    expect(hostRejoined.roomId).toBe(created.roomId);
    expect(hostRejoined.playerSide).toBe('red');
    expect(hostRejoined.isBotGame).toBe(false);

    // Room should still be waiting (no game:started)
    const roomAfterRejoin = rooms.get(created.roomId);
    expect(roomAfterRejoin!.status).toBe('waiting');

    // 3. Set up listeners BEFORE 2nd player joins (game:started fires on both sockets)
    const gameStartedPromise = Promise.all([
      waitForEvent(host, 'game:started'),
      waitForEvent(player, 'game:started'),
    ]);

    // 4. 2nd player joins (from landing page)
    player.emit('join-room-by-id', { roomId: created.roomId, playerName: 'Bob' });
    const playerJoined = await waitForEvent(player, 'room:joined');
    expect(playerJoined.playerSide).toBe('blue');

    // 5. Both should get game:started (auto-start from join-room-by-id)
    const [hostStarted, playerStarted] = await gameStartedPromise;
    expect(hostStarted.status).toBe('deploying');
    expect(playerStarted.status).toBe('deploying');

    // 5. 2nd player navigates to lobby and rejoins (game already started)
    const playerRejoinAndStart = Promise.all([
      waitForEvent(player, 'room:joined'),
      waitForEvent(player, 'game:started'),
    ]);
    player.emit('rejoin-room', { roomId: created.roomId });
    const [playerRejoined, playerRestarted] = await playerRejoinAndStart;
    expect(playerRejoined.isHost).toBe(false);
    expect(playerRestarted.status).toBe('deploying');

    // 6. Verify final room state
    const room = rooms.get(created.roomId);
    expect(room!.players).toHaveLength(2);
    expect(room!.status).toBe('deploying');

    await cleanup([host, player], io, httpServer);
  });

  test('PVP with add-bot: host creates → rejoins → adds bot → game starts', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);

    // 1. Host creates room
    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    // 2. Host navigates to lobby and rejoins
    host.emit('rejoin-room', { roomId: created.roomId });
    const rejoined = await waitForEvent(host, 'room:created');
    expect(rejoined.roomId).toBe(created.roomId);

    // Room still waiting after rejoin
    expect(rooms.get(created.roomId)!.status).toBe('waiting');

    // 3. Host clicks "Add Bot" in lobby
    host.emit('add-bot', { roomId: created.roomId });
    const started = await waitForEvent<{ status: string }>(host, 'game:started');
    expect(started.status).toBe('deploying');

    // 4. Verify room state
    const room = rooms.get(created.roomId);
    expect(room!.players).toHaveLength(2);
    expect(room!.isBotGame).toBe(true);
    expect(room!.status).toBe('deploying');
    expect(room!.deployedPieces.blue.size).toBe(21);

    await cleanup([host], io, httpServer);
  });

  test('host rejoin receives game:started if 2nd player already joined', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);
    const player = await connectClient(port);

    // 1. Host creates room
    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    // 2. 2nd player joins (before host rejoins lobby)
    player.emit('join-room', { roomId: created.roomId, playerName: 'Bob' });
    await waitForEvent(player, 'room:joined');

    // game:started fires on host's socket — consumed by landing page handler
    await waitForEvent(host, 'game:started');

    // 3. Host navigates to lobby and rejoins — game already deploying
    const rejoinedAndStarted = Promise.all([
      waitForEvent(host, 'room:created'),
      waitForEvent(host, 'game:started'),
    ]);
    host.emit('rejoin-room', { roomId: created.roomId });
    const [rejoined, started] = await rejoinedAndStarted;

    expect(rejoined.roomId).toBe(created.roomId);
    expect(started.status).toBe('deploying');

    await cleanup([host, player], io, httpServer);
  });

  test('rejoin correctly identifies host vs non-host', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);
    const player = await connectClient(port);

    host.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(host, 'room:created');

    player.emit('join-room', { roomId: created.roomId, playerName: 'Bob' });
    await waitForEvent(player, 'room:joined');

    // Host rejoin should emit room:created (isHost signal)
    host.emit('rejoin-room', { roomId: created.roomId });
    const hostRejoin = await waitForEvent<{ playerSide: string; isBotGame: boolean }>(host, 'room:created');
    expect(hostRejoin.playerSide).toBe('red');

    // Non-host rejoin should emit room:joined with isHost: false
    player.emit('rejoin-room', { roomId: created.roomId });
    const playerRejoin = await waitForEvent<{ playerSide: string; isHost: boolean }>(player, 'room:joined');
    expect(playerRejoin.playerSide).toBe('blue');
    expect(playerRejoin.isHost).toBe(false);

    await cleanup([host, player], io, httpServer);
  });

  test('bot game: host creates with bot mode → rejoins → gets game:started', async () => {
    const { httpServer, io, port } = await createServerPair();
    const host = await connectClient(port);

    // 1. Host creates bot game
    host.emit('create-room', { hostName: 'Alice', isBotMode: true });
    const created = await waitForEvent<{ roomId: string; isBotGame: boolean }>(host, 'room:created');
    expect(created.isBotGame).toBe(true);
    await waitForEvent(host, 'game:started');

    // 2. Host navigates to lobby and rejoins (game already deploying)
    const rejoinedAndStarted = Promise.all([
      waitForEvent(host, 'room:created'),
      waitForEvent(host, 'game:started'),
    ]);
    host.emit('rejoin-room', { roomId: created.roomId });
    const [rejoined, started] = await rejoinedAndStarted;

    expect(rejoined.roomId).toBe(created.roomId);
    expect(rejoined.isBotGame).toBe(true);
    expect(started.status).toBe('deploying');

    // 3. Verify room state
    const room = rooms.get(created.roomId);
    expect(room!.isBotGame).toBe(true);
    expect(room!.status).toBe('deploying');
    expect(room!.deployedPieces.blue.size).toBe(21);

    await cleanup([host], io, httpServer);
  });
});
