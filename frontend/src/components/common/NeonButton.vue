<script setup lang="ts">
defineProps<{ disabled?: boolean }>();
</script>

<template>
  <button
    class="neon"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.neon {
  border: 0;
  border-radius: 0.8rem;
  background: linear-gradient(120deg, #ff7a59, #ffd166);
  color: #1f1118;
  padding: 0.7rem 1.1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 0 rgba(255, 122, 89, 0.4);
  animation: pulse 2s infinite;
}

.neon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 122, 89, 0.45);
  }
  70% {
    box-shadow: 0 0 0 14px rgba(255, 122, 89, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 122, 89, 0);
  }
}
</style>
