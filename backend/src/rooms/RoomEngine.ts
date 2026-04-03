import type { RoomState } from "../types/index.js";
import { generateRoomCode } from "../utils/roomCode.js";
import { InMemoryStore } from "./inMemoryStore.js";

export class RoomEngine {
  constructor(private readonly store: InMemoryStore) {}

  createRoom(hostId: string, gameId: string): RoomState {
    const room = {
      code: this.createUniqueCode(),
      gameId,
      hostId,
      players: [{ id: hostId, isReady: true, score: 0, isConnected: true }],
      status: "waiting" as const,
      createdAt: Date.now()
    };
    this.store.setRoom(room.code, room);
    return room;
  }

  joinRoom(code: string, playerId: string): RoomState {
    const room = this.store.getRoom(code);
    if (!room) {
      throw new Error("ROOM_NOT_FOUND");
    }

    const existing = room.players.find((player) => player.id === playerId);
    if (existing) {
      existing.isConnected = true;
      this.refreshRoomStatus(room);
      this.store.setRoom(code, room);
      return room;
    }

    if (room.players.length >= 2) {
      throw new Error("ROOM_FULL");
    }

    room.players.push({ id: playerId, isReady: true, score: 0, isConnected: true });
    this.refreshRoomStatus(room);
    this.store.setRoom(code, room);
    return room;
  }

  reconnectPlayer(code: string, playerId: string): RoomState | null {
    const room = this.store.getRoom(code);
    if (!room) {
      return null;
    }

    const player = room.players.find((item) => item.id === playerId);
    if (!player) {
      return null;
    }

    player.isConnected = true;
    this.refreshRoomStatus(room);
    this.store.setRoom(code, room);
    return room;
  }

  markDisconnected(code: string, playerId: string): RoomState | null {
    const room = this.store.getRoom(code);
    if (!room) {
      return null;
    }

    const player = room.players.find((item) => item.id === playerId);
    if (!player) {
      return room;
    }

    player.isConnected = false;
    this.refreshRoomStatus(room);
    this.store.setRoom(code, room);
    return room;
  }

  leaveRoom(code: string, playerId: string): void {
    const room = this.store.getRoom(code);
    if (!room) {
      return;
    }
    room.players = room.players.filter((player) => player.id !== playerId);

    if (room.players.length === 0) {
      this.store.deleteRoom(code);
      return;
    }

    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
    }
    this.refreshRoomStatus(room);
    this.store.setRoom(code, room);
  }

  getRoom(code: string): RoomState | null {
    return this.store.getRoom(code) ?? null;
  }

  closeRoom(code: string): void {
    this.store.deleteRoom(code);
  }

  private createUniqueCode(): string {
    let tries = 0;
    while (tries < 10) {
      const code = generateRoomCode();
      if (!this.store.getRoom(code)) {
        return code;
      }
      tries += 1;
    }
    throw new Error("ROOM_CODE_GENERATION_FAILED");
  }

  private refreshRoomStatus(room: RoomState): void {
    const allConnected = room.players.every((player) => player.isConnected);
    room.status = room.players.length === 2 && allConnected ? "playing" : "waiting";
  }
}
