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
  cardOptions?: RewardCardOption[];
}

export interface RewardCardOption {
  id: string;
  cellId: string;
  level: 1 | 2 | 3 | 4;
  displayName: string;
}

export interface RevealedCard {
  id: string;
  cellId: string;
  level: 1 | 2 | 3 | 4;
  title: string;
  description: string;
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
    cardDraft: [] as RewardCardOption[],
    cardWinnerId: "",
    cardReveal: null as RevealedCard | null,
    cardLoserId: "",
    cardAcknowledgedBy: "",
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
    setCardDraft(payload: { winnerId: string; cards: RewardCardOption[] }) {
      this.cardWinnerId = payload.winnerId;
      this.cardDraft = payload.cards;
      this.cardReveal = null;
      this.cardLoserId = "";
      this.cardAcknowledgedBy = "";
    },
    setCardReveal(payload: { winnerId: string; loserId: string; card: RevealedCard }) {
      this.cardWinnerId = payload.winnerId;
      this.cardLoserId = payload.loserId;
      this.cardReveal = payload.card;
      this.cardDraft = [];
      this.cardAcknowledgedBy = "";
    },
    setCardAcknowledged(playerId: string) {
      this.cardAcknowledgedBy = playerId;
    },
    clearCardState() {
      this.cardDraft = [];
      this.cardWinnerId = "";
      this.cardReveal = null;
      this.cardLoserId = "";
      this.cardAcknowledgedBy = "";
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
      this.clearCardState();
      this.penalty = null;
      this.penaltyActive = false;
      this.lastPenaltyReason = "";
    }
  }
});
