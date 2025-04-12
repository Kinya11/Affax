<template>
    <div v-if="isVisible" class="modal-overlay" @click.self="close">
      <div class="modal-content">
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        <button @click="close">Close</button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from "vue";
  
  const props = defineProps(["title", "message"]);
  const emits = defineEmits(["close"]);
  
  const isVisible = ref(true);
  
  const close = () => {
    isVisible.value = false;
    emits("close");
  };
  </script>
  
  <style scoped>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .modal-content {
    background: white;
    padding: 20px;
    border-radius: 5px;
    text-align: center;
  }
  </style>
  