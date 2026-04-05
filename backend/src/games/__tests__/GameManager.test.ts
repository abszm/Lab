import { describe, expect, it } from "vitest";
import { GameManager } from "../GameManager.js";

describe("GameManager", () => {
  it("initializes game state for room", () => {
    const manager = new GameManager();

    const state = manager.initRoomGame("ROOM01", "rock-paper-scissors", ["p1", "p2"]);

    expect(state.players).toEqual(["p1", "p2"]);
    expect(state.phase).toBe("waiting");
    expect(state.moves).toEqual({});
  });

  it("throws when plugin is not found", () => {
    const manager = new GameManager();

    expect(() => manager.initRoomGame("ROOM01", "unknown-game", ["p1", "p2"])).toThrowError("GAME_NOT_FOUND");
  });

  it("keeps waiting after first move", () => {
    const manager = new GameManager();
    manager.initRoomGame("ROOM01", "rock-paper-scissors", ["p1", "p2"]);

    const outcome = manager.applyMove("ROOM01", {
      playerId: "p1",
      action: "rock",
      timestamp: Date.now()
    });

    expect(outcome.result).toBeUndefined();
    expect(outcome.state.moves).toEqual({ p1: "rock" });
  });

  it("produces round result after second move", () => {
    const manager = new GameManager();
    manager.initRoomGame("ROOM01", "rock-paper-scissors", ["p1", "p2"]);
    manager.applyMove("ROOM01", { playerId: "p1", action: "rock", timestamp: Date.now() });

    const outcome = manager.applyMove("ROOM01", {
      playerId: "p2",
      action: "scissors",
      timestamp: Date.now()
    });

    expect(outcome.result).toBeDefined();
    expect(outcome.result?.winner).toBe("p1");
    expect(outcome.result?.scores.p1).toBe(1);
    expect(outcome.result?.winGap).toBe(1);
    expect(outcome.penalty).toBeDefined();
    expect(outcome.state.phase).toBe("waiting");
    expect(outcome.state.moves).toEqual({});
  });

  it("does not trigger penalty on draw", () => {
    const manager = new GameManager();
    manager.initRoomGame("ROOM01", "rock-paper-scissors", ["p1", "p2"]);
    manager.applyMove("ROOM01", { playerId: "p1", action: "paper", timestamp: Date.now() });

    const outcome = manager.applyMove("ROOM01", {
      playerId: "p2",
      action: "paper",
      timestamp: Date.now()
    });

    expect(outcome.result?.isDraw).toBe(true);
    expect(outcome.penalty).toBeUndefined();
  });

  it("rejects invalid move", () => {
    const manager = new GameManager();
    manager.initRoomGame("ROOM01", "rock-paper-scissors", ["p1", "p2"]);

    expect(() => {
      manager.applyMove("ROOM01", {
        playerId: "p1",
        action: "invalid-choice",
        timestamp: Date.now()
      });
    }).toThrowError("INVALID_MOVE");
  });

  it("throws when game is not initialized", () => {
    const manager = new GameManager();

    expect(() => {
      manager.applyMove("UNKNOWN", { playerId: "p1", action: "rock", timestamp: Date.now() });
    }).toThrowError("GAME_NOT_STARTED");
  });

  it("rejects duplicate move from same player in a round", () => {
    const manager = new GameManager();
    manager.initRoomGame("ROOM01", "rock-paper-scissors", ["p1", "p2"]);
    manager.applyMove("ROOM01", { playerId: "p1", action: "rock", timestamp: Date.now() });

    expect(() => {
      manager.applyMove("ROOM01", { playerId: "p1", action: "paper", timestamp: Date.now() });
    }).toThrowError("ALREADY_MOVED");
  });

  it("supports minesweeper duel and sanitizes board state", () => {
    const manager = new GameManager();
    manager.initRoomGame("ROOM02", "minesweeper-duel", ["p1", "p2"]);

    const initialState = manager.getRoomGameState("ROOM02");
    const board = initialState?.board as { cells: Array<{ id: string; hasMine?: boolean }> };
    expect(board.cells.length).toBe(16);
    expect(board.cells[0]).not.toHaveProperty("hasMine");

    const [firstCell, secondCell] = board.cells;
    manager.applyMove("ROOM02", { playerId: "p1", action: firstCell.id, timestamp: Date.now() });
    const outcome = manager.applyMove("ROOM02", { playerId: "p2", action: secondCell.id, timestamp: Date.now() });

    expect(outcome.result).toBeDefined();
    const outcomeBoard = outcome.state.board as { cells: Array<{ id: string; hasMine?: boolean }> };
    expect(outcomeBoard.cells[0]).not.toHaveProperty("hasMine");
  });
});
