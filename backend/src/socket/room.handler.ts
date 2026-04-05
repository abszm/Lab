import type { Server, Socket } from "socket.io";
import { randomUUID } from "node:crypto";
import { RoomEngine } from "../rooms/RoomEngine.js";
import { InMemoryStore } from "../rooms/inMemoryStore.js";
import { GameManager } from "../games/GameManager.js";

interface Dependencies {
  io: Server;
  roomEngine: RoomEngine;
  gameManager: GameManager;
  store: InMemoryStore;
  disconnectGraceMs: number;
}

const disconnectTimers = new Map<string, NodeJS.Timeout>();

function timerKey(roomCode: string, playerId: string): string {
  return `${roomCode}:${playerId}`;
}

function clearDisconnectTimer(roomCode: string, playerId: string): void {
  const key = timerKey(roomCode, playerId);
  const timer = disconnectTimers.get(key);
  if (!timer) {
    return;
  }
  clearTimeout(timer);
  disconnectTimers.delete(key);
}

function buildPlayerId(socket: Socket): string {
  return socket.handshake.auth?.playerId ?? socket.handshake.query.playerId?.toString() ?? randomUUID();
}

export function roomHandler(socket: Socket, deps: Dependencies): void {
  const playerId = buildPlayerId(socket);

  const resumeSession = deps.store.getSessionByPlayer(playerId);
  if (resumeSession) {
    deps.store.updateSocket(playerId, socket.id);
    clearDisconnectTimer(resumeSession.roomCode, playerId);

    const room = deps.roomEngine.reconnectPlayer(resumeSession.roomCode, playerId);
    if (room) {
      socket.join(room.code);
      socket.emit("room:joined", { room, reconnected: true });
      deps.io.to(room.code).emit("player:reconnected", { playerId });
      deps.io.to(room.code).emit("room:state", { room });
    }
  }

  socket.on("room:create", ({ gameId }: { gameId: string }) => {
    try {
      if (deps.store.hasSessionByPlayer(playerId)) {
        throw new Error("ALREADY_IN_GAME");
      }

      const room = deps.roomEngine.createRoom(playerId, gameId);
      deps.store.setSession(playerId, room.code, socket.id);
      socket.join(room.code);
      socket.emit("room:created", { code: room.code });
      socket.emit("room:state", { room });
    } catch (error) {
      socket.emit("room:error", { code: "CREATE_FAILED", message: (error as Error).message });
    }
  });

  socket.on("room:join", ({ code }: { code: string }) => {
    try {
      const session = deps.store.getSessionByPlayer(playerId);
      if (session && session.roomCode !== code) {
        throw new Error("ALREADY_IN_GAME");
      }

      const room = deps.roomEngine.joinRoom(code, playerId);
      deps.store.setSession(playerId, code, socket.id);
      socket.join(code);
      clearDisconnectTimer(code, playerId);

      if (room.players.length === 2 && !deps.gameManager.hasRoomGame(code)) {
        deps.gameManager.initRoomGame(code, room.gameId, room.players.map((item) => item.id));
      }

      const gameState = deps.gameManager.getRoomGameState(code);
      if (gameState) {
        deps.io.to(code).emit("game:state", { state: gameState });
      }

      deps.io.to(code).emit("room:joined", { room });
      deps.io.to(code).emit("room:state", { room });
    } catch (error) {
      socket.emit("room:error", { code: (error as Error).message, message: (error as Error).message });
    }
  });

  socket.on("room:leave", () => {
    const session = deps.store.getSessionBySocket(socket.id);
    if (!session) {
      return;
    }

    clearDisconnectTimer(session.roomCode, session.playerId);
    deps.store.removeSessionByPlayer(session.playerId);
    deps.roomEngine.leaveRoom(session.roomCode, session.playerId);
    socket.leave(session.roomCode);

    const room = deps.roomEngine.getRoom(session.roomCode);
    if (!room || room.players.length < 2) {
      deps.gameManager.closeRoom(session.roomCode);
    }

    if (!room) {
      deps.io.to(session.roomCode).emit("room:closed", { reason: "manual_leave" });
    }
    deps.io.to(session.roomCode).emit("room:state", { room });
  });

  socket.on("disconnect", () => {
    const session = deps.store.getSessionBySocket(socket.id);
    if (!session) {
      return;
    }

    const disconnectedRoom = deps.roomEngine.markDisconnected(session.roomCode, session.playerId);
    if (!disconnectedRoom) {
      deps.store.removeSessionByPlayer(session.playerId);
      return;
    }

    deps.io.to(session.roomCode).emit("player:disconnected", { playerId: session.playerId });
    deps.io.to(session.roomCode).emit("room:state", { room: disconnectedRoom });

    clearDisconnectTimer(session.roomCode, session.playerId);
    const timeout = setTimeout(() => {
      const latest = deps.store.getSessionByPlayer(session.playerId);
      if (!latest || latest.socketId !== session.socketId) {
        return;
      }

      deps.store.removeSessionByPlayer(session.playerId);
      deps.roomEngine.leaveRoom(session.roomCode, session.playerId);

      const room = deps.roomEngine.getRoom(session.roomCode);
      if (!room || room.players.length < 2) {
        deps.gameManager.closeRoom(session.roomCode);
      }

      deps.io.to(session.roomCode).emit("room:closed", { reason: "player_timeout", playerId: session.playerId });
      deps.io.to(session.roomCode).emit("room:state", { room });
      disconnectTimers.delete(timerKey(session.roomCode, session.playerId));
    }, deps.disconnectGraceMs);

    timeout.unref();
    disconnectTimers.set(timerKey(session.roomCode, session.playerId), timeout);
  });
}
