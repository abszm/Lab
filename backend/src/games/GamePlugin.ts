import type { GameMove, GameResult, GameState } from "../types/index.js";

export interface GamePlugin {
  id: string;
  name: string;
  getRequiredPlayers(): number;
  initBoard(): GameState;
  validateMove(move: GameMove, state: GameState): boolean;
  calculateResult(state: GameState): GameResult;
  getValidMoves(state: GameState, playerId: string): string[];
}
