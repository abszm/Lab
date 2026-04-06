import type { Penalty, PenaltyLevel, PenaltyType } from "../../types/index.js";

const VERBS = ["复盘", "模仿", "描述", "完成", "坚持", "朗读", "演示", "挑战", "执行", "回应"];
const OBJECTS = ["安全格", "雷区", "倒计时", "路线", "策略", "手势", "口令", "节奏", "观察", "反应"];

function resolveType(index: number): PenaltyType {
  const types: PenaltyType[] = ["verbal", "action", "visual", "physical"];
  return types[index % types.length];
}

function buildMinesweeperTaskPool(): Penalty[] {
  const tasks: Penalty[] = [];

  for (let i = 0; i < VERBS.length; i += 1) {
    for (let j = 0; j < OBJECTS.length; j += 1) {
      const serial = i * OBJECTS.length + j + 1;
      const code = String(serial).padStart(3, "0");
      tasks.push({
        id: `MS-TASK-${code}`,
        level: 1,
        name: `扫雷任务 ${code}`,
        description: `失败方${VERBS[i]}一次${OBJECTS[j]}挑战。`,
        duration: 15 + (serial % 8) * 5,
        type: resolveType(serial)
      });
    }
  }

  return tasks;
}

export const MINESWEEPER_DUEL_PENALTIES: PenaltyLevel[] = [
  {
    level: 1,
    minGap: 1,
    maxGap: Number.POSITIVE_INFINITY,
    items: buildMinesweeperTaskPool()
  }
];
