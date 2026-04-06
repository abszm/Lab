export interface RouletteTaskItem {
  id: string;
  color: string;
  title: string;
}

export const ROULETTE_TASK_POOL: RouletteTaskItem[] = [
  { id: "RT-01", color: "#ef4444", title: "喝一口" },
  { id: "RT-02", color: "#f97316", title: "真心话" },
  { id: "RT-03", color: "#f59e0b", title: "左边玩家喝" },
  { id: "RT-04", color: "#eab308", title: "右边玩家喝" },
  { id: "RT-05", color: "#84cc16", title: "连喝两口" },
  { id: "RT-06", color: "#22c55e", title: "唱一句歌" },
  { id: "RT-07", color: "#10b981", title: "绕口令挑战" },
  { id: "RT-08", color: "#14b8a6", title: "做鬼脸 10 秒" },
  { id: "RT-09", color: "#06b6d4", title: "模仿一个角色" },
  { id: "RT-10", color: "#0ea5e9", title: "讲一个冷笑话" },
  { id: "RT-11", color: "#3b82f6", title: "深呼吸挑战" },
  { id: "RT-12", color: "#6366f1", title: "闭眼转一圈" },
  { id: "RT-13", color: "#8b5cf6", title: "自定义口号" },
  { id: "RT-14", color: "#a855f7", title: "随机点歌" },
  { id: "RT-15", color: "#c026d3", title: "夸赞对手一句" },
  { id: "RT-16", color: "#d946ef", title: "复述上轮结果" },
  { id: "RT-17", color: "#ec4899", title: "下一轮先手" },
  { id: "RT-18", color: "#f43f5e", title: "下一轮后手" },
  { id: "RT-19", color: "#dc2626", title: "限时拍手节奏" },
  { id: "RT-20", color: "#ea580c", title: "挑战失败再喝" },
  { id: "RT-21", color: "#ca8a04", title: "换位一次" },
  { id: "RT-22", color: "#65a30d", title: "讲述趣事" },
  { id: "RT-23", color: "#16a34a", title: "保持安静 15 秒" },
  { id: "RT-24", color: "#0f766e", title: "指定一人喝" },
  { id: "RT-25", color: "#2563eb", title: "免罚一次" },
  { id: "RT-26", color: "#7c3aed", title: "再转一次" }
];
