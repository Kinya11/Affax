<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="cancel">
    <div class="sudo-modal-content" :class="theme">
      <h3>Administrator Permission Required</h3>
      <p>Installing apps requires administrator privileges. Please enter your computer's password:</p>
      
      <div class="password-input-container">
        <input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Enter your password"
          @keyup.enter="confirmPassword"
          ref="passwordInput"
        />
        <button 
          class="toggle-visibility" 
          @click="showPassword = !showPassword"
          type="button"
          :aria-label="showPassword ? 'Hide password' : 'Show password'"
        >
          {{ showPassword ? '👁️' : '👁️‍🗨️' }}
        </button>
      </div>

      <div class="error-message" v-if="error">
        {{ error }}
      </div>

      <div class="modal-actions">
        <BlueGrayButton @click="cancel" :theme="theme">
          Cancel
        </BlueGrayButton>
        <InvertedButton 
          @click="confirmPassword"
          :disabled="!password || isLoading"
          :theme="theme"
        >
          {{ isLoading ? 'Verifying...' : 'Confirm' }}
        </InvertedButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import BlueGrayButton from '../BlueGrayButton.vue';
import InvertedButton from '../InvertedButton.vue';
import { useToast } from 'vue-toastification';

const toast = useToast();
const props = defineProps({
  theme: {
    type: String,
    default: 'light'
  }
});

const emit = defineEmits(['confirm', 'cancel']);
const isVisible = ref(false);
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const isLoading = ref(false);
const passwordInput = ref(null);

const openModal = () => {
  isVisible.value = true;
  password.value = '';
  error.value = '';
  showPassword.value = false;
  setTimeout(() => {
    passwordInput.value?.focus();
  }, 100);
};

const closeModal = () => {
  isVisible.value = false;
  password.value = '';
  error.value = '';
};

const confirmPassword = async () => {
  if (!password.value) {
    error.value = 'Password is required';
    toast.error('Password is required');
    return;
  }

  isLoading.value = true;
  try {
    emit('confirm', password.value);
    closeModal();
  } catch (err) {
    const errorMessage = err?.response?.data?.message || err?.message || 'Unknown error';
    const isPasswordError = 
      err?.response?.status === 403 || 
      errorMessage.toLowerCase().includes('password');

    if (isPasswordError) {
      error.value = 'Incorrect Password';
      toast.error('Incorrect Password');
    } else {
      error.value = 'Failed to validate password';
      toast.error('Failed to validate password');
    }
  } finally {
    isLoading.value = false;
  }
};

const cancel = () => {
  emit('cancel');
  closeModal();
};

defineExpose({
  openModal,
  closeModal,
  isVisible
});

watch(isVisible, (newValue) => {
  if (newValue) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100000; /* Increased z-index to be higher than navbar's 10000 */
}

.sudo-modal-content {
  background: rgba(255, 255, 255, 0.806);
  border-radius: 16px;
  padding: 2rem;
  width: 80%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  animation: modalEnter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sudo-modal-content.dark {
  background: rgba(30, 30, 30, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

@keyframes modalEnter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

h3 {
  color: var(--text-primary-light);
  margin-bottom: 1rem;
  font-size: 1.25rem;
  font-weight: 600;
}

.dark h3 {
  color: var(--text-primary-dark);
}

p {
  color: var(--text-secondary-light);
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.dark p {
  color: var(--text-secondary-dark);
}

.password-input-container {
  position: relative;
  margin-bottom: 1.5rem;
  margin-right: 30px;
}

input {
  width: 100%;
  padding: 0.875rem;
  background: rgba(255, 255, 255, 0.736);
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
  color: var(--text-primary-light);
}

.dark input {
  background: rgba(0, 0, 0, 0.2);
  border-color: var(--border-color-dark);
  color: var(--text-primary-dark);
}

input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
}

.toggle-visibility {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  margin-right: -30px;
}

.toggle-visibility:hover {
  opacity: 1;
}

.error-message {
  color: var(--error);
  font-size: 0.875rem;
  margin-top: -0.5rem;
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
