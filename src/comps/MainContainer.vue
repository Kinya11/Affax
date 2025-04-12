<script setup>
defineProps({
  theme: {
    type: String,
    default: "light"
  }
});
</script>

<template>
  <div :class="['main-container', theme]">
    <slot></slot>
  </div>
</template>

<style scoped>
.main-container {
  border: 1px solid;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  backdrop-filter: blur(5px);
}

.main-container.light {
  background-color: #f5f5f5;
  border-color: #ddd;
}

.main-container.dark {
  background-color: #2d2d2d;
  border-color: #444;
}
</style>