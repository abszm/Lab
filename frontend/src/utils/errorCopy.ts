const ERROR_COPY: Record<string, string> = {
  ROOM_NOT_FOUND: "房间不存在，请确认房间码。",
  ROOM_FULL: "房间已满，请让其中一位玩家离开后重试。",
  PLAYER_ALREADY_IN_ROOM: "你已经在这个房间中了。",
  ALREADY_IN_GAME: "你已经在其他房间中，请先离开当前房间。",
  CREATE_FAILED: "创建房间失败，请稍后再试。",
  SESSION_NOT_FOUND: "会话已失效，请重新加入房间。",
  PENALTY_ACTIVE: "当前惩罚尚未结束，暂时无法操作。",
  GAME_NOT_STARTED: "对局尚未开始，请等待双方就绪。",
  GAME_NOT_FOUND: "未找到对局数据，请返回房间重试。",
  INVALID_MOVE: "无效操作，请重新选择出招。",
  NOT_YOUR_TURN: "还没轮到你落子，请稍等。",
  CELL_OCCUPIED: "该点位已被占用，请选择其他位置。",
  GAME_ALREADY_FINISHED: "本局已结束，请开始新一局。",
  ROULETTE_SPINNING: "转盘正在旋转，请等待结果。",
  PLAYER_NOT_IN_ROOM: "当前玩家不在该房间中。",
  ALREADY_MOVED: "本回合你已经出招，请等待对手。",
  ROOM_CODE_GENERATION_FAILED: "房间码生成失败，请稍后重试。",
  NOT_FOUND: "请求资源不存在。"
};

export function normalizeError(message: string): string {
  return ERROR_COPY[message] ?? message;
}
