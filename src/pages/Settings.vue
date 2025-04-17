<!--
Go to http://localhost:5173/settings to view this page
-->
<script setup>
import { ref } from 'vue';
import Navbar from '@/comps/Navbar/Navbar.vue';

const theme = ref('light');

function toggleTheme(newTheme) {
  theme.value = newTheme;
}
</script>
<template>
  <div class="settings-container"> <!-- Single root element -->
    <Navbar @toggled="toggleTheme" />
    <div class="settings-content">
      <h2 class="container-header">Settings</h2>
    </div>
  </div>
</template>
<script>
export default {
  name: "Settings",
};
</script>
<style scoped>
.settings-container {
  min-height: 100vh;
  opacity: 0;
  animation: fadeIn 0.2s ease-out forwards;
}

.settings-content {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
