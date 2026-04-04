import type { PenaltyLevel } from "../types/index.js";

export const PENALTY_DATA: PenaltyLevel[] = [
  {
    level: 1,
    minGap: 1,
    maxGap: 2,
    items: [
      { id: "L1-1", level: 1, name: "轻声赞美", description: "向获胜方说一句真诚的赞美。", duration: 10, type: "verbal" },
      { id: "L1-2", level: 1, name: "庆祝击掌", description: "快速完成一次庆祝击掌。", duration: 5, type: "action" }
    ]
  },
  {
    level: 2,
    minGap: 3,
    maxGap: 4,
    items: [
      { id: "L2-1", level: 2, name: "指令契约", description: "失败方执行获胜方的下一条无害指令。", duration: 30, type: "action" },
      { id: "L2-2", level: 2, name: "称号指定", description: "获胜方为失败方指定一回合展示称号。", duration: 30, type: "verbal" }
    ]
  },
  {
    level: 3,
    minGap: 5,
    maxGap: 6,
    items: [
      { id: "L3-1", level: 3, name: "静止挑战", description: "失败方保持静止 20 秒。", duration: 20, type: "physical" },
      { id: "L3-2", level: 3, name: "盲选挑战", description: "失败方在受限视线下完成一次盲选。", duration: 60, type: "visual" }
    ]
  },
  {
    level: 4,
    minGap: 7,
    maxGap: Number.POSITIVE_INFINITY,
    items: [
      { id: "L4-1", level: 4, name: "命运裁定", description: "获胜方指定一项高强度挑战。", duration: 120, type: "action" },
      { id: "L4-2", level: 4, name: "终局指令", description: "失败方完成一次趣味终局任务。", duration: 180, type: "action" }
    ]
  }
];
