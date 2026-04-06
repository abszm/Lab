import type { GameMove, GameResult, GameState, Penalty } from "../types/index.js";
import { getGame } from "./registry.js";
import { PenaltySystem } from "../penalty/PenaltySystem.js";

interface RuntimeGame {
  gameId: string;
  state: GameState;
  scoreBoard: Record<string, number>;
  penaltyHistory: Penalty[];
}

function initializeCurrentPlayerIfPresent(state: GameState): void {
  if (!state.players.length) {
    return;
  }

  const board = state.board as { currentPlayerId?: string } | null;
  if (!board || typeof board !== "object" || !("currentPlayerId" in board)) {
    return;
  }

  if (!board.currentPlayerId) {
    const index = Math.floor(Math.random() * state.players.length);
    board.currentPlayerId = state.players[index];
  }
}

export class GameManager {
  private readonly games = new Map<string, RuntimeGame>();
  private readonly penaltySystem = new PenaltySystem();

  private buildClientState(runtime: RuntimeGame): GameState {
    const plugin = getGame(runtime.gameId);
    if (!plugin?.toClientState) {
      return runtime.state;
    }

    return plugin.toClientState(structuredClone(runtime.state));
  }

  initRoomGame(roomCode: string, gameId: string, players: string[]): GameState {
    const existing = this.games.get(roomCode);
    if (existing) {
      return existing.state;
    }

    const plugin = getGame(gameId);
    if (!plugin) {
      throw new Error("GAME_NOT_FOUND");
    }

    const state = plugin.initBoard();
    state.players = players;
    initializeCurrentPlayerIfPresent(state);
    this.games.set(roomCode, {
      gameId,
      state,
      scoreBoard: Object.fromEntries(players.map((id) => [id, 0])),
      penaltyHistory: []
    });
    return state;
  }

  resetRoomGame(roomCode: string, gameId: string, players: string[]): GameState {
    const plugin = getGame(gameId);
    if (!plugin) {
      throw new Error("GAME_NOT_FOUND");
    }

    const state = plugin.initBoard();
    state.players = players;
    initializeCurrentPlayerIfPresent(state);
    this.games.set(roomCode, {
      gameId,
      state,
      scoreBoard: Object.fromEntries(players.map((id) => [id, 0])),
      penaltyHistory: []
    });
    return state;
  }

  hasRoomGame(roomCode: string): boolean {
    return this.games.has(roomCode);
  }

  getRoomGameState(roomCode: string): GameState | null {
    const runtime = this.games.get(roomCode);
    if (!runtime) {
      return null;
    }

    return this.buildClientState(runtime);
  }

  closeRoom(roomCode: string): void {
    this.games.delete(roomCode);
  }

  applyMove(roomCode: string, move: GameMove): { state: GameState; result?: GameResult; penalty?: Penalty } {
    const runtime = this.games.get(roomCode);
    if (!runtime) {
      throw new Error("GAME_NOT_STARTED");
    }

    const plugin = getGame(runtime.gameId);
    if (!plugin) {
      throw new Error("GAME_NOT_FOUND");
    }

    if (!plugin.validateMove(move, runtime.state)) {
      const reason = plugin.getInvalidMoveReason?.(move, runtime.state) ?? "INVALID_MOVE";
      throw new Error(reason);
    }

    if (!runtime.state.players.includes(move.playerId)) {
      throw new Error("PLAYER_NOT_IN_ROOM");
    }

    if (runtime.state.moves[move.playerId]) {
      throw new Error("ALREADY_MOVED");
    }

    runtime.state.moves[move.playerId] = move.action;

    if (Object.keys(runtime.state.moves).length < plugin.getRequiredPlayers()) {
      return { state: this.buildClientState(runtime) };
    }

    runtime.state.phase = "resolved";
    const roundResult = plugin.calculateResult(runtime.state);
    for (const [playerId, value] of Object.entries(roundResult.scores)) {
      runtime.scoreBoard[playerId] = (runtime.scoreBoard[playerId] ?? 0) + value;
    }

    const sortedScores = Object.values(runtime.scoreBoard).sort((a, b) => b - a);
    const winGap = sortedScores.length > 1 ? sortedScores[0] - sortedScores[1] : 0;
    const result: GameResult = {
      ...roundResult,
      scores: runtime.scoreBoard,
      winGap
    };

    let penalty: Penalty | undefined;
    if (!result.isDraw && result.winner && winGap >= 1) {
      penalty = this.penaltySystem.pick(winGap, runtime.penaltyHistory);
      runtime.penaltyHistory.push(penalty);
    }

    runtime.state.moves = {};
    runtime.state.phase = "waiting";
    return { state: this.buildClientState(runtime), result, penalty };
  }
}
