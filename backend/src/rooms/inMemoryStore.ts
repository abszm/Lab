import type { RoomState } from "../types/index.js";

interface Session {
  roomCode: string;
  playerId: string;
  socketId: string;
}

export class InMemoryStore {
  private readonly rooms = new Map<string, RoomState>();
  private readonly sessionsByPlayer = new Map<string, Session>();
  private readonly playerBySocket = new Map<string, string>();

  setRoom(code: string, room: RoomState): void {
    this.rooms.set(code, room);
  }

  getRoom(code: string): RoomState | undefined {
    return this.rooms.get(code);
  }

  deleteRoom(code: string): void {
    this.rooms.delete(code);
    this.clearRoomSessions(code);
  }

  setSession(playerId: string, roomCode: string, socketId: string): void {
    const existing = this.sessionsByPlayer.get(playerId);
    if (existing) {
      this.playerBySocket.delete(existing.socketId);
    }

    this.sessionsByPlayer.set(playerId, { playerId, roomCode, socketId });
    this.playerBySocket.set(socketId, playerId);
  }

  getSessionBySocket(socketId: string): Session | undefined {
    const playerId = this.playerBySocket.get(socketId);
    if (!playerId) {
      return undefined;
    }
    return this.sessionsByPlayer.get(playerId);
  }

  getSessionByPlayer(playerId: string): Session | undefined {
    return this.sessionsByPlayer.get(playerId);
  }

  hasSessionByPlayer(playerId: string): boolean {
    return this.sessionsByPlayer.has(playerId);
  }

  removeSessionBySocket(socketId: string): Session | undefined {
    const playerId = this.playerBySocket.get(socketId);
    if (!playerId) {
      return undefined;
    }
    return this.removeSessionByPlayer(playerId);
  }

  removeSessionByPlayer(playerId: string): Session | undefined {
    const session = this.sessionsByPlayer.get(playerId);
    if (!session) {
      return undefined;
    }

    this.playerBySocket.delete(session.socketId);
    this.sessionsByPlayer.delete(playerId);
    return session;
  }

  updateSocket(playerId: string, socketId: string): Session | undefined {
    const session = this.sessionsByPlayer.get(playerId);
    if (!session) {
      return undefined;
    }

    this.playerBySocket.delete(session.socketId);
    session.socketId = socketId;
    this.playerBySocket.set(socketId, playerId);
    this.sessionsByPlayer.set(playerId, session);
    return session;
  }

  private clearRoomSessions(roomCode: string): void {
    for (const [playerId, session] of this.sessionsByPlayer.entries()) {
      if (session.roomCode === roomCode) {
        this.playerBySocket.delete(session.socketId);
        this.sessionsByPlayer.delete(playerId);
      }
    }
  }
}
