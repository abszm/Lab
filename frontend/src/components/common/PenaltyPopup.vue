<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>

<template>
  <div class="penalty">
    <p class="eyebrow">
      Penalty Triggered
    </p>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
  </div>
</template>

<style scoped>
.penalty {
  margin-top: 1rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(255, 205, 96, 0.8);
  background: rgba(32, 17, 13, 0.75);
  padding: 0.85rem;
}

.eyebrow {
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: #ffc86e;
}

h3 {
  margin: 0.2rem 0;
}
</style>
