import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { roomHandler } from "./socket/room.handler.js";
import { gameHandler } from "./socket/game.handler.js";
import { listGames } from "./games/registry.js";
import { InMemoryStore } from "./rooms/inMemoryStore.js";
import { RoomEngine } from "./rooms/RoomEngine.js";
import { GameManager } from "./games/GameManager.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_PATH = join(__dirname, "../../frontend/dist");

const httpServer = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/api/health") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
    return;
  }

  if (req.method === "GET" && req.url === "/api/games") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(listGames().map((item) => ({ id: item.id, name: item.name }))));
    return;
  }

  const staticPath = join(DIST_PATH, req.url === "/" ? "index.html" : req.url || "index.html");
  if (existsSync(staticPath) && req.method === "GET") {
    const ext = staticPath.split(".").pop();
    const contentTypes: Record<string, string> = {
      html: "text/html",
      js: "application/javascript",
      css: "text/css",
      json: "application/json",
      png: "image/png",
      jpg: "image/jpeg",
      ico: "image/x-icon"
    };
    res.setHeader("Content-Type", contentTypes[ext || "html"] || "text/plain");
    res.end(readFileSync(staticPath));
    return;
  }

  const indexPath = join(DIST_PATH, "index.html");
  if (existsSync(indexPath)) {
    res.setHeader("Content-Type", "text/html");
    res.end(readFileSync(indexPath));
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ code: "NOT_FOUND", message: "NOT_FOUND" }));
});
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const store = new InMemoryStore();
const roomEngine = new RoomEngine(store);
const gameManager = new GameManager();
const disconnectGraceMs = Number(process.env.DISCONNECT_GRACE_MS ?? 5 * 60 * 1000);

io.on("connection", (socket) => {
  const deps = { io, store, roomEngine, gameManager, disconnectGraceMs };
  roomHandler(socket, deps);
  gameHandler(socket, deps);
});

const port = Number(process.env.PORT ?? 3001);
httpServer.listen(port, () => {
  process.stdout.write(`Backend listening on http://localhost:${port}\n`);
});
