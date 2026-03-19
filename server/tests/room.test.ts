import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { roomHandler } from '../src/socket/handlers/roomHandler';
import { rooms } from '../src/socket/rooms';

// Helper: create a server on a random port, register roomHandler per-connection
function createServerPair() {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    roomHandler(io, socket);
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

// Helper: connect a client to the given port
function connectClient(port: number): Promise<ClientSocket> {
  const client = ioc(`http://localhost:${port}`, {
    transports: ['websocket'],
    forceNew: true,
  });
  return new Promise((resolve) => {
    client.on('connect', () => resolve(client));
  });
}

// Helper: wait for a specific event with timeout
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

describe('Room Handler', () => {
  test('create-room generates 6-character alphanumeric room code', async () => {
    const { httpServer, io, port } = await createServerPair();
    const client = await connectClient(port);

    client.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const data = await waitForEvent(client, 'room:created');

    expect(data.roomId).toBeDefined();
    expect(data.roomId.length).toBe(6);
    expect(/^[A-Za-z0-9]+$/.test(data.roomId)).toBe(true);
    expect(data.playerSide).toBe('red');
    expect(data.playerId).toBeDefined();

    await cleanup([client], io, httpServer);
  });

  test('create-room stores player in rooms Map', async () => {
    const { httpServer, io, port } = await createServerPair();
    const client = await connectClient(port);

    client.emit('create-room', { hostName: 'General Kenobi', isBotMode: false });
    const data = await waitForEvent(client, 'room:created');

    const room = rooms.get(data.roomId);
    expect(room).toBeDefined();
    expect(room!.players).toHaveLength(1);
    expect(room!.players[0].name).toBe('General Kenobi');
    expect(room!.players[0].side).toBe('red');
    expect(room!.players[0].id).toBe(data.playerId);

    await cleanup([client], io, httpServer);
  });

  test('join-room adds player to existing room as blue', async () => {
    const { httpServer, io, port } = await createServerPair();
    const client1 = await connectClient(port);

    client1.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(client1, 'room:created');

    const client2 = await connectClient(port);
    client2.emit('join-room', { roomId: created.roomId, playerName: 'Bob' });
    const joined = await waitForEvent(client2, 'room:joined');

    expect(joined.roomId).toBe(created.roomId);
    expect(joined.playerSide).toBe('blue');
    expect(joined.playerId).toBeDefined();

    // Verify server state
    const room = rooms.get(created.roomId);
    expect(room!.players).toHaveLength(2);
    expect(room!.players[1].name).toBe('Bob');

    await cleanup([client1, client2], io, httpServer);
  });

  test('join-room fails for non-existent room', async () => {
    const { httpServer, io, port } = await createServerPair();
    const client = await connectClient(port);

    client.emit('join-room', { roomId: 'NOTEXIST', playerName: 'Alice' });
    const err = await waitForEvent<{ message: string }>(client, 'error');

    expect(err.message).toContain('Room not found');

    await cleanup([client], io, httpServer);
  });

  test('leave-room removes player and deletes empty room', async () => {
    const { httpServer, io, port } = await createServerPair();
    const client = await connectClient(port);

    client.emit('create-room', { hostName: 'Alice', isBotMode: false });
    const created = await waitForEvent<{ roomId: string }>(client, 'room:created');

    // Room exists with 1 player
    expect(rooms.has(created.roomId)).toBe(true);

    client.emit('leave-room');

    // Wait briefly for server to process
    await new Promise((r) => setTimeout(r, 100));

    // Room should be deleted (only player left)
    expect(rooms.has(created.roomId)).toBe(false);

    await cleanup([client], io, httpServer);
  });

  test('create-room bot mode adds synthetic bot player and emits game:started', async () => {
    const { httpServer, io, port } = await createServerPair();
    const client = await connectClient(port);

    // Register both listeners BEFORE emitting — game:started fires synchronously after room:created
    const createdPromise = waitForEvent<{ roomId: string; isBotGame: boolean }>(client, 'room:created');
    const startedPromise = waitForEvent<{ status: string }>(client, 'game:started');

    client.emit('create-room', { hostName: 'Alice', isBotMode: true });

    const [created, started] = await Promise.all([createdPromise, startedPromise]);

    expect(created.isBotGame).toBe(true);
    expect(started.status).toBe('deploying');

    // Verify server state
    const room = rooms.get(created.roomId);
    expect(room!.players).toHaveLength(2); // human + bot
    expect(room!.players[1].name).toBe('Bot');
    expect(room!.players[1].side).toBe('blue');
    expect(room!.status).toBe('deploying');
    expect(room!.isBotGame).toBe(true);
    expect(room!.botSide).toBe('blue');

    // Bot should have 21 deployed pieces
    expect(room!.deployedPieces.blue.size).toBe(21);

    await cleanup([client], io, httpServer);
  });
});
