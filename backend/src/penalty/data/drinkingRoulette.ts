import type { PenaltyLevel } from "../../types/index.js";

export const DRINKING_ROULETTE_PENALTIES: PenaltyLevel[] = [
  {
    level: 1,
    minGap: 1,
    maxGap: 2,
    items: [
      { id: "DR-L1-1", level: 1, name: "转盘口令", description: "失败方执行一次转盘口令。", duration: 10, type: "verbal" },
      { id: "DR-L1-2", level: 1, name: "举杯致意", description: "失败方举杯向胜者致意。", duration: 8, type: "action" }
    ]
  },
  {
    level: 2,
    minGap: 3,
    maxGap: 4,
    items: [
      { id: "DR-L2-1", level: 2, name: "节奏饮用", description: "失败方按节奏完成饮用动作。", duration: 25, type: "action" },
      { id: "DR-L2-2", level: 2, name: "命运问答", description: "失败方回答一次命运问答。", duration: 25, type: "verbal" }
    ]
  },
  {
    level: 3,
    minGap: 5,
    maxGap: 6,
    items: [
      { id: "DR-L3-1", level: 3, name: "定格挑战", description: "失败方定格 30 秒。", duration: 30, type: "physical" },
      { id: "DR-L3-2", level: 3, name: "盲选执行", description: "失败方执行一次盲选挑战。", duration: 45, type: "visual" }
    ]
  },
  {
    level: 4,
    minGap: 7,
    maxGap: Number.POSITIVE_INFINITY,
    items: [
      { id: "DR-L4-1", level: 4, name: "命运终局", description: "失败方执行终局命运任务。", duration: 120, type: "action" },
      { id: "DR-L4-2", level: 4, name: "庄家指令", description: "胜者发出一条高阶安全指令。", duration: 150, type: "action" }
    ]
  }
];
