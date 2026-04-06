import type { GamePlugin } from "./GamePlugin.js";
import type { GameResult, GameState } from "../types/index.js";

interface RouletteBoard {
  mode: "drinking-roulette";
}

function getBoard(state: GameState): RouletteBoard {
  return state.board as RouletteBoard;
}

export const DrinkingRoulette: GamePlugin = {
  id: "drinking-roulette",
  name: "Drinking Roulette",
  getRequiredPlayers: () => 2,
  initBoard: (): GameState => ({
    board: { mode: "drinking-roulette" },
    players: [],
    moves: {},
    phase: "waiting"
  }),
  validateMove: (): boolean => false,
  getInvalidMoveReason: () => "INVALID_MOVE",
  calculateResult: (): GameResult => ({
    winner: null,
    isDraw: true,
    scores: {},
    winGap: 0
  }),
  getValidMoves: () => [],
  toClientState: (state: GameState): GameState => ({
    ...state,
    board: {
      ...getBoard(state)
    }
  })
};
