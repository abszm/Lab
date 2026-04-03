import type { Server, Socket } from "socket.io";
import { GameManager } from "../games/GameManager.js";
import { InMemoryStore } from "../rooms/inMemoryStore.js";
import type { Penalty } from "../types/index.js";

interface Dependencies {
  io: Server;
  gameManager: GameManager;
  store: InMemoryStore;
}

const activePenalties = new Map<string, Penalty>();
const penaltyTimers = new Map<string, NodeJS.Timeout>();

function clearPenaltyTimer(roomCode: string): void {
  const timer = penaltyTimers.get(roomCode);
  if (!timer) {
    return;
  }
  clearTimeout(timer);
  penaltyTimers.delete(roomCode);
}

function setActivePenalty(io: Server, roomCode: string, penalty: Penalty): void {
  activePenalties.set(roomCode, penalty);
  clearPenaltyTimer(roomCode);

  if (penalty.duration <= 0) {
    return;
  }

  const timer = setTimeout(() => {
    activePenalties.delete(roomCode);
    penaltyTimers.delete(roomCode);
    io.to(roomCode).emit("penalty:timeout", { reason: "timeout" });
  }, penalty.duration * 1000);

  timer.unref();
  penaltyTimers.set(roomCode, timer);
}

export function gameHandler(socket: Socket, deps: Dependencies): void {
  socket.on("game:move", ({ move }: { move: { action: string } }) => {
    const session = deps.store.getSessionBySocket(socket.id);
    if (!session) {
      socket.emit("room:error", { code: "SESSION_NOT_FOUND", message: "SESSION_NOT_FOUND" });
      return;
    }

    if (activePenalties.has(session.roomCode)) {
      socket.emit("room:error", { code: "PENALTY_ACTIVE", message: "PENALTY_ACTIVE" });
      return;
    }

    try {
      const outcome = deps.gameManager.applyMove(session.roomCode, {
        playerId: session.playerId,
        action: move.action,
        timestamp: Date.now()
      });

      deps.io.to(session.roomCode).emit("game:state", { state: outcome.state });
      if (outcome.result) {
        deps.io.to(session.roomCode).emit("game:result", { result: outcome.result });
      }
      if (outcome.penalty) {
        setActivePenalty(deps.io, session.roomCode, outcome.penalty);
        deps.io.to(session.roomCode).emit("penalty:trigger", { penalty: outcome.penalty });
      }
    } catch (error) {
      socket.emit("room:error", { code: (error as Error).message, message: (error as Error).message });
    }
  });

  socket.on("penalty:complete", () => {
    const session = deps.store.getSessionBySocket(socket.id);
    if (!session) {
      socket.emit("room:error", { code: "SESSION_NOT_FOUND", message: "SESSION_NOT_FOUND" });
      return;
    }

    if (!activePenalties.has(session.roomCode)) {
      return;
    }

    activePenalties.delete(session.roomCode);
    clearPenaltyTimer(session.roomCode);
    deps.io.to(session.roomCode).emit("penalty:timeout", { reason: "completed" });
  });
}
