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

export const useGameStore = defineStore("game", {
  state: () => ({
    result: null as GameResult | null,
    penalty: null as Penalty | null,
    penaltyActive: false,
    lastPenaltyReason: "" as "" | "completed" | "timeout"
  }),
  actions: {
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
    }
  }
});
