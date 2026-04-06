import type { PenaltyLevel } from "../types/index.js";
import { DRINKING_ROULETTE_PENALTIES } from "./data/drinkingRoulette.js";
import { GOMOKU_DUEL_PENALTIES } from "./data/gomokuDuel.js";
import { MINESWEEPER_DUEL_PENALTIES } from "./data/minesweeperDuel.js";
import { ROCK_PAPER_SCISSORS_PENALTIES } from "./data/rockPaperScissors.js";

export const GAME_PENALTY_DATA: Record<string, PenaltyLevel[]> = {
  "rock-paper-scissors": ROCK_PAPER_SCISSORS_PENALTIES,
  "minesweeper-duel": MINESWEEPER_DUEL_PENALTIES,
  "gomoku-duel": GOMOKU_DUEL_PENALTIES,
  "drinking-roulette": DRINKING_ROULETTE_PENALTIES
};
