import { describe, expect, it } from "vitest";
import { RoomEngine } from "../RoomEngine.js";
import { InMemoryStore } from "../inMemoryStore.js";

function setup() {
  const store = new InMemoryStore();
  const engine = new RoomEngine(store);
  return { store, engine };
}

describe("RoomEngine", () => {
  it("creates a waiting room with host", () => {
    const { engine } = setup();
    const room = engine.createRoom("player-1", "rock-paper-scissors");

    expect(room.code).toHaveLength(6);
    expect(room.status).toBe("waiting");
    expect(room.hostId).toBe("player-1");
    expect(room.players).toHaveLength(1);
    expect(room.players[0].score).toBe(0);
  });

  it("joins second player and switches room to playing", () => {
    const { engine } = setup();
    const created = engine.createRoom("host", "rock-paper-scissors");

    const updated = engine.joinRoom(created.code, "guest");

    expect(updated.players).toHaveLength(2);
    expect(updated.status).toBe("playing");
  });

  it("throws ROOM_NOT_FOUND for unknown room", () => {
    const { engine } = setup();

    expect(() => engine.joinRoom("ZZZZZZ", "guest")).toThrowError("ROOM_NOT_FOUND");
  });

  it("throws ROOM_FULL when a third player joins", () => {
    const { engine } = setup();
    const room = engine.createRoom("host", "rock-paper-scissors");
    engine.joinRoom(room.code, "guest");

    expect(() => engine.joinRoom(room.code, "third")).toThrowError("ROOM_FULL");
  });

  it("promotes next player as host when host leaves", () => {
    const { engine } = setup();
    const room = engine.createRoom("host", "rock-paper-scissors");
    engine.joinRoom(room.code, "guest");

    engine.leaveRoom(room.code, "host");
    const updated = engine.getRoom(room.code);

    expect(updated).not.toBeNull();
    expect(updated?.hostId).toBe("guest");
    expect(updated?.status).toBe("waiting");
    expect(updated?.players).toHaveLength(1);
  });

  it("deletes room when all players leave", () => {
    const { engine } = setup();
    const room = engine.createRoom("host", "rock-paper-scissors");

    engine.leaveRoom(room.code, "host");

    expect(engine.getRoom(room.code)).toBeNull();
  });
});
