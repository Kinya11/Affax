<template>
  <div class="device-registration-modal" :class="theme">
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>Register Your Device</h2>
        <form @submit.prevent="registerDevice">
          <div class="form-group">
            <label for="deviceName">Device Name</label>
            <input 
              id="deviceName"
              v-model="deviceName"
              type="text"
              placeholder="Enter device name"
              required
            />
          </div>
          
          <div class="platform-info">
            <span>Platform detected: {{ platformDisplay }}</span>
          </div>

          <div class="actions">
            <InvertedButton 
              type="submit"
              :loading="isLoading"
              class="register-button"
            >
              Register Device
            </InvertedButton>
          </div>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import InvertedButton from '@/comps/InvertedButton.vue';
import api from '@/api';
import { useRouter } from 'vue-router';
import { getStoredDeviceId, storeDeviceId, generateSimpleDeviceId } from '@/utils/device';

const props = defineProps({
  theme: {
    type: String,
    default: 'light'
  }
});

const emit = defineEmits(['registered']);
const router = useRouter();

const deviceName = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const platformDisplay = ref(navigator.platform || 'Unknown Device');

const registerDevice = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    
    let deviceId = await getStoredDeviceId();
    if (!deviceId) {
      deviceId = generateSimpleDeviceId();
      await storeDeviceId(deviceId);
    }

    const response = await api.post('/api/devices/register', {
      deviceId,
      deviceName: deviceName.value || `${platformDisplay.value} Device`,
      platform: platformDisplay.value
    });

    if (response.data.success) {
      if (response.data.details?.deviceId) {
        await storeDeviceId(response.data.details.deviceId);
      }
      emit('registered', response.data.details);
    }
  } catch (error) {
    console.error('Device registration error:', error);
    if (error.response?.status === 429) {
      errorMessage.value = 'Device limit reached. Please deactivate an existing device first.';
    } else if (error.response?.status === 401) {
      localStorage.removeItem('token');
      router.push('/sign-in');
    } else {
      errorMessage.value = error.response?.data?.error || 'Failed to register device. Please try again.';
    }
    // Re-throw the error to be handled by the parent component
    throw error;
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  const deviceId = await getStoredDeviceId();
  console.log('DeviceRegistration mounted, deviceId:', deviceId);
  
  if (!deviceId) {
    return; // Allow registration if no device ID
  }
  
  try {
    const { data } = await api.get('/api/devices/check', {
      headers: {
        'X-Device-ID': deviceId
      }
    });
    
    console.log('Device check response:', data);
    
    if (data.registered && data.existingDevice) {
      router.push('/app-list');
    }
  } catch (error) {
    console.error('Device check failed:', error);
    if (error.response?.status === 401) {
      router.push('/sign-in');
    }
  }
});
</script>

<style scoped>
.device-registration-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

h2 {
  margin: 0 0 1.5rem;
  text-align: center;
  color: #333;
  font-size: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #666;
  font-size: 0.9rem;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
}

.platform-info {
  margin: 1rem 0;
  padding: 0.75rem;
  background: #f5f7fa;
  border-radius: 8px;
  color: #666;
  font-size: 0.9rem;
}

.actions {
  margin-top: 1.5rem;
  text-align: center;
}

.register-button {
  width: 100%;
  height: 40px;
}

.error-message {
  margin-top: 1rem;
  color: #dc3545;
  text-align: center;
  font-size: 0.9rem;
}

/* Dark theme support */
.dark .modal-content {
  background: #1a1a1a;
  border-color: rgba(255, 255, 255, 0.1);
}

.dark h2 {
  color: #fff;
}

.dark label {
  color: #ccc;
}

.dark input {
  background: #2a2a2a;
  border-color: #333;
  color: #fff;
}

.dark .platform-info {
  background: #2a2a2a;
  color: #ccc;
}
</style>
