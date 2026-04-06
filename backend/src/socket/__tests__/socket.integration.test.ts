import { createServer, type Server as HttpServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { Server } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { roomHandler } from "../room.handler.js";
import { gameHandler } from "../game.handler.js";
import { InMemoryStore } from "../../rooms/inMemoryStore.js";
import { RoomEngine } from "../../rooms/RoomEngine.js";
import { GameManager } from "../../games/GameManager.js";

interface RunningServer {
  httpServer: HttpServer;
  io: Server;
  baseUrl: string;
}

function waitEvent<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });
}

async function startSocketServer(): Promise<RunningServer> {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  const store = new InMemoryStore();
  const roomEngine = new RoomEngine(store);
  const gameManager = new GameManager();
  const disconnectGraceMs = 60;

  io.on("connection", (socket) => {
    const deps = { io, store, roomEngine, gameManager, disconnectGraceMs };
    roomHandler(socket, deps);
    gameHandler(socket, deps);
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => resolve());
  });

  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("INVALID_SERVER_ADDRESS");
  }

  return {
    httpServer,
    io,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

function createClient(baseUrl: string, playerId: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = ioClient(baseUrl, {
      transports: ["websocket"],
      auth: { playerId }
    });

    client.once("connect", () => resolve(client));
    client.once("connect_error", (error) => reject(error));
  });
}

async function closeClient(socket: ClientSocket): Promise<void> {
  await new Promise<void>((resolve) => {
    socket.once("disconnect", () => resolve());
    socket.disconnect();
  });
}

async function closeServer(server: RunningServer): Promise<void> {
  server.io.removeAllListeners();
  server.io.close();
  await new Promise<void>((resolve, reject) => {
    server.httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function createRawClient(baseUrl: string, playerId: string): ClientSocket {
  return ioClient(baseUrl, {
    transports: ["websocket"],
    auth: { playerId }
  });
}

async function waitConnected(socket: ClientSocket): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", (error) => reject(error));
  });
}

let running: RunningServer | null = null;
const clients: ClientSocket[] = [];

afterEach(async () => {
  while (clients.length > 0) {
    const socket = clients.pop();
    if (socket && socket.connected) {
      await closeClient(socket);
    }
  }
  if (running) {
    await closeServer(running);
    running = null;
  }
});

describe("Socket integration", () => {
  it("creates room and allows second player to join", async () => {
    running = await startSocketServer();
    const host = await createClient(running.baseUrl, "host-player");
    clients.push(host);

    host.emit("room:create", { gameId: "rock-paper-scissors" });
    const created = await waitEvent<{ code: string }>(host, "room:created");

    const guest = await createClient(running.baseUrl, "guest-player");
    clients.push(guest);

    const hostJoined = waitEvent<{ room: { players: Array<{ id: string }>; status: string } }>(host, "room:joined");
    guest.emit("room:join", { code: created.code });
    const joined = await hostJoined;

    expect(joined.room.players).toHaveLength(2);
    expect(joined.room.status).toBe("playing");
  });

  it("returns SESSION_NOT_FOUND when move sent without room session", async () => {
    running = await startSocketServer();
    const player = await createClient(running.baseUrl, "solo-player");
    clients.push(player);

    const roomError = waitEvent<{ code: string; message: string }>(player, "room:error");
    player.emit("game:move", { move: { action: "rock" } });
    const payload = await roomError;

    expect(payload.code).toBe("SESSION_NOT_FOUND");
  });

  it("broadcasts game result and penalty after both players move", async () => {
    running = await startSocketServer();
    const host = await createClient(running.baseUrl, "p1");
    const guest = await createClient(running.baseUrl, "p2");
    clients.push(host, guest);

    host.emit("room:create", { gameId: "rock-paper-scissors" });
    const created = await waitEvent<{ code: string }>(host, "room:created");

    const joinedOnHost = waitEvent<{ room: { code: string } }>(host, "room:joined");
    guest.emit("room:join", { code: created.code });
    await joinedOnHost;

    host.emit("game:move", { move: { action: "rock" } });
    const resultEvent = waitEvent<{ result: { winner: string | null; winGap: number } }>(host, "game:result");
    const cardDraftOnHost = waitEvent<{ winnerId: string; loserId: string; cards: Array<{ id: string }> }>(host, "game:card:draft");
    const penaltyEvent = waitEvent<{ penalty: { id: string } }>(host, "penalty:trigger");
    guest.emit("game:move", { move: { action: "scissors" } });

    const result = await resultEvent;
    const draft = await cardDraftOnHost;
    guest.emit("game:card:pick", { cardId: draft.cards[0].id });
    const penalty = await penaltyEvent;

    expect(result.result.winner).toBe("p1");
    expect(result.result.winGap).toBeGreaterThanOrEqual(1);
    expect(draft.loserId).toBe("p2");
    expect(draft.cards.length).toBe(5);
    expect(penalty.penalty.id).toBeTruthy();
  });

  it("supports reconnect before timeout", async () => {
    running = await startSocketServer();
    const host = await createClient(running.baseUrl, "host-a");
    const guest = await createClient(running.baseUrl, "guest-a");
    clients.push(host, guest);

    host.emit("room:create", { gameId: "rock-paper-scissors" });
    const created = await waitEvent<{ code: string }>(host, "room:created");

    const joinedOnHost = waitEvent<{ room: { code: string } }>(host, "room:joined");
    guest.emit("room:join", { code: created.code });
    await joinedOnHost;

    await closeClient(guest);
    const guestReconnect = createRawClient(running.baseUrl, "guest-a");
    clients.push(guestReconnect);
    const rejoinedPromise = waitEvent<{ room: { code: string; players: Array<{ id: string; isConnected: boolean }> }; reconnected?: boolean }>(
      guestReconnect,
      "room:joined"
    );
    await waitConnected(guestReconnect);
    const rejoined = await rejoinedPromise;

    expect(rejoined.reconnected).toBe(true);
    expect(rejoined.room.code).toBe(created.code);
    expect(rejoined.room.players.find((item) => item.id === "guest-a")?.isConnected).toBe(true);
  });

  it("closes room on disconnect timeout", async () => {
    running = await startSocketServer();
    const host = await createClient(running.baseUrl, "host-b");
    const guest = await createClient(running.baseUrl, "guest-b");
    clients.push(host, guest);

    host.emit("room:create", { gameId: "rock-paper-scissors" });
    const created = await waitEvent<{ code: string }>(host, "room:created");

    const joinedOnHost = waitEvent<{ room: { code: string } }>(host, "room:joined");
    guest.emit("room:join", { code: created.code });
    await joinedOnHost;

    const closedEvent = waitEvent<{ reason: string; playerId: string }>(host, "room:closed");
    await closeClient(guest);
    const closed = await closedEvent;

    expect(closed.reason).toBe("player_timeout");
    expect(closed.playerId).toBe("guest-b");
  });
});
