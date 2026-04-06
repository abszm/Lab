<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import GameBoard from "../components/game/GameBoard.vue";
import PlayerInfo from "../components/game/PlayerInfo.vue";
import NeonButton from "../components/common/NeonButton.vue";
import PenaltyPopup from "../components/common/PenaltyPopup.vue";
import { useSocketStore } from "../stores/socket";
import { useRoomStore, type RoomState } from "../stores/room";
import { useGameStore, type GameResult, type GameState, type Penalty } from "../stores/game";
import { normalizeError } from "../utils/errorCopy";

const route = useRoute();
const router = useRouter();
const socketStore = useSocketStore();
const roomStore = useRoomStore();
const gameStore = useGameStore();

const code = computed(() => route.params.code?.toString() ?? "");
const rpsChoices = ["rock", "paper", "scissors"];
const choiceLabels: Record<string, string> = {
  rock: "石头",
  paper: "布",
  scissors: "剪刀"
};

interface MinesweeperCell {
  id: string;
  row: number;
  col: number;
  revealed: boolean;
  exploded: boolean;
  adjacent: number;
  isMine: boolean;
  revealedBy: string | null;
}

interface MinesweeperBoard {
  size: number;
  mineCount: number;
  currentPlayerId: string;
  winner: string | null;
  gameOver: boolean;
  revealedSafeCount: number;
  cells: MinesweeperCell[];
}

interface GomokuCell {
  id: string;
  row: number;
  col: number;
  stone: "black" | "white" | null;
}

interface GomokuBoard {
  size: number;
  currentPlayerId: string;
  winner: string | null;
  winningLine: string[];
  cells: GomokuCell[];
}

interface RouletteStartPayload {
  angle: number;
  durationMs: number;
  sectors: string[];
  resultIndex: number;
  resultLabel: string;
  byPlayerId: string;
}

const restartRequesterId = ref("");
const restartPending = ref(false);
const minesweeperShake = ref(false);
const gomokuMovePending = ref(false);
const rouletteAngle = ref(0);
const rouletteDurationMs = ref(4000);
const rouletteSectors = ref<string[]>([]);
const rouletteResult = ref("");
const rouletteSpinning = ref(false);
const rouletteTriggerPlayerId = ref("");
const resultCardFlipped = ref(false);
const resultCardPulse = ref(false);

const rouletteSectorAngle = computed(() => (rouletteSectors.value.length ? 360 / rouletteSectors.value.length : 0));
const rouletteBackground = computed(() => {
  if (!rouletteSectors.value.length) {
    return "conic-gradient(#1e293b 0deg 180deg, #334155 180deg 360deg)";
  }

  return `conic-gradient(${rouletteSectors.value
    .map((_, i) => {
      const from = i * rouletteSectorAngle.value;
      const to = (i + 1) * rouletteSectorAngle.value;
      const color = i % 2 === 0 ? "#1e293b" : "#334155";
      return `${color} ${from}deg ${to}deg`;
    })
    .join(",")})`;
});

function rouletteLabelStyle(index: number): Record<string, string> {
  const base = rouletteSectorAngle.value || 1;
  const rotate = index * base + base / 2;
  return {
    transform: `translateX(-50%) rotate(${rotate}deg)`
  };
}

function getPlayerLabel(playerId: string): string {
  const room = roomStore.room;
  if (!room) {
    return "玩家";
  }

  if (playerId === room.hostId) {
    return "玩家1";
  }

  const index = room.players.findIndex((player) => player.id === playerId);
  if (index >= 0) {
    return `玩家${index + 1}`;
  }

  return "玩家2";
}

function handleRoomState(payload: { room: RoomState | null }) {
  roomStore.setRoom(payload.room);
}

function handleRoomJoined(payload: { room: RoomState }) {
  roomStore.setRoom(payload.room);
  roomStore.clearError();
}

function handleRouletteState(payload: { angle: number; sectors: string[] }) {
  rouletteAngle.value = payload.angle;
  rouletteSectors.value = payload.sectors;
}

function handleRouletteSpinStart(payload: RouletteStartPayload) {
  rouletteSectors.value = payload.sectors;
  rouletteDurationMs.value = payload.durationMs;
  rouletteAngle.value = payload.angle;
  rouletteResult.value = "";
  rouletteSpinning.value = true;
  rouletteTriggerPlayerId.value = payload.byPlayerId;
}

function handleRouletteSpinEnd(payload: { resultLabel: string; byPlayerId: string }) {
  rouletteResult.value = payload.resultLabel;
  rouletteSpinning.value = false;
  rouletteTriggerPlayerId.value = payload.byPlayerId;
}

function handleGameResult(payload: { result: GameResult }) {
  gameStore.setResult(payload.result);
  resultCardFlipped.value = false;
  resultCardPulse.value = false;
  if (payload.result.winner && payload.result.cardOptions?.length) {
    gameStore.setCardDraft({ winnerId: payload.result.winner, cards: payload.result.cardOptions });
  }

  if (isMinesweeper.value && payload.result.winner === socketStore.playerId) {
    minesweeperShake.value = true;
    roomStore.setNotice("对手踩雷，已触发惩罚。请继续。");
    window.setTimeout(() => {
      minesweeperShake.value = false;
    }, 360);
  }
}

function handleGameState(payload: { state: GameState }) {
  gameStore.setState(payload.state);
  gomokuMovePending.value = false;
  minesweeperMovePending.value = false;
}

function handlePenaltyTrigger(payload: { penalty: Penalty }) {
  gameStore.setPenalty(payload.penalty);
}

function handlePenaltyTimeout(payload: { reason?: "completed" | "timeout" }) {
  gameStore.clearPenalty(payload.reason ?? "timeout");
}

function handleCardDraft(payload: { winnerId: string; cards: GameResult["cardOptions"] }) {
  if (!payload.cards) {
    return;
  }
  gameStore.setCardDraft({ winnerId: payload.winnerId, cards: payload.cards });
}

function handleCardRevealed(payload: {
  winnerId: string;
  loserId: string;
  card: { id: string; cellId: string; level: 1 | 2 | 3 | 4; title: string; description: string };
}) {
  gameStore.setCardReveal(payload);
}

function handleCardAcknowledged(payload: { byPlayerId: string }) {
  gameStore.setCardAcknowledged(payload.byPlayerId);
}

function handleRestartRequested(payload: { fromPlayerId: string }) {
  restartRequesterId.value = payload.fromPlayerId;
  if (payload.fromPlayerId !== socketStore.playerId) {
    roomStore.setNotice(`${getPlayerLabel(payload.fromPlayerId)} 请求重新开始。`);
  } else {
    roomStore.setNotice("已发送重新开始请求，等待对方确认。");
  }
}

function handleRestartResult(payload: { accepted: boolean; responderId: string }) {
  restartPending.value = false;
  restartRequesterId.value = "";
  gameStore.resetRound();
  roomStore.clearError();

  if (payload.accepted) {
    roomStore.setNotice("双方已确认，棋盘已重置。新一局开始。");
    window.setTimeout(() => {
      window.location.reload();
    }, 350);
    return;
  }

  roomStore.setNotice(`重新开始请求被 ${getPlayerLabel(payload.responderId)} 拒绝。`);
}

function handleRoomError(payload: { message: string }) {
  roomStore.setError(normalizeError(payload.message));
  gomokuMovePending.value = false;
  minesweeperMovePending.value = false;
}

function handleRoomClosed(payload: { reason?: string }) {
  roomStore.setNotice(payload.reason === "player_timeout" ? "对手掉线超时，房间已关闭。" : "房间已关闭。返回首页。");
  socketStore.clearRoomCode();
  gameStore.resetRound();
  router.replace("/");
}

function handleDisconnected(payload: { playerId: string }) {
  roomStore.setNotice(`${getPlayerLabel(payload.playerId)} 已断线。`);
}

function handleReconnected(payload: { playerId: string }) {
  roomStore.setNotice(`${getPlayerLabel(payload.playerId)} 已重连。`);
}

onMounted(() => {
  socketStore.connect();
  socketStore.setRoomCode(code.value);
  gameStore.resetRound();

  const socket = socketStore.socket;
  if (!socket) {
    return;
  }

  socket.on("room:state", handleRoomState);
  socket.on("room:joined", handleRoomJoined);
  socket.on("game:roulette:state", handleRouletteState);
  socket.on("game:roulette:spin-start", handleRouletteSpinStart);
  socket.on("game:roulette:spin-end", handleRouletteSpinEnd);
  socket.on("game:state", handleGameState);
  socket.on("game:result", handleGameResult);
  socket.on("penalty:trigger", handlePenaltyTrigger);
  socket.on("penalty:timeout", handlePenaltyTimeout);
  socket.on("game:card:draft", handleCardDraft);
  socket.on("game:card:revealed", handleCardRevealed);
  socket.on("game:card:acknowledged", handleCardAcknowledged);
  socket.on("game:restart:requested", handleRestartRequested);
  socket.on("game:restart:result", handleRestartResult);
  socket.on("room:error", handleRoomError);
  socket.on("room:closed", handleRoomClosed);
  socket.on("player:disconnected", handleDisconnected);
  socket.on("player:reconnected", handleReconnected);

  socket.emit("game:roulette:sync-request");

  if (!roomStore.room || roomStore.room.code !== code.value) {
    socket.emit("room:join", { code: code.value });
  }
});

onUnmounted(() => {
  const socket = socketStore.socket;
  if (!socket) {
    return;
  }

  socket.off("room:state", handleRoomState);
  socket.off("room:joined", handleRoomJoined);
  socket.off("game:roulette:state", handleRouletteState);
  socket.off("game:roulette:spin-start", handleRouletteSpinStart);
  socket.off("game:roulette:spin-end", handleRouletteSpinEnd);
  socket.off("game:state", handleGameState);
  socket.off("game:result", handleGameResult);
  socket.off("penalty:trigger", handlePenaltyTrigger);
  socket.off("penalty:timeout", handlePenaltyTimeout);
  socket.off("game:card:draft", handleCardDraft);
  socket.off("game:card:revealed", handleCardRevealed);
  socket.off("game:card:acknowledged", handleCardAcknowledged);
  socket.off("game:restart:requested", handleRestartRequested);
  socket.off("game:restart:result", handleRestartResult);
  socket.off("room:error", handleRoomError);
  socket.off("room:closed", handleRoomClosed);
  socket.off("player:disconnected", handleDisconnected);
  socket.off("player:reconnected", handleReconnected);
});

function move(action: string) {
  socketStore.socket?.emit("game:move", { move: { action } });
}

function requestRouletteSpin() {
  socketStore.socket?.emit("game:roulette:spin-request");
}

function completePenalty() {
  socketStore.socket?.emit("penalty:complete", {});
}

function flipResultCard() {
  if (!gameStore.result) {
    return;
  }

  resultCardFlipped.value = !resultCardFlipped.value;
  resultCardPulse.value = true;
  window.setTimeout(() => {
    resultCardPulse.value = false;
  }, 360);
}

function leaveRoom() {
  socketStore.socket?.emit("room:leave");
  socketStore.clearRoomCode();
  roomStore.setRoom(null);
  gameStore.resetRound();
  router.replace("/");
}

function revealCell(cellId: string) {
  if (gameStore.penaltyActive || !isMyTurnInMinesweeper.value || minesweeperMovePending.value) {
    return;
  }
  minesweeperMovePending.value = true;
  move(cellId);
}

function placeStone(cellId: string) {
  if (!isMyTurnInGomoku.value || gameStore.penaltyActive || gomokuMovePending.value) {
    return;
  }
  gomokuMovePending.value = true;
  move(cellId);
}

function requestRestart() {
  restartPending.value = true;
  socketStore.socket?.emit("game:restart:request");
}

function respondRestart(accept: boolean) {
  socketStore.socket?.emit("game:restart:respond", { accept });
}

function pickCard(cardId: string) {
  socketStore.socket?.emit("game:card:pick", { cardId });
}

function acknowledgeCard() {
  socketStore.socket?.emit("game:card:ack");
}

const players = computed(() => roomStore.room?.players ?? []);
const gameId = computed(() => roomStore.room?.gameId ?? "rock-paper-scissors");
const isRps = computed(() => gameId.value === "rock-paper-scissors");
const isMinesweeper = computed(() => gameId.value === "minesweeper-duel");
const isGomoku = computed(() => gameId.value === "gomoku-duel");
const isRoulette = computed(() => gameId.value === "drinking-roulette");
const gameTitle = computed(() => {
  if (isRoulette.value) {
    return "喝酒转盘";
  }
  if (isMinesweeper.value) {
    return "双人扫雷";
  }
  if (isGomoku.value) {
    return "五子棋对局";
  }
  return "石头剪刀布";
});

const minesweeperCells = computed(() => {
  const board = gameStore.state?.board as MinesweeperBoard | undefined;
  return board?.cells ?? [];
});
const minesweeperBoard = computed(() => gameStore.state?.board as MinesweeperBoard | undefined);
const minesweeperMovePending = ref(false);
const isMyTurnInMinesweeper = computed(() => {
  const current = minesweeperBoard.value?.currentPlayerId;
  return Boolean(current && current === socketStore.playerId);
});
const minesweeperStatusText = computed(() => {
  const board = minesweeperBoard.value;
  if (!board) {
    return "等待棋盘同步...";
  }

  if (board.gameOver) {
    return board.winner ? `胜者：${getPlayerLabel(board.winner)}` : "本局结束";
  }

  return `当前操作：${getPlayerLabel(board.currentPlayerId)}`;
});

const gomokuBoard = computed(() => gameStore.state?.board as GomokuBoard | undefined);
const gomokuCells = computed(() => gomokuBoard.value?.cells ?? []);
const gomokuWinningLine = computed(() => new Set(gomokuBoard.value?.winningLine ?? []));
const isMyTurnInGomoku = computed(() => {
  const currentPlayerId = gomokuBoard.value?.currentPlayerId;
  return Boolean(currentPlayerId && currentPlayerId === socketStore.playerId);
});
const gomokuStatusText = computed(() => {
  const board = gomokuBoard.value;
  if (!board) {
    return "等待棋盘同步...";
  }

  if (board.winner) {
    return `胜者：${getPlayerLabel(board.winner)}`;
  }

  return `当前落子：${getPlayerLabel(board.currentPlayerId)}`;
});
const showRestartRespondActions = computed(() => {
  return Boolean(restartRequesterId.value) && restartRequesterId.value !== socketStore.playerId;
});
const isCardWinner = computed(() => gameStore.cardWinnerId === socketStore.playerId);
const isCardLoser = computed(() => gameStore.cardLoserId === socketStore.playerId);
const showCardDraft = computed(() => isGomoku.value && gameStore.cardDraft.length > 0 && !gameStore.cardReveal);
const showCardReveal = computed(() => isGomoku.value && Boolean(gameStore.cardReveal));

function minesweeperCellClass(cell: MinesweeperCell): Record<string, boolean> {
  return {
    "cell-outset": !cell.revealed,
    "cell-inset": cell.revealed,
    exploded: cell.exploded,
    "cell-player-a": cell.revealed && cell.revealedBy === (players.value[0]?.id ?? ""),
    "cell-player-b": cell.revealed && cell.revealedBy === (players.value[1]?.id ?? "")
  };
}

function minesweeperNumberClass(adjacent: number): string {
  if (adjacent < 1 || adjacent > 8) {
    return "";
  }
  return `mine-number-${adjacent}`;
}
</script>

<template>
  <section class="layout">
    <GameBoard>
      <h2>{{ gameTitle }}</h2>
      <div class="grid">
        <PlayerInfo
          v-for="player in players"
          :key="player.id"
          :label="getPlayerLabel(player.id)"
          :score="player.score"
        />
      </div>

      <div
        v-if="isRps"
        class="actions"
      >
        <NeonButton
          v-for="choice in rpsChoices"
          :key="choice"
          :disabled="gameStore.penaltyActive"
          @click="move(choice)"
        >
          {{ choiceLabels[choice] }}
        </NeonButton>
      </div>

      <div
        v-else-if="isMinesweeper"
        class="minesweeper retro-shell"
        :class="{ shake: minesweeperShake }"
      >
        <div class="retro-header inset-panel">
          <div class="retro-counter">{{ String(players[0]?.score ?? 0).padStart(3, "0") }}</div>
          <button
            class="retro-face outset-panel"
            @click="requestRestart"
          >
            {{ minesweeperBoard?.gameOver ? "X" : "O" }}
          </button>
          <div class="retro-counter">{{ String(players[1]?.score ?? 0).padStart(3, "0") }}</div>
        </div>
        <div class="retro-field inset-panel">
          <div class="mine-grid">
            <button
              v-for="cell in minesweeperCells"
              :key="cell.id"
              class="cell"
              :class="minesweeperCellClass(cell)"
              :disabled="gameStore.penaltyActive || cell.revealed || !isMyTurnInMinesweeper || Boolean(minesweeperBoard?.gameOver)"
              @click="revealCell(cell.id)"
            >
              <span v-if="!cell.revealed"></span>
              <span v-else-if="cell.isMine">*</span>
              <span
                v-else-if="cell.adjacent > 0"
                :class="minesweeperNumberClass(cell.adjacent)"
              >
                {{ cell.adjacent }}
              </span>
            </button>
          </div>
        </div>
        <p class="hint">{{ minesweeperStatusText }} · 剩余未翻开：{{ minesweeperCells.filter((cell) => !cell.revealed).length }}</p>
      </div>

      <div
        v-else-if="isGomoku"
        class="gomoku"
      >
        <p class="hint">{{ gomokuStatusText }}</p>
        <div class="gomoku-grid">
          <button
            v-for="cell in gomokuCells"
            :key="cell.id"
            class="gomoku-cell"
            :class="{
              filled: Boolean(cell.stone),
              black: cell.stone === 'black',
              white: cell.stone === 'white',
              dimmed: Boolean(gomokuBoard?.winner) && !gomokuWinningLine.has(cell.id),
              highlighted: gomokuWinningLine.has(cell.id)
            }"
            :disabled="Boolean(cell.stone) || Boolean(gomokuBoard?.winner) || !isMyTurnInGomoku"
            @click="placeStone(cell.id)"
          >
            <span
              v-if="cell.stone"
              class="stone"
            />
          </button>
        </div>
      </div>

      <div
        v-if="isRoulette"
        class="roulette-shell"
      >
        <p class="hint">喝酒转盘（中场）</p>
        <div class="roulette-wrap">
          <div class="roulette-pointer"></div>
          <div
            class="roulette-wheel"
            :style="{
              transform: `rotate(${rouletteAngle}deg)`,
              transitionDuration: `${rouletteDurationMs}ms`,
              background: rouletteBackground
            }"
          >
            <div
              v-for="(item, index) in rouletteSectors"
              :key="`${item}-${index}`"
              class="roulette-label"
              :style="rouletteLabelStyle(index)"
            >
              {{ item }}
            </div>
          </div>
        </div>
        <div class="actions">
          <NeonButton
            :disabled="rouletteSpinning"
            @click="requestRouletteSpin"
          >
            开启命运
          </NeonButton>
        </div>
        <p
          v-if="rouletteResult"
          class="hint"
        >
          结果：{{ rouletteResult }}（触发者：{{ getPlayerLabel(rouletteTriggerPlayerId) }}）
        </p>
      </div>

      <div
        v-if="showCardDraft"
        class="card-panel"
      >
        <p class="hint">五连已达成，胜者请选择一张盲选卡牌。</p>
        <div class="card-grid">
          <button
            v-for="card in gameStore.cardDraft"
            :key="card.id"
            class="blind-card"
            :disabled="!isCardWinner"
            @click="pickCard(card.id)"
          >
            {{ card.displayName }}
          </button>
        </div>
        <p
          v-if="!isCardWinner"
          class="hint"
        >
          等待 {{ getPlayerLabel(gameStore.cardWinnerId) }} 选择卡牌。
        </p>
      </div>

      <div
        v-if="showCardReveal"
        class="card-panel revealed"
      >
        <p class="eyebrow">盲选结果</p>
        <h3>{{ gameStore.cardReveal?.title }}</h3>
        <p>{{ gameStore.cardReveal?.description }}</p>
        <p class="hint">等级：L{{ gameStore.cardReveal?.level }}</p>
        <NeonButton
          v-if="isCardLoser && !gameStore.cardAcknowledgedBy"
          @click="acknowledgeCard"
        >
          确认执行
        </NeonButton>
        <p
          v-if="gameStore.cardAcknowledgedBy"
          class="hint"
        >
          {{ getPlayerLabel(gameStore.cardAcknowledgedBy) }} 已确认执行。
        </p>
      </div>

      <div class="actions">
        <NeonButton @click="leaveRoom">离开房间</NeonButton>
        <NeonButton
          :disabled="restartPending"
          @click="requestRestart"
        >
          请求重新开始
        </NeonButton>
        <NeonButton
          v-if="showRestartRespondActions"
          @click="respondRestart(true)"
        >
          接受重开
        </NeonButton>
        <NeonButton
          v-if="showRestartRespondActions"
          @click="respondRestart(false)"
        >
          拒绝重开
        </NeonButton>
      </div>

      <p
        v-if="roomStore.notice"
        class="notice"
      >
        {{ roomStore.notice }}
      </p>
      <p
        v-if="roomStore.error"
        class="error"
      >
        {{ roomStore.error }}
      </p>

      <div
        v-if="gameStore.result"
        class="result-card-wrap"
      >
        <button
          class="result-card"
          :class="{ flipped: resultCardFlipped, pulse: resultCardPulse }"
          @click="flipResultCard"
        >
          <span class="card-face card-back">结算卡牌 · 点击翻开</span>
          <span class="card-face card-front">
            <strong v-if="gameStore.penalty">惩罚任务卡</strong>
            <strong v-else>{{ gameStore.result.winner ? `${getPlayerLabel(gameStore.result.winner)} 获胜` : "本局平局" }}</strong>
            <small>分差：{{ gameStore.result.winGap }}</small>
            <small v-if="gameStore.penalty">{{ gameStore.penalty.name }}</small>
            <small v-if="gameStore.penalty">{{ gameStore.penalty.description }}</small>
            <small v-if="gameStore.penalty">时长：{{ gameStore.penalty.duration }} 秒</small>
            <small v-if="!gameStore.penalty">本局未触发惩罚任务</small>
          </span>
        </button>
      </div>

      <PenaltyPopup
        v-if="gameStore.penalty"
        :title="gameStore.penalty.name"
        :description="gameStore.penalty.description"
      />
      <NeonButton
        v-if="gameStore.penalty"
        @click="completePenalty"
      >
        完成惩罚
      </NeonButton>
      <p
        v-if="gameStore.lastPenaltyReason === 'timeout'"
        class="notice"
      >
        惩罚超时，本回合已解锁。
      </p>
      <p
        v-if="gameStore.lastPenaltyReason === 'completed'"
        class="notice"
      >
        惩罚已完成，可开始下一回合。
      </p>
    </GameBoard>
  </section>
</template>

<style scoped>
.layout {
  display: grid;
  gap: 1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.6rem;
  margin: 0.8rem 0;
}

.actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.minesweeper {
  display: grid;
  gap: 0.7rem;
  margin: 0.8rem 0;
}

.retro-shell {
  background: #bdbdbd;
  border-radius: 2px;
  padding: 0.45rem;
  border-top: 3px solid #ffffff;
  border-left: 3px solid #ffffff;
  border-right: 3px solid #7b7b7b;
  border-bottom: 3px solid #7b7b7b;
  color: #111;
}

.retro-header {
  padding: 0.4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.retro-counter {
  background: #111;
  color: #ff1d25;
  font-family: "Courier New", monospace;
  font-weight: 700;
  letter-spacing: 0.08em;
  min-width: 52px;
  text-align: center;
  padding: 0.15rem 0.25rem;
}

.retro-face {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.retro-field {
  padding: 0.25rem;
}

.mine-grid {
  display: grid;
  grid-template-columns: repeat(9, minmax(28px, 1fr));
  gap: 0;
}

.cell {
  min-height: 28px;
  border-radius: 0;
  border: none;
  background: #bdbdbd;
  color: #111;
  cursor: pointer;
  font-family: "Courier New", monospace;
  font-size: 0.85rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.cell:disabled {
  opacity: 1;
  cursor: not-allowed;
}

.cell-outset {
  border-top: 2px solid #fff;
  border-left: 2px solid #fff;
  border-right: 2px solid #7b7b7b;
  border-bottom: 2px solid #7b7b7b;
}

.cell-inset {
  border-top: 1px solid #7b7b7b;
  border-left: 1px solid #7b7b7b;
  border-right: 1px solid #d9d9d9;
  border-bottom: 1px solid #d9d9d9;
}

.cell.exploded {
  background: #ff8f8f;
}

.cell-player-a.cell-inset {
  box-shadow: inset 0 0 0 1px rgba(70, 129, 255, 0.45);
}

.cell-player-b.cell-inset {
  box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.45);
}

.gomoku {
  display: grid;
  gap: 0.7rem;
  margin: 0.8rem 0;
}

.gomoku-grid {
  display: grid;
  grid-template-columns: repeat(15, minmax(18px, 1fr));
  gap: 0.25rem;
  background: linear-gradient(180deg, rgba(208, 176, 123, 0.42), rgba(189, 152, 95, 0.45));
  border: 1px solid rgba(245, 220, 176, 0.45);
  border-radius: 0.75rem;
  padding: 0.55rem;
}

.gomoku-cell {
  position: relative;
  aspect-ratio: 1;
  border-radius: 0.25rem;
  border: 1px solid rgba(98, 65, 21, 0.35);
  background: rgba(238, 214, 170, 0.62);
  cursor: pointer;
  padding: 0;
}

.gomoku-cell:disabled {
  cursor: not-allowed;
}

.gomoku-cell.dimmed {
  opacity: 0.35;
}

.gomoku-cell.highlighted {
  box-shadow: 0 0 0 1px rgba(255, 71, 87, 0.5), 0 0 8px rgba(255, 71, 87, 0.45);
  animation: pulse 1.2s ease-in-out infinite;
}

.stone {
  position: absolute;
  inset: 3px;
  border-radius: 999px;
  display: block;
}

.gomoku-cell.black .stone {
  background: radial-gradient(circle at 35% 30%, #666, #141414 70%);
}

.gomoku-cell.white .stone {
  background: radial-gradient(circle at 35% 30%, #ffffff, #d5d5d5 70%);
}

.hint {
  margin: 0;
  color: #d1d6ff;
  font-size: 0.9rem;
}

.roulette-shell {
  margin-top: 0.6rem;
  padding: 0.9rem;
  border-radius: 0.8rem;
  background: radial-gradient(circle at 30% 20%, rgba(255, 0, 100, 0.22), rgba(12, 18, 32, 0.92));
  border: 1px solid rgba(255, 75, 139, 0.36);
  display: grid;
  gap: 0.65rem;
}

.roulette-wrap {
  position: relative;
  width: min(320px, 90vw);
  margin: 0 auto;
  display: grid;
  place-items: center;
}

.roulette-pointer {
  width: 0;
  height: 0;
  border-left: 14px solid transparent;
  border-right: 14px solid transparent;
  border-top: 24px solid #f43f5e;
  z-index: 2;
  margin-bottom: -10px;
}

.roulette-wheel {
  position: relative;
  width: 300px;
  height: 300px;
  border-radius: 999px;
  border: 8px solid #1e293b;
  box-shadow: 0 0 20px rgba(255, 0, 100, 0.5), 0 0 40px rgba(0, 0, 0, 0.4) inset;
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.12, 0.9, 0.18, 1);
  overflow: hidden;
}

.roulette-label {
  position: absolute;
  left: 50%;
  top: 8px;
  transform-origin: 50% 142px;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
  white-space: nowrap;
}

.minesweeper .hint {
  color: #1f2937;
}

.card-panel {
  margin-top: 0.8rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(255, 160, 200, 0.45);
  background: rgba(35, 18, 36, 0.62);
  padding: 0.9rem;
  display: grid;
  gap: 0.65rem;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 0.45rem;
}

.blind-card {
  border-radius: 0.65rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: linear-gradient(145deg, rgba(255, 134, 194, 0.22), rgba(130, 87, 255, 0.2));
  color: inherit;
  min-height: 64px;
  cursor: pointer;
}

.blind-card:disabled {
  opacity: 0.68;
  cursor: not-allowed;
}

.card-panel.revealed {
  border-color: rgba(255, 113, 113, 0.5);
  background: rgba(44, 19, 19, 0.62);
}

.result-card-wrap {
  perspective: 1000px;
}

.result-card {
  position: relative;
  width: min(320px, 100%);
  min-height: 108px;
  border: 0;
  background: transparent;
  transform-style: preserve-3d;
  transition: transform 0.62s cubic-bezier(0.2, 0.8, 0.2, 1);
  cursor: pointer;
  padding: 0;
}

.result-card.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  inset: 0;
  border-radius: 0.85rem;
  backface-visibility: hidden;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.4rem;
  padding: 0.95rem;
}

.card-back {
  border: 1px solid rgba(253, 223, 175, 0.46);
  background: radial-gradient(circle at 22% 18%, rgba(255, 240, 206, 0.48), rgba(175, 119, 68, 0.38)),
    linear-gradient(145deg, rgba(255, 250, 235, 0.2), rgba(168, 118, 74, 0.45));
  color: #fff6e4;
}

.card-front {
  transform: rotateY(180deg);
  border: 1px solid rgba(195, 207, 224, 0.42);
  background: radial-gradient(circle at 28% 20%, rgba(216, 228, 244, 0.44), rgba(60, 75, 92, 0.36)),
    linear-gradient(145deg, rgba(205, 213, 223, 0.22), rgba(74, 84, 98, 0.5));
  color: #f8fcff;
}

.card-front strong {
  font-size: 1rem;
}

.card-front small {
  opacity: 0.9;
}

.eyebrow {
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  color: #ffbe89;
  margin: 0;
}

.notice {
  color: #ffe29a;
}

.error {
  color: #ffb5b5;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}

.shake {
  animation: shake 0.36s ease-in-out;
}

.result-card.pulse {
  animation: heartbeat 0.36s ease-in-out;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-3px);
  }
  40% {
    transform: translateX(3px);
  }
  60% {
    transform: translateX(-2px);
  }
  80% {
    transform: translateX(2px);
  }
}

@keyframes heartbeat {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.04);
  }
  70% {
    transform: scale(0.98);
  }
  100% {
    transform: scale(1);
  }
}
</style>
