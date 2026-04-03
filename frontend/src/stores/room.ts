import { defineStore } from "pinia";

export interface RoomPlayer {
  id: string;
  isReady: boolean;
  score: number;
  isConnected?: boolean;
}

export interface RoomState {
  code: string;
  gameId: string;
  hostId: string;
  players: RoomPlayer[];
  status: "waiting" | "playing" | "closed";
}

export const useRoomStore = defineStore("room", {
  state: () => ({
    room: null as RoomState | null,
    error: "",
    notice: ""
  }),
  actions: {
    setRoom(room: RoomState | null) {
      this.room = room;
    },
    setError(message: string) {
      this.error = message;
    },
    clearError() {
      this.error = "";
    },
    setNotice(message: string) {
      this.notice = message;
    },
    clearNotice() {
      this.notice = "";
    }
  }
});
