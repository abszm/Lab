import { defineStore } from "pinia";

export interface Penalty {
  id: string;
  level: number;
  name: string;
  description: string;
  duration: number;
}

export interface GameResult {
  winner: string | null;
  scores: Record<string, number>;
  isDraw: boolean;
  winGap: number;
}

export interface GameState {
  board: unknown;
  players: string[];
  moves: Record<string, string>;
  phase: "waiting" | "resolved";
}

export const useGameStore = defineStore("game", {
  state: () => ({
    state: null as GameState | null,
    result: null as GameResult | null,
    penalty: null as Penalty | null,
    penaltyActive: false,
    lastPenaltyReason: "" as "" | "completed" | "timeout"
  }),
  actions: {
    setState(payload: GameState) {
      this.state = payload;
    },
    setResult(payload: GameResult) {
      this.result = payload;
    },
    setPenalty(penalty: Penalty | null) {
      this.penalty = penalty;
      this.penaltyActive = Boolean(penalty);
    },
    clearPenalty(reason: "completed" | "timeout") {
      this.penalty = null;
      this.penaltyActive = false;
      this.lastPenaltyReason = reason;
    },
    resetRound() {
      this.state = null;
      this.result = null;
      this.penalty = null;
      this.penaltyActive = false;
      this.lastPenaltyReason = "";
    }
  }
});
