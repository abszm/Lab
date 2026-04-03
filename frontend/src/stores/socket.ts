import { defineStore } from "pinia";
import { io, type Socket } from "socket.io-client";

export const useSocketStore = defineStore("socket", {
  state: () => ({
    socket: null as Socket | null,
    playerId: localStorage.getItem("heartbeat-player-id") ?? crypto.randomUUID(),
    connected: false,
    currentRoomCode: localStorage.getItem("heartbeat-room-code") ?? ""
  }),
  actions: {
    connect() {
      localStorage.setItem("heartbeat-player-id", this.playerId);
      if (!this.socket) {
        this.socket = io({
          auth: { playerId: this.playerId },
          transports: ["websocket"],
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
