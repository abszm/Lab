<script setup lang="ts">
defineProps<{
  label: string;
  score: number;
}>();
</script>

<template>
  <article class="player">
    <strong>{{ label }}</strong>
    <span>Score: {{ score }}</span>
  </article>
</template>

<style scoped>
.player {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
}
</style>
