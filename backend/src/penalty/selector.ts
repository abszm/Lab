import { randomInt } from "node:crypto";
import type { Penalty, PenaltyLevel } from "../types/index.js";

export class RandomPenaltySelector {
  constructor(private readonly levels: PenaltyLevel[]) {}

  selectPenalty(winGap: number, history: Penalty[]): Penalty {
    const level = this.levels.find((item) => winGap >= item.minGap && winGap <= item.maxGap) ?? this.levels[this.levels.length - 1];
    const recent = new Set(history.slice(-5).map((item) => item.id));
    const candidate = level.items.filter((item) => !recent.has(item.id));
    const source = candidate.length > 0 ? candidate : level.items;
    return source[randomInt(source.length)];
  }
}
