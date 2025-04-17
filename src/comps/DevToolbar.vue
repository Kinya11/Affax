<template>
  <div v-if="isDev" class="dev-toolbar">
    <select v-model="subscriptionMode" @change="updateMode">
      <option value="pro">Pro Plan</option>
      <option value="free">Free Plan</option>
    </select>
    <span>Dev Mode: {{ subscriptionMode }}</span>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const isDev = import.meta.env.MODE === 'development';
const subscriptionMode = ref('pro');

const updateMode = () => {
  localStorage.setItem('devSubscriptionMode', subscriptionMode.value);
  // Reload the page to apply changes
  window.location.reload();
};

onMounted(() => {
  const savedMode = localStorage.getItem('devSubscriptionMode');
  if (savedMode) {
    subscriptionMode.value = savedMode;
  }
});
</script>

<style scoped>
.dev-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #333;
  color: white;
  padding: 8px;
  display: flex;
  gap: 12px;
  align-items: center;
  z-index: 9999;
}

select {
  padding: 4px 8px;
  border-radius: 4px;
}
</style>