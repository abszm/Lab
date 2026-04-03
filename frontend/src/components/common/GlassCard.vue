<template>
  <section class="glass-card">
    <slot />
  </section>
</template>

<style scoped>
.glass-card {
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.06));
  backdrop-filter: blur(14px);
  border-radius: 1rem;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.3);
  padding: 1.25rem;
}
</style>
