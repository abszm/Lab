<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import GlassCard from "../components/common/GlassCard.vue";
import NeonButton from "../components/common/NeonButton.vue";
import { useSocketStore } from "../stores/socket";
import { useRoomStore, type RoomState } from "../stores/room";

const router = useRouter();
const socketStore = useSocketStore();
const roomStore = useRoomStore();

const roomCode = ref("");

const ERROR_COPY: Record<string, string> = {
  ROOM_NOT_FOUND: "房间不存在，请确认房间码。",
  ROOM_FULL: "房间已满，请让其中一位玩家离开后重试。",
  PLAYER_ALREADY_IN_ROOM: "你已经在这个房间中了。",
  ALREADY_IN_GAME: "你已经在其它房间中，请先离开当前房间。"
};

function normalizeError(message: string): string {
  return ERROR_COPY[message] ?? message;
}

function handleCreated(payload: { code: string }) {
  socketStore.setRoomCode(payload.code);
  roomStore.clearError();
  router.push(`/room/${payload.code}`);
}

function handleJoined(payload: { room: { code: string } }) {
  socketStore.setRoomCode(payload.room.code);
  roomStore.clearError();
  router.push(`/room/${payload.room.code}`);
}

function handleRoomState(payload: { room: RoomState | null }) {
  roomStore.setRoom(payload.room);
}

function handleRoomError(payload: { message: string }) {
  roomStore.setError(normalizeError(payload.message));
}

onMounted(() => {
  socketStore.connect();
  roomStore.clearNotice();
  const socket = socketStore.socket;
  if (!socket) {
    return;
  }

  socket.on("room:created", handleCreated);
  socket.on("room:joined", handleJoined);
  socket.on("room:state", handleRoomState);
  socket.on("room:error", handleRoomError);
});

onUnmounted(() => {
  const socket = socketStore.socket;
  if (!socket) {
    return;
  }

  socket.off("room:created", handleCreated);
  socket.off("room:joined", handleJoined);
  socket.off("room:state", handleRoomState);
  socket.off("room:error", handleRoomError);
});

function createRoom() {
  socketStore.socket?.emit("room:create", { gameId: "rock-paper-scissors" });
}

function joinRoom() {
  socketStore.socket?.emit("room:join", { code: roomCode.value.trim().toUpperCase() });
}
</script>

<template>
  <GlassCard>
    <h1 class="title">
      Project Heartbeat
    </h1>
    <p class="subtitle">
      Create a duel room or join with a 6-char code.
    </p>
    <p
      class="status"
      :class="{ online: socketStore.connected }"
    >
      {{ socketStore.connected ? "实时连接已建立" : "连接中断，正在尝试重连" }}
    </p>
    <div class="actions">
      <NeonButton @click="createRoom">
        Create Room
      </NeonButton>
      <input
        v-model="roomCode"
        maxlength="6"
        placeholder="ABC123"
      >
      <NeonButton
        :disabled="roomCode.length < 6"
        @click="joinRoom"
      >
        Join Room
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
  </GlassCard>
</template>

<style scoped>
.title {
  margin: 0;
  font-size: 2rem;
}

.subtitle {
  margin: 0.4rem 0 1rem;
  opacity: 0.85;
}

.status {
  margin: 0 0 0.9rem;
  font-size: 0.9rem;
  opacity: 0.8;
}

.online {
  color: #b8ffd7;
}

.actions {
  display: grid;
  gap: 0.8rem;
}

input {
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  padding: 0.65rem 0.8rem;
}

.error {
  color: #ffb5b5;
}

.notice {
  color: #ffe29a;
}
</style>
