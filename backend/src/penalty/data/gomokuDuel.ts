import type { PenaltyLevel } from "../../types/index.js";

export const GOMOKU_DUEL_PENALTIES: PenaltyLevel[] = [
  {
    level: 1,
    minGap: 1,
    maxGap: 2,
    items: [
      { id: "GO-L1-PENDING", level: 1, name: "待配置", description: "五子棋 L1 惩罚任务待配置。", duration: 1, type: "verbal" }
    ]
  },
  {
    level: 2,
    minGap: 3,
    maxGap: 4,
    items: [
      { id: "GO-L2-PENDING", level: 2, name: "待配置", description: "五子棋 L2 惩罚任务待配置。", duration: 1, type: "action" }
    ]
  },
  {
    level: 3,
    minGap: 5,
    maxGap: 6,
    items: [
      { id: "GO-L3-PENDING", level: 3, name: "待配置", description: "五子棋 L3 惩罚任务待配置。", duration: 1, type: "visual" }
    ]
  },
  {
    level: 4,
    minGap: 7,
    maxGap: Number.POSITIVE_INFINITY,
    items: [
      { id: "GO-L4-PENDING", level: 4, name: "待配置", description: "五子棋 L4 惩罚任务待配置。", duration: 1, type: "action" }
    ]
  }
];
