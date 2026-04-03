<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import GlassCard from "../components/common/GlassCard.vue";
import NeonButton from "../components/common/NeonButton.vue";
import { useSocketStore } from "../stores/socket";
import { useRoomStore, type RoomState } from "../stores/room";

const route = useRoute();
const router = useRouter();
const socketStore = useSocketStore();
const roomStore = useRoomStore();

const code = computed(() => route.params.code?.toString() ?? "");

function handleRoomState(payload: { room: RoomState | null }) {
  roomStore.setRoom(payload.room);
}

function handleRoomClosed(payload: { reason?: string }) {
  roomStore.setNotice(payload.reason === "player_timeout" ? "对手超时未重连，房间已关闭。" : "房间已关闭。返回首页重新开始。");
  socketStore.clearRoomCode();
  router.replace("/");
}

function handleDisconnected(payload: { playerId: string }) {
  roomStore.setNotice(`玩家 ${payload.playerId.slice(0, 8)} 已断线，等待重连中。`);
}

function handleReconnected(payload: { playerId: string }) {
  roomStore.setNotice(`玩家 ${payload.playerId.slice(0, 8)} 已重连。`);
}

function handleRoomError(payload: { message: string }) {
  roomStore.setError(payload.message);
}

onMounted(() => {
  socketStore.connect();

  const socket = socketStore.socket;
  if (!socket) {
    return;
  }

  socket.on("room:state", handleRoomState);
  socket.on("room:closed", handleRoomClosed);
  socket.on("player:disconnected", handleDisconnected);
  socket.on("player:reconnected", handleReconnected);
  socket.on("room:error", handleRoomError);

  socket.emit("room:join", { code: code.value });
});

onUnmounted(() => {
  const socket = socketStore.socket;
  if (!socket) {
    return;
  }

  socket.off("room:state", handleRoomState);
  socket.off("room:closed", handleRoomClosed);
  socket.off("player:disconnected", handleDisconnected);
  socket.off("player:reconnected", handleReconnected);
  socket.off("room:error", handleRoomError);
});

const canStart = computed(() => {
  const players = roomStore.room?.players ?? [];
  return players.length === 2 && players.every((player) => player.isConnected !== false);
});

function startGame() {
  router.push(`/game/${code.value}`);
}

function leaveRoom() {
  socketStore.socket?.emit("room:leave");
  socketStore.clearRoomCode();
  roomStore.setRoom(null);
  router.replace("/");
}
</script>

<template>
  <GlassCard>
    <h2>Room {{ code }}</h2>
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
    <p v-if="!roomStore.room">
      Waiting for room state...
    </p>
    <ul v-else>
      <li
        v-for="player in roomStore.room.players"
        :key="player.id"
      >
        {{ player.id.slice(0, 8) }} · score {{ player.score }} · {{ player.isConnected ? "online" : "offline" }}
      </li>
    </ul>
    <div class="actions">
      <NeonButton
        :disabled="!canStart"
        @click="startGame"
      >
        Enter Game
      </NeonButton>
      <NeonButton @click="leaveRoom">
        Leave
      </NeonButton>
    </div>
  </GlassCard>
</template>

<style scoped>
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
