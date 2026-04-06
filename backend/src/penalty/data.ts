import type { PenaltyLevel } from "../types/index.js";

export const GAME_PENALTY_DATA: Record<string, PenaltyLevel[]> = {
  "rock-paper-scissors": [
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
  ],
  "minesweeper-duel": [
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
  ],
  "gomoku-duel": [
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
  ],
  "drinking-roulette": [
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
  ]
};
