import type { GamePlugin } from "./GamePlugin.js";
import type { GameMove, GameResult, GameState } from "../types/index.js";

const CHOICES = ["rock", "paper", "scissors"];

export const RockPaperScissors: GamePlugin = {
  id: "rock-paper-scissors",
  name: "Rock Paper Scissors",
  getRequiredPlayers: () => 2,
  initBoard: (): GameState => ({
    board: null,
    players: [],
    moves: {},
    phase: "waiting"
  }),
  validateMove: (move: GameMove, state: GameState): boolean => {
    if (state.phase !== "waiting") {
      return false;
    }
    return CHOICES.includes(move.action);
  },
  calculateResult: (state: GameState): GameResult => {
    const playerIds = Object.keys(state.moves);
    if (playerIds.length < 2) {
      return { winner: null, isDraw: false, scores: {}, winGap: 0 };
    }

    const [playerA, playerB] = playerIds;
    const choiceA = state.moves[playerA];
    const choiceB = state.moves[playerB];

    if (choiceA === choiceB) {
      return {
        winner: null,
        isDraw: true,
        scores: {
          [playerA]: 0,
          [playerB]: 0
        },
        winGap: 0
      };
    }

    const beats: Record<string, string> = {
      rock: "scissors",
      paper: "rock",
      scissors: "paper"
    };
    const winner = beats[choiceA] === choiceB ? playerA : playerB;
    const loser = winner === playerA ? playerB : playerA;

    return {
      winner,
      isDraw: false,
      scores: {
        [winner]: 1,
        [loser]: 0
      },
      winGap: 1
    };
  },
  getValidMoves: () => CHOICES
};
