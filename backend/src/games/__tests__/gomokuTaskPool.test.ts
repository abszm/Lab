import { describe, expect, it } from "vitest";
import { GOMOKU_TASK_POOL } from "../gomokuTaskPool.js";

describe("GOMOKU_TASK_POOL", () => {
  it("contains 225 unique task placeholders", () => {
    expect(GOMOKU_TASK_POOL).toHaveLength(225);

    const ids = new Set(GOMOKU_TASK_POOL.map((item) => item.id));
    const cellIds = new Set(GOMOKU_TASK_POOL.map((item) => item.cellId));

    expect(ids.size).toBe(225);
    expect(cellIds.size).toBe(225);
  });

  it("matches expected zone-level distribution", () => {
    const countByLevel = GOMOKU_TASK_POOL.reduce<Record<number, number>>((acc, item) => {
      acc[item.level] = (acc[item.level] ?? 0) + 1;
      return acc;
    }, {});

    expect(countByLevel[1]).toBe(104);
    expect(countByLevel[2]).toBe(72);
    expect(countByLevel[3]).toBe(40);
    expect(countByLevel[4]).toBe(9);
  });
});
