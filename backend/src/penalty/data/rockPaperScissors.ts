import type { PenaltyLevel } from "../../types/index.js";

export const ROCK_PAPER_SCISSORS_PENALTIES: PenaltyLevel[] = [
  {
    level: 1,
    minGap: 1,
    maxGap: 2,
    items: [
      { id: "RPS-L1-1", level: 1, name: "快问快答", description: "失败方回答一个快速问题。", duration: 12, type: "verbal" },
      { id: "RPS-L1-2", level: 1, name: "胜者口号", description: "失败方大声说出胜者口号一次。", duration: 10, type: "verbal" }
    ]
  },
  {
    level: 2,
    minGap: 3,
    maxGap: 4,
    items: [
      { id: "RPS-L2-1", level: 2, name: "节奏挑战", description: "失败方完成一段 20 秒节奏动作。", duration: 20, type: "action" },
      { id: "RPS-L2-2", level: 2, name: "反手挑战", description: "下一回合失败方需反手操作。", duration: 20, type: "action" }
    ]
  },
  {
    level: 3,
    minGap: 5,
    maxGap: 6,
    items: [
      { id: "RPS-L3-1", level: 3, name: "姿势冻结", description: "失败方保持指定姿势 30 秒。", duration: 30, type: "physical" },
      { id: "RPS-L3-2", level: 3, name: "盲选口令", description: "失败方闭眼执行一次口令动作。", duration: 45, type: "visual" }
    ]
  },
  {
    level: 4,
    minGap: 7,
    maxGap: Number.POSITIVE_INFINITY,
    items: [
      { id: "RPS-L4-1", level: 4, name: "终局逆转", description: "失败方执行一项终局挑战。", duration: 90, type: "action" },
      { id: "RPS-L4-2", level: 4, name: "高压指令", description: "胜者给出高压但安全指令。", duration: 120, type: "action" }
    ]
  }
];
