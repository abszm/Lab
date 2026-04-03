import { describe, expect, it } from "vitest";
import { RandomPenaltySelector } from "../selector.js";
import type { PenaltyLevel } from "../../types/index.js";

describe("RandomPenaltySelector", () => {
  it("selects penalty from matched level by win gap", () => {
    const levels: PenaltyLevel[] = [
      {
        level: 1,
        minGap: 1,
        maxGap: 2,
        items: [{ id: "L1", level: 1, name: "L1", description: "", duration: 1, type: "action" }]
      },
      {
        level: 2,
        minGap: 3,
        maxGap: 4,
        items: [{ id: "L2", level: 2, name: "L2", description: "", duration: 1, type: "action" }]
      }
    ];

    const selector = new RandomPenaltySelector(levels);
    const selected = selector.selectPenalty(3, []);

    expect(selected.id).toBe("L2");
  });

  it("avoids recently used penalties when alternatives exist", () => {
    const levels: PenaltyLevel[] = [
      {
        level: 1,
        minGap: 1,
        maxGap: 10,
        items: [
          { id: "A", level: 1, name: "A", description: "", duration: 1, type: "action" },
          { id: "B", level: 1, name: "B", description: "", duration: 1, type: "action" }
        ]
      }
    ];

    const selector = new RandomPenaltySelector(levels);
    const selected = selector.selectPenalty(2, [{ id: "A", level: 1, name: "A", description: "", duration: 1, type: "action" }]);

    expect(selected.id).toBe("B");
  });

  it("falls back to level pool when all candidates are recently used", () => {
    const levels: PenaltyLevel[] = [
      {
        level: 1,
        minGap: 1,
        maxGap: 10,
        items: [{ id: "A", level: 1, name: "A", description: "", duration: 1, type: "action" }]
      }
    ];

    const selector = new RandomPenaltySelector(levels);
    const selected = selector.selectPenalty(2, [{ id: "A", level: 1, name: "A", description: "", duration: 1, type: "action" }]);

    expect(selected.id).toBe("A");
  });
});
