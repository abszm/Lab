import type { Server, Socket } from "socket.io";
import { GameManager } from "../games/GameManager.js";
import { InMemoryStore } from "../rooms/inMemoryStore.js";
import type { Penalty, RewardCardOption } from "../types/index.js";

interface Dependencies {
  io: Server;
  gameManager: GameManager;
  store: InMemoryStore;
}

const activePenalties = new Map<string, Penalty>();
const penaltyTimers = new Map<string, NodeJS.Timeout>();
const restartRequests = new Map<string, string>();

interface PendingCardReveal {
  winnerId: string;
  options: Array<{
    id: string;
    cellId: string;
    level: 1 | 2 | 3 | 4;
    title: string;
    description: string;
  }>;
}

interface RevealedCardState {
  winnerId: string;
  loserId: string;
  card: {
    id: string;
    cellId: string;
    level: 1 | 2 | 3 | 4;
    title: string;
    description: string;
  };
}

const pendingCardReveals = new Map<string, PendingCardReveal>();
const revealedCards = new Map<string, RevealedCardState>();

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

function buildEnhancedCardPayload(roomCode: string, options: RewardCardOption[], deps: Dependencies): PendingCardReveal | null {
  const state = deps.gameManager.getRoomGameState(roomCode);
  const room = deps.store.getRoom(roomCode);
  if (!state || !room) {
    return null;
  }

  const board = state.board as {
    cells?: Array<{ id: string; taskTitle: string; taskDescription: string; taskLevel: 1 | 2 | 3 | 4 }>;
    winner?: string | null;
  };

  if (!board.cells || !board.winner) {
    return null;
  }

  const mapped = options.map((option) => {
    const cell = board.cells?.find((item) => item.id === option.cellId);
    return {
      id: option.id,
      cellId: option.cellId,
      level: cell?.taskLevel ?? option.level,
      title: `强化：${cell?.taskTitle ?? "占位任务"}`,
      description: `${cell?.taskDescription ?? "待填写任务文案"}（强化版）`
    };
  });

  return {
    winnerId: board.winner,
    options: mapped
  };
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

        if (outcome.result.winner && outcome.result.cardOptions?.length) {
          const pending = buildEnhancedCardPayload(session.roomCode, outcome.result.cardOptions, deps);
          if (pending) {
            pendingCardReveals.set(session.roomCode, pending);
            deps.io.to(session.roomCode).emit("game:card:draft", {
              winnerId: pending.winnerId,
              cards: outcome.result.cardOptions
            });
          }
        }
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

  socket.on("game:restart:request", () => {
    const session = deps.store.getSessionBySocket(socket.id);
    if (!session) {
      socket.emit("room:error", { code: "SESSION_NOT_FOUND", message: "SESSION_NOT_FOUND" });
      return;
    }

    restartRequests.set(session.roomCode, session.playerId);
    deps.io.to(session.roomCode).emit("game:restart:requested", { fromPlayerId: session.playerId });
  });

  socket.on("game:restart:respond", ({ accept }: { accept: boolean }) => {
    const session = deps.store.getSessionBySocket(socket.id);
    if (!session) {
      socket.emit("room:error", { code: "SESSION_NOT_FOUND", message: "SESSION_NOT_FOUND" });
      return;
    }

    const requesterId = restartRequests.get(session.roomCode);
    if (!requesterId || requesterId === session.playerId) {
      socket.emit("room:error", { code: "RESTART_REQUEST_NOT_FOUND", message: "RESTART_REQUEST_NOT_FOUND" });
      return;
    }

    if (!accept) {
      restartRequests.delete(session.roomCode);
      deps.io.to(session.roomCode).emit("game:restart:result", {
        accepted: false,
        requesterId,
        responderId: session.playerId
      });
      return;
    }

    const room = deps.store.getRoom(session.roomCode);
    if (!room || room.players.length < 2) {
      restartRequests.delete(session.roomCode);
      socket.emit("room:error", { code: "ROOM_NOT_READY", message: "ROOM_NOT_READY" });
      return;
    }

    try {
      deps.gameManager.resetRoomGame(session.roomCode, room.gameId, room.players.map((player) => player.id));
      const nextState = deps.gameManager.getRoomGameState(session.roomCode);
      restartRequests.delete(session.roomCode);
      activePenalties.delete(session.roomCode);
      clearPenaltyTimer(session.roomCode);
      pendingCardReveals.delete(session.roomCode);
      revealedCards.delete(session.roomCode);

      if (nextState) {
        deps.io.to(session.roomCode).emit("game:state", { state: nextState });
      }

      deps.io.to(session.roomCode).emit("game:restart:result", {
        accepted: true,
        requesterId,
        responderId: session.playerId
      });
    } catch (error) {
      socket.emit("room:error", { code: (error as Error).message, message: (error as Error).message });
    }
  });

  socket.on("game:card:pick", ({ cardId }: { cardId: string }) => {
    const session = deps.store.getSessionBySocket(socket.id);
    if (!session) {
      socket.emit("room:error", { code: "SESSION_NOT_FOUND", message: "SESSION_NOT_FOUND" });
      return;
    }

    const pending = pendingCardReveals.get(session.roomCode);
    if (!pending) {
      socket.emit("room:error", { code: "CARD_DRAFT_NOT_FOUND", message: "CARD_DRAFT_NOT_FOUND" });
      return;
    }

    if (pending.winnerId !== session.playerId) {
      socket.emit("room:error", { code: "ONLY_WINNER_CAN_PICK_CARD", message: "ONLY_WINNER_CAN_PICK_CARD" });
      return;
    }

    const selected = pending.options.find((item) => item.id === cardId);
    if (!selected) {
      socket.emit("room:error", { code: "CARD_NOT_FOUND", message: "CARD_NOT_FOUND" });
      return;
    }

    const room = deps.store.getRoom(session.roomCode);
    if (!room) {
      socket.emit("room:error", { code: "ROOM_NOT_FOUND", message: "ROOM_NOT_FOUND" });
      return;
    }

    const loserId = room.players.find((player) => player.id !== session.playerId)?.id;
    if (!loserId) {
      socket.emit("room:error", { code: "LOSER_NOT_FOUND", message: "LOSER_NOT_FOUND" });
      return;
    }

    revealedCards.set(session.roomCode, {
      winnerId: session.playerId,
      loserId,
      card: selected
    });
    pendingCardReveals.delete(session.roomCode);

    deps.io.to(session.roomCode).emit("game:card:revealed", {
      winnerId: session.playerId,
      loserId,
      card: selected
    });
  });

  socket.on("game:card:ack", () => {
    const session = deps.store.getSessionBySocket(socket.id);
    if (!session) {
      socket.emit("room:error", { code: "SESSION_NOT_FOUND", message: "SESSION_NOT_FOUND" });
      return;
    }

    const revealed = revealedCards.get(session.roomCode);
    if (!revealed) {
      socket.emit("room:error", { code: "CARD_NOT_REVEALED", message: "CARD_NOT_REVEALED" });
      return;
    }

    if (revealed.loserId !== session.playerId) {
      socket.emit("room:error", { code: "ONLY_LOSER_CAN_ACK_CARD", message: "ONLY_LOSER_CAN_ACK_CARD" });
      return;
    }

    deps.io.to(session.roomCode).emit("game:card:acknowledged", { byPlayerId: session.playerId });
    revealedCards.delete(session.roomCode);
  });
}
