<template>
  <div class="board">
    <slot />
  </div>
</template>

<style scoped>
.board {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  padding: 1rem;
  background: rgba(16, 12, 34, 0.35);
}
</style>
