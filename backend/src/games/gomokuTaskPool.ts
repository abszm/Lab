import taskTemplateJson from "./gomokuTaskOverrides.full.template.json" with { type: "json" };
import taskOverridesJson from "./gomokuTaskOverrides.json" with { type: "json" };

export interface GomokuTaskItem {
  id: string;
  cellId: string;
  row: number;
  col: number;
  level: 1 | 2 | 3 | 4;
  title: string;
  description: string;
}

export interface GomokuTaskTextOverride {
  title: string;
  description: string;
}

// 在这个对象中按 cellId 覆盖默认占位文案，例如：
// "7-7": { title: "中心挑战", description: "在这里写你的自定义任务" }
export const GOMOKU_TASK_TEXT_OVERRIDES: Record<string, GomokuTaskTextOverride> = {
  ...(taskTemplateJson as Record<string, GomokuTaskTextOverride>),
  ...(taskOverridesJson as Record<string, GomokuTaskTextOverride>)
};

function resolveLevel(row: number, col: number): 1 | 2 | 3 | 4 {
  const isOuterTwoRings = row < 2 || row > 12 || col < 2 || col > 12;
  if (isOuterTwoRings) {
    return 1;
  }

  const inCenterNine = row >= 6 && row <= 8 && col >= 6 && col <= 8;
  if (inCenterNine) {
    return 4;
  }

  const inCenterSeven = row >= 4 && row <= 10 && col >= 4 && col <= 10;
  if (inCenterSeven) {
    return 3;
  }

  return 2;
}

function buildDefaultTitle(level: 1 | 2 | 3 | 4): string {
  return `L${level} 占位任务`;
}

function buildDefaultDescription(row: number, col: number): string {
  return `待填写任务文案（坐标 ${row + 1},${col + 1}）`;
}

function taskId(row: number, col: number): string {
  return `G-${String(row + 1).padStart(2, "0")}-${String(col + 1).padStart(2, "0")}`;
}

export const GOMOKU_TASK_POOL: GomokuTaskItem[] = (() => {
  const tasks: GomokuTaskItem[] = [];

  for (let row = 0; row < 15; row += 1) {
    for (let col = 0; col < 15; col += 1) {
      const cellId = `${row}-${col}`;
      const level = resolveLevel(row, col);
      const override = GOMOKU_TASK_TEXT_OVERRIDES[cellId];

      tasks.push({
        id: taskId(row, col),
        cellId,
        row,
        col,
        level,
        title: override?.title ?? buildDefaultTitle(level),
        description: override?.description ?? buildDefaultDescription(row, col)
      });
    }
  }

  return tasks;
})();

export const GOMOKU_TASK_POOL_BY_CELL = new Map<string, GomokuTaskItem>(
  GOMOKU_TASK_POOL.map((item) => [item.cellId, item])
);
