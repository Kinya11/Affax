<script setup>
import BlueGrayButton from "../BlueGrayButton.vue";
import RedButton from "../RedButton.vue";
import { ref } from "vue";

const props = defineProps({
  theme: {
    type: String,
    default: "light",
  },
  isInstalling: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['confirm', 'cancel']);

const isModalVisible = ref(false);

function openModal() {
  isModalVisible.value = true;
}

function closeModal() {
  isModalVisible.value = false;
}

function cancelDelete() {
  emit('cancel');
  closeModal();
}

function confirmDelete() {
  emit('confirm');
  closeModal();
}

defineExpose({
  openModal,
  closeModal
});
</script>

<template>
  <div v-if="isModalVisible" class="modal-overlay" @click="cancelDelete">
    <div :class="['modal-content', theme]" @click.stop>
      <h3>Are you sure you want to delete this list?</h3>
      <div class="modal-buttons">
        <RedButton 
          :theme="theme" 
          @click="confirmDelete"
          :disabled="isInstalling"
          :class="{ 'disabled': isInstalling }"
        >
          Yes, delete
        </RedButton>
        <BlueGrayButton :theme="theme" @click="cancelDelete">
          No, keep this list
        </BlueGrayButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeInOverlay {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOutOverlay {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes appear {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes expand {
  from { transform: scale(0.9); }
  to { transform: scale(1); }
}

@keyframes retract {
  from { transform: scale(1); }
  to { transform: scale(0.95); }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000001;
  animation: fadeInOverlay 0.3s ease;
}

.modal-overlay.fade-out {
  animation: fadeOutOverlay 0.3s ease forwards;
}

.modal-content {
  padding: 2rem;
  border-radius: 8px;
  text-align: center;
  max-width: 400px;
  width: 90%;
  animation: expand 0.3s ease;
}

.modal-content.fade-out {
  animation: retract 0.3s ease forwards;
}

.modal-content.dark {
  background-color: var(--second-layer-dark);
  color: var(--text-color-dark);
}

.modal-content.light {
  background-color: var(--second-layer-light);
  color: var(--text-color-light);
}

.modal-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
}

h3 {
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed !important;
  pointer-events: none;
}
</style>
