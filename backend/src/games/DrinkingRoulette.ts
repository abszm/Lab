import type { GamePlugin } from "./GamePlugin.js";
import type { GameMove, GameResult, GameState } from "../types/index.js";

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
  validateMove: (_move: GameMove, _state: GameState): boolean => false,
  getInvalidMoveReason: () => "INVALID_MOVE",
  calculateResult: (_state: GameState): GameResult => ({
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
