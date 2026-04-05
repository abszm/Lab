<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
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
  label: string;
  revealedBy: string | null;
  exploded: boolean;
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

function handleGameResult(payload: { result: GameResult }) {
  gameStore.setResult(payload.result);
}

function handleGameState(payload: { state: GameState }) {
  gameStore.setState(payload.state);
}

function handlePenaltyTrigger(payload: { penalty: Penalty }) {
  gameStore.setPenalty(payload.penalty);
}

function handlePenaltyTimeout(payload: { reason?: "completed" | "timeout" }) {
  gameStore.clearPenalty(payload.reason ?? "timeout");
}

function handleRoomError(payload: { message: string }) {
  roomStore.setError(normalizeError(payload.message));
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

const players = computed(() => roomStore.room?.players ?? []);
const gameId = computed(() => roomStore.room?.gameId ?? "rock-paper-scissors");
const isMinesweeper = computed(() => gameId.value === "minesweeper-duel");
const gameTitle = computed(() => (isMinesweeper.value ? "双人扫雷" : "石头剪刀布"));
const minesweeperCells = computed(() => {
  const board = gameStore.state?.board as { cells?: MinesweeperCell[] } | undefined;
  return board?.cells ?? [];
});

function revealCell(cellId: string) {
  if (gameStore.penaltyActive) {
    return;
  }
  move(cellId);
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
        v-if="!isMinesweeper"
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
        v-else
        class="minesweeper"
      >
        <p class="hint">
          每回合双方各点开一个格子，踩雷会给对手加分。
        </p>
        <div class="mine-grid">
          <button
            v-for="cell in minesweeperCells"
            :key="cell.id"
            class="cell"
            :class="{
              revealed: Boolean(cell.revealedBy),
              exploded: cell.exploded,
              safe: Boolean(cell.revealedBy) && !cell.exploded
            }"
            :disabled="gameStore.penaltyActive || Boolean(cell.revealedBy)"
            @click="revealCell(cell.id)"
          >
            <span v-if="!cell.revealedBy">?</span>
            <span v-else-if="cell.exploded">雷</span>
            <span v-else>安全</span>
          </button>
        </div>
        <p class="hint">当前可选格子：{{ minesweeperCells.filter((cell) => !cell.revealedBy).length }}</p>
      </div>
      <div class="actions">
        <NeonButton @click="leaveRoom">离开房间</NeonButton>
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
        获胜者：{{ gameStore.result.winner ?? "平局" }} | 分差：{{ gameStore.result.winGap }}
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

.hint {
  margin: 0;
  color: #d1d6ff;
  font-size: 0.9rem;
}

.notice {
  color: #ffe29a;
}

.error {
  color: #ffb5b5;
}
</style>
