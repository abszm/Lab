import type { Penalty, PenaltyLevel, PenaltyType } from "../../types/index.js";
import taskSeedsJson from "./gomokuTasks.json" with { type: "json" };

interface GomokuTaskSeed {
  text: string;
  duration: number;
  type: PenaltyType;
}

const taskSeeds = taskSeedsJson as GomokuTaskSeed[];

function buildGomokuTaskPool(): Penalty[] {
  const pool = taskSeeds
    .map((seed, index) => {
      const code = String(index + 1).padStart(3, "0");
      return {
        id: `GO-TASK-${code}`,
        level: 1,
        name: `五子棋任务 ${code}`,
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
      id: "GO-TASK-001",
      level: 1,
      name: "五子棋任务 001",
      description: "失败方完成一次对局复盘。",
      duration: 15,
      type: "verbal"
    }
  ];
}

export const GOMOKU_DUEL_PENALTIES: PenaltyLevel[] = [
  {
    level: 1,
    minGap: 1,
    maxGap: Number.POSITIVE_INFINITY,
    items: buildGomokuTaskPool()
  }
];
