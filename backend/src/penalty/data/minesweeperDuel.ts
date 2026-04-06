import type { PenaltyLevel } from "../../types/index.js";

export const MINESWEEPER_DUEL_PENALTIES: PenaltyLevel[] = [
  {
    level: 1,
    minGap: 1,
    maxGap: 2,
    items: [
      { id: "MS-L1-1", level: 1, name: "扫雷复盘", description: "失败方复盘本局一个失误点。", duration: 15, type: "verbal" },
      { id: "MS-L1-2", level: 1, name: "谨慎宣言", description: "失败方说出下一局谨慎宣言。", duration: 10, type: "verbal" }
    ]
  },
  {
    level: 2,
    minGap: 3,
    maxGap: 4,
    items: [
      { id: "MS-L2-1", level: 2, name: "排雷动作", description: "失败方完成一次排雷手势挑战。", duration: 25, type: "action" },
      { id: "MS-L2-2", level: 2, name: "静默操作", description: "失败方下一局前 20 秒禁止说话。", duration: 20, type: "action" }
    ]
  },
  {
    level: 3,
    minGap: 5,
    maxGap: 6,
    items: [
      { id: "MS-L3-1", level: 3, name: "紧张倒计时", description: "失败方进行 30 秒倒计时挑战。", duration: 30, type: "physical" },
      { id: "MS-L3-2", level: 3, name: "盲扫模拟", description: "失败方闭眼模拟一次扫雷路径。", duration: 45, type: "visual" }
    ]
  },
  {
    level: 4,
    minGap: 7,
    maxGap: Number.POSITIVE_INFINITY,
    items: [
      { id: "MS-L4-1", level: 4, name: "雷区统治", description: "胜者指定失败方执行高强度挑战。", duration: 120, type: "action" },
      { id: "MS-L4-2", level: 4, name: "终局排雷", description: "失败方执行终局排雷任务。", duration: 150, type: "action" }
    ]
  }
];
