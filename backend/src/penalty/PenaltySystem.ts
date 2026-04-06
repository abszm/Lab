import type { Penalty } from "../types/index.js";
import { GAME_PENALTY_DATA } from "./data.js";
import { RandomPenaltySelector } from "./selector.js";

export class PenaltySystem {
  private readonly selectors = new Map(
    Object.entries(GAME_PENALTY_DATA).map(([gameId, levels]) => [gameId, new RandomPenaltySelector(levels)])
  );

  pick(gameId: string, winGap: number, history: Penalty[]): Penalty {
    const selector = this.selectors.get(gameId);
    if (!selector) {
      throw new Error("PENALTY_SET_NOT_FOUND");
    }

    return selector.selectPenalty(winGap, history);
  }
}
