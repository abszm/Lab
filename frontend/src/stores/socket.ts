import { defineStore } from "pinia";
import { io, type Socket } from "socket.io-client";

export const useSocketStore = defineStore("socket", {
  state: () => ({
    socket: null as Socket | null,
    playerId: (() => {
      const stored = localStorage.getItem("heartbeat-player-id");
      if (stored) return stored;
      if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    })(),
    connected: false,
    currentRoomCode: localStorage.getItem("heartbeat-room-code") ?? ""
  }),
  actions: {
    connect() {
      localStorage.setItem("heartbeat-player-id", this.playerId);
      if (!this.socket) {
        const socketUrl = import.meta.env.VITE_SOCKET_URL?.trim()
          || `${window.location.protocol}//${window.location.hostname}:3001`;
        this.socket = io(socketUrl || undefined, {
          path: "/socket.io",
          auth: { playerId: this.playerId },
          reconnection: true,
          reconnectionAttempts: Infinity
        });

        this.socket.on("connect", () => {
          this.connected = true;
        });

        this.socket.on("disconnect", () => {
          this.connected = false;
        });
      }
      if (!this.socket.connected) {
        this.socket.connect();
      }
    },
    setRoomCode(code: string) {
      this.currentRoomCode = code;
      localStorage.setItem("heartbeat-room-code", code);
    },
    clearRoomCode() {
      this.currentRoomCode = "";
      localStorage.removeItem("heartbeat-room-code");
    }
  }
});
