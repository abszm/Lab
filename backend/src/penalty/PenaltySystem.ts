import type { Penalty } from "../types/index.js";
import { PENALTY_DATA } from "./data.js";
import { RandomPenaltySelector } from "./selector.js";

export class PenaltySystem {
  private readonly selector = new RandomPenaltySelector(PENALTY_DATA);

  pick(winGap: number, history: Penalty[]): Penalty {
    return this.selector.selectPenalty(winGap, history);
  }
}
