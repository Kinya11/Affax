<template>
  <div v-if="visible" class="modal-overlay" @click="close">
    <div class="modal">
      <p>{{ message }}</p>
      <div class="buttons">
        <button @click="confirmAction" class="confirm-button">Yes</button>
        <button @click="close" class="cancel-button">No</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// Emit event to notify parent of confirmation
const emit = defineEmits(['confirmed', 'closed']);

const visible = ref(false);
const message = ref("");

// This will be called to show the modal
const openModal = ({ message: msg }) => {
  message.value = msg;
  visible.value = true;
};

const confirmAction = () => {
  emit('confirmed');  // Emit event for confirmation
  close();
};

const close = () => {
  visible.value = false;
  emit('closed');  // Emit event when modal is closed
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

.modal {
  background: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.buttons {
  display: flex;
  justify-content: space-around;
}

.confirm-button,
.cancel-button {
  padding: 10px;
  border-radius: 5px;
  border: none;
  font-size: 16px;
}

.confirm-button {
  background-color: #4caf50;
  color: white;
}

.cancel-button {
  background-color: #f44336;
  color: white;
}

.confirm-button:hover,
.cancel-button:hover {
  opacity: 0.8;
}
</style>
