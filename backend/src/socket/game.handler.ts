import type { Server, Socket } from "socket.io";
import { GameManager } from "../games/GameManager.js";
import { ROULETTE_TASK_POOL } from "../games/rouletteTaskPool.js";
import { InMemoryStore } from "../rooms/inMemoryStore.js";
import type { Penalty, RewardCardOption } from "../types/index.js";
import { GAME_PENALTY_DATA } from "../penalty/data.js";

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
  loserId: string;
  options: Array<{
    id: string;
    penalty: Penalty;
  }>;
}

interface RevealedCardState {
  winnerId: string;
  loserId: string;
  card: {
    id: string;
    level: 1 | 2 | 3 | 4;
    title: string;
    description: string;
    duration: number;
    type: Penalty["type"];
  };
}

const pendingCardReveals = new Map<string, PendingCardReveal>();
const revealedCards = new Map<string, RevealedCardState>();

interface RouletteRuntime {
  angle: number;
  isSpinning: boolean;
}

const rouletteStateByRoom = new Map<string, RouletteRuntime>();
const rouletteTimers = new Map<string, NodeJS.Timeout>();

const ROULETTE_SECTORS = ROULETTE_TASK_POOL.map((item) => item.color);
const ROULETTE_DURATION_MS = 4000;

function normalizeAngle(value: number): number {
  return ((value % 360) + 360) % 360;
}

function getRouletteState(roomCode: string): RouletteRuntime {
  const existing = rouletteStateByRoom.get(roomCode);
  if (existing) {
    return existing;
  }

  const runtime: RouletteRuntime = { angle: 0, isSpinning: false };
  rouletteStateByRoom.set(roomCode, runtime);
  return runtime;
}

function ensureRouletteGameOrEmitError(socket: Socket, deps: Dependencies, roomCode: string): boolean {
  const room = deps.store.getRoom(roomCode);
  if (!room || room.gameId !== "drinking-roulette") {
    socket.emit("room:error", { code: "ROULETTE_ONLY_GAME", message: "ROULETTE_ONLY_GAME" });
    return false;
  }
  return true;
}

function clearRouletteTimer(roomCode: string): void {
  const timer = rouletteTimers.get(roomCode);
  if (!timer) {
    return;
  }
  clearTimeout(timer);
  rouletteTimers.delete(roomCode);
}

function resolveRouletteResultIndex(finalAngle: number): number {
  const sectorAngle = 360 / ROULETTE_SECTORS.length;
  const pointerAngle = normalizeAngle(360 - normalizeAngle(finalAngle));
  return Math.floor(pointerAngle / sectorAngle) % ROULETTE_SECTORS.length;
}

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

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPenaltyCardDraft(gameId: string, winnerId: string, loserId: string, winGap: number): PendingCardReveal | null {
  const levels = GAME_PENALTY_DATA[gameId];
  if (!levels || levels.length === 0) {
    return null;
  }

  const level = levels.find((item) => winGap >= item.minGap && winGap <= item.maxGap) ?? levels[levels.length - 1];
  const basePool = level.items.length > 0 ? level.items : levels.flatMap((item) => item.items);
  if (basePool.length === 0) {
    return null;
  }

  const shuffled = shuffleArray(basePool);
  const mapped = Array.from({ length: 5 }, (_, index) => {
    const selected = shuffled[index % shuffled.length];
    return {
      id: `penalty-card-${index + 1}-${selected.id}`,
      penalty: selected
    };
  });

  return {
    winnerId,
    loserId,
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
        const room = deps.store.getRoom(session.roomCode);
        if (room) {
          room.players = room.players.map((player) => ({
            ...player,
            score: outcome.result?.scores[player.id] ?? player.score
          }));
          deps.store.setRoom(session.roomCode, room);
          deps.io.to(session.roomCode).emit("room:state", { room });
        }

        const loserId = room?.players.find((player) => player.id !== outcome.result?.winner)?.id;
        const shouldUsePenaltyCards = Boolean(
          room
            && room.gameId !== "drinking-roulette"
            && outcome.result.winner
            && !outcome.result.isDraw
            && loserId
        );

        if (shouldUsePenaltyCards) {
          const pending = buildPenaltyCardDraft(room!.gameId, outcome.result.winner!, loserId!, outcome.result.winGap);
          if (pending) {
            const cardOptions: RewardCardOption[] = pending.options.map((item) => ({
              id: item.id,
              cellId: "",
              level: item.penalty.level,
              displayName: `盲选卡牌 ${item.id.split("-")[2]}`
            }));

            outcome.result.cardOptions = cardOptions;
            pendingCardReveals.set(session.roomCode, pending);
            deps.io.to(session.roomCode).emit("game:card:draft", {
              winnerId: pending.winnerId,
              loserId: pending.loserId,
              cards: cardOptions
            });
          }
        }

        deps.io.to(session.roomCode).emit("game:result", { result: outcome.result });

        if (shouldUsePenaltyCards) {
          return;
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

  socket.on("game:roulette:sync-request", () => {
    const session = deps.store.getSessionBySocket(socket.id);
    if (!session) {
      socket.emit("room:error", { code: "SESSION_NOT_FOUND", message: "SESSION_NOT_FOUND" });
      return;
    }

    if (!ensureRouletteGameOrEmitError(socket, deps, session.roomCode)) {
      return;
    }

    const runtime = getRouletteState(session.roomCode);
    socket.emit("game:roulette:state", {
      angle: runtime.angle,
      sectors: ROULETTE_SECTORS
    });
  });

  socket.on("game:roulette:spin-request", () => {
    const session = deps.store.getSessionBySocket(socket.id);
    if (!session) {
      socket.emit("room:error", { code: "SESSION_NOT_FOUND", message: "SESSION_NOT_FOUND" });
      return;
    }

    const room = deps.store.getRoom(session.roomCode);
    if (!room || room.players.length < 2) {
      socket.emit("room:error", { code: "ROOM_NOT_READY", message: "ROOM_NOT_READY" });
      return;
    }

    if (room.gameId !== "drinking-roulette") {
      socket.emit("room:error", { code: "ROULETTE_ONLY_GAME", message: "ROULETTE_ONLY_GAME" });
      return;
    }

    const runtime = getRouletteState(session.roomCode);
    if (runtime.isSpinning) {
      socket.emit("room:error", { code: "ROULETTE_SPINNING", message: "ROULETTE_SPINNING" });
      return;
    }

    const delta = 1800 + Math.random() * 360;
    const targetAngle = runtime.angle + delta;
    const resultIndex = resolveRouletteResultIndex(targetAngle);
    const resultTask = ROULETTE_TASK_POOL[resultIndex]?.title ?? "未命中任务";

    runtime.isSpinning = true;
    runtime.angle = targetAngle;

    deps.io.to(session.roomCode).emit("game:roulette:spin-start", {
      angle: targetAngle,
      durationMs: ROULETTE_DURATION_MS,
      sectors: ROULETTE_SECTORS,
      resultIndex,
      resultLabel: resultTask,
      byPlayerId: session.playerId
    });

    clearRouletteTimer(session.roomCode);
    const timer = setTimeout(() => {
      const latest = getRouletteState(session.roomCode);
      latest.isSpinning = false;
      rouletteTimers.delete(session.roomCode);
      deps.io.to(session.roomCode).emit("game:roulette:spin-end", {
        angle: latest.angle,
        resultIndex,
        resultLabel: resultTask,
        byPlayerId: session.playerId
      });
    }, ROULETTE_DURATION_MS + 60);
    timer.unref();
    rouletteTimers.set(session.roomCode, timer);
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
      clearRouletteTimer(session.roomCode);
      rouletteStateByRoom.delete(session.roomCode);
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

    if (pending.loserId !== session.playerId) {
      socket.emit("room:error", { code: "ONLY_LOSER_CAN_PICK_CARD", message: "ONLY_LOSER_CAN_PICK_CARD" });
      return;
    }

    const selected = pending.options.find((item) => item.id === cardId);
    if (!selected) {
      socket.emit("room:error", { code: "CARD_NOT_FOUND", message: "CARD_NOT_FOUND" });
      return;
    }

    revealedCards.set(session.roomCode, {
      winnerId: pending.winnerId,
      loserId: pending.loserId,
      card: {
        id: selected.id,
        level: selected.penalty.level,
        title: selected.penalty.name,
        description: selected.penalty.description,
        duration: selected.penalty.duration,
        type: selected.penalty.type
      }
    });
    pendingCardReveals.delete(session.roomCode);

    setActivePenalty(deps.io, session.roomCode, selected.penalty);
    deps.io.to(session.roomCode).emit("penalty:trigger", { penalty: selected.penalty });

    deps.io.to(session.roomCode).emit("game:card:revealed", {
      winnerId: pending.winnerId,
      loserId: pending.loserId,
      card: {
        id: selected.id,
        level: selected.penalty.level,
        title: selected.penalty.name,
        description: selected.penalty.description,
        duration: selected.penalty.duration,
        type: selected.penalty.type
      }
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
