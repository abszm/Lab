<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import GameBoard from "../components/game/GameBoard.vue";
import PlayerInfo from "../components/game/PlayerInfo.vue";
import NeonButton from "../components/common/NeonButton.vue";
import PenaltyPopup from "../components/common/PenaltyPopup.vue";
import { useSocketStore } from "../stores/socket";
import { useRoomStore, type RoomState } from "../stores/room";
import { useGameStore, type GameResult, type Penalty } from "../stores/game";

const route = useRoute();
const router = useRouter();
const socketStore = useSocketStore();
const roomStore = useRoomStore();
const gameStore = useGameStore();

const code = computed(() => route.params.code?.toString() ?? "");
const choices = ["rock", "paper", "scissors"];

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

function handlePenaltyTrigger(payload: { penalty: Penalty }) {
  gameStore.setPenalty(payload.penalty);
}

function handlePenaltyTimeout(payload: { reason?: "completed" | "timeout" }) {
  gameStore.clearPenalty(payload.reason ?? "timeout");
}

function handleRoomError(payload: { message: string }) {
  roomStore.setError(payload.message);
}

function handleRoomClosed(payload: { reason?: string }) {
  roomStore.setNotice(payload.reason === "player_timeout" ? "对手掉线超时，房间已关闭。" : "房间已关闭。返回首页。" );
  socketStore.clearRoomCode();
  router.replace("/");
}

function handleDisconnected(payload: { playerId: string }) {
  roomStore.setNotice(`玩家 ${payload.playerId.slice(0, 8)} 已断线。`);
}

function handleReconnected(payload: { playerId: string }) {
  roomStore.setNotice(`玩家 ${payload.playerId.slice(0, 8)} 已重连。`);
}

onMounted(() => {
  socketStore.connect();
  socketStore.setRoomCode(code.value);

  const socket = socketStore.socket;
  if (!socket) {
    return;
  }

  socket.on("room:state", handleRoomState);
  socket.on("room:joined", handleRoomJoined);
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
  router.replace("/");
}

const players = computed(() => roomStore.room?.players ?? []);
</script>

<template>
  <section class="layout">
    <GameBoard>
      <h2>Rock Paper Scissors</h2>
      <div class="grid">
        <PlayerInfo
          v-for="player in players"
          :key="player.id"
          :label="player.id.slice(0, 8)"
          :score="player.score"
        />
      </div>
      <div class="actions">
        <NeonButton v-for="choice in choices" :key="choice" :disabled="gameStore.penaltyActive" @click="move(choice)">
          {{ choice }}
        </NeonButton>
        <NeonButton @click="leaveRoom">Leave</NeonButton>
      </div>
      <p v-if="roomStore.notice" class="notice">{{ roomStore.notice }}</p>
      <p v-if="roomStore.error" class="error">{{ roomStore.error }}</p>
      <p v-if="gameStore.result">
        Winner: {{ gameStore.result.winner ?? "Draw" }} | Gap: {{ gameStore.result.winGap }}
      </p>
      <PenaltyPopup
        v-if="gameStore.penalty"
        :title="gameStore.penalty.name"
        :description="gameStore.penalty.description"
      />
      <NeonButton v-if="gameStore.penalty" @click="completePenalty">Complete Penalty</NeonButton>
      <p v-if="gameStore.lastPenaltyReason === 'timeout'" class="notice">Penalty timed out and round is unlocked.</p>
      <p v-if="gameStore.lastPenaltyReason === 'completed'" class="notice">Penalty completed. Next round can start.</p>
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

.notice {
  color: #ffe29a;
}

.error {
  color: #ffb5b5;
}
</style>
