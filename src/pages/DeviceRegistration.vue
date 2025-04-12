<template>
  <div class="device-registration" :class="theme">
    <h2>Device Registration</h2>
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
        <span>Platform detected: {{ platform }}</span>
      </div>

      <div class="actions">
        <InvertedButton 
          type="submit"
          :loading="isLoading"
        >
          Register Device
        </InvertedButton>
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import InvertedButton from '@/comps/InvertedButton.vue';
import api from '@/api';
import { useRouter } from 'vue-router';
import { generateDeviceId, storeDeviceId, getStoredDeviceId } from '@/utils/device';

const props = defineProps({
  theme: {
    type: String,
    default: 'light'
  }
});

const emit = defineEmits(['registered']);

const deviceName = ref('');
const platform = ref(navigator.platform.includes('Win') ? 'windows' : 
                    navigator.platform.includes('Mac') ? 'macos' : 'linux');
const isLoading = ref(false);
const errorMessage = ref('');

const router = useRouter();

const registerDevice = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    const deviceId = getStoredDeviceId() || generateDeviceId();

    const response = await api.post('/api/devices/register', {
      deviceId,
      deviceName: deviceName.value,
      platform: platform.value
    });

    if (response.data.success) {
      storeDeviceId(deviceId);
      emit('registered', response.data.details);
      router.push('/app-list');
    }
  } catch (error) {
    console.error('Device registration error:', error);
    if (error.response?.status === 429) {
      errorMessage.value = 'Device limit reached. Please deactivate an existing device first.';
    } else if (error.response?.status === 401) {
      localStorage.removeItem('token');
      router.push('/sign-in');
    } else {
      errorMessage.value = error.response?.data?.error || 'Failed to register device';
    }
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  const deviceId = getStoredDeviceId() || generateDeviceId();
  console.log('DeviceRegistration mounted, deviceId:', deviceId);
  
  try {
    const devicesResponse = await api.get('/api/devices');
    
    if (devicesResponse.data.devices.length > 0) {
      const { data } = await api.get('/api/devices/check', {
        headers: {
          'X-Device-ID': deviceId
        }
      });
      
      console.log('Device check response:', data);
      
      if (data.registered) {
        storeDeviceId(data.deviceId);
        console.log('Device already registered, redirecting to app list');
        router.push('/app-list');
        return;
      }
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
.device-registration {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.platform-info {
  margin: 10px 0;
}

.error-message {
  color: red;
  margin-top: 10px;
}
</style>
