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

const restartRequesterId = ref("");
const restartPending = ref(false);
const gomokuMovePending = ref(false);

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

function handleGameResult(payload: { result: GameResult }) {
  gameStore.setResult(payload.result);
  if (payload.result.winner && payload.result.cardOptions?.length) {
    gameStore.setCardDraft({ winnerId: payload.result.winner, cards: payload.result.cardOptions });
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

function completePenalty() {
  socketStore.socket?.emit("penalty:complete", {});
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
const gameTitle = computed(() => {
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
        class="minesweeper"
      >
        <p class="hint">经典扫雷模式：踩雷即输，清空安全格即胜。</p>
        <p class="hint">{{ minesweeperStatusText }}</p>
        <div class="mine-grid">
          <button
            v-for="cell in minesweeperCells"
            :key="cell.id"
            class="cell"
            :class="{
              revealed: cell.revealed,
              exploded: cell.exploded,
              safe: cell.revealed && !cell.exploded
            }"
            :disabled="gameStore.penaltyActive || cell.revealed || !isMyTurnInMinesweeper || Boolean(minesweeperBoard?.gameOver)"
            @click="revealCell(cell.id)"
          >
            <span v-if="!cell.revealed">■</span>
            <span v-else-if="cell.isMine">雷</span>
            <span v-else-if="cell.adjacent === 0"></span>
            <span v-else>{{ cell.adjacent }}</span>
          </button>
        </div>
        <p class="hint">剩余未翻开：{{ minesweeperCells.filter((cell) => !cell.revealed).length }}</p>
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

      <p v-if="gameStore.result">
        获胜者：{{ gameStore.result.winner ? getPlayerLabel(gameStore.result.winner) : "平局" }} | 分差：{{ gameStore.result.winGap }}
      </p>

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

.mine-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(56px, 1fr));
  gap: 0.45rem;
}

.cell {
  min-height: 56px;
  border-radius: 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  cursor: pointer;
}

.cell:disabled {
  opacity: 0.88;
  cursor: not-allowed;
}

.cell.revealed.safe {
  background: rgba(72, 197, 120, 0.2);
  border-color: rgba(72, 197, 120, 0.5);
}

.cell.revealed.exploded {
  background: rgba(255, 89, 89, 0.2);
  border-color: rgba(255, 89, 89, 0.5);
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
</style>
