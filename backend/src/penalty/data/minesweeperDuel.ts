import type { Penalty, PenaltyLevel, PenaltyType } from "../../types/index.js";
import taskSeedsJson from "./minesweeperTasks.json" with { type: "json" };

interface MinesweeperTaskSeed {
  text: string;
  duration: number;
  type: PenaltyType;
}

const taskSeeds = taskSeedsJson as MinesweeperTaskSeed[];

function buildMinesweeperTaskPool(): Penalty[] {
  const pool = taskSeeds
    .map((seed, index) => {
      const code = String(index + 1).padStart(3, "0");
      return {
        id: `MS-TASK-${code}`,
        level: 1,
        name: `扫雷任务 ${code}`,
        description: seed.text.trim(),
        duration: seed.duration,
        type: seed.type
      } satisfies Penalty;
    })
    .filter((task) => task.description.length > 0 && task.duration > 0);

  if (pool.length > 0) {
    return pool;
  }

  return [
    {
      id: "MS-TASK-001",
      level: 1,
      name: "扫雷任务 001",
      description: "失败方完成一次扫雷复盘。",
      duration: 15,
      type: "verbal"
    }
  ];
}

export const MINESWEEPER_DUEL_PENALTIES: PenaltyLevel[] = [
  {
    level: 1,
    minGap: 1,
    maxGap: Number.POSITIVE_INFINITY,
    items: buildMinesweeperTaskPool()
  }
];
