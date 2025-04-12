<template>
  <div>
    <Navbar @toggled="toggleTheme" />
    <div class="device-management" :class="theme">
      <h2>Device Management</h2>
      
      <!-- Device Usage Summary -->
      <div v-if="loading" class="loading">
        Loading devices...
      </div>
      
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      
      <div v-else-if="activeDevices.length === 0" class="no-devices">
        <p>No devices registered. Redirecting to device registration...</p>
        <div class="loading-spinner"></div>
      </div>
      
      <div v-else>
        <div class="usage-summary">
          <p>Device Usage: {{ activeDevices.length }} of {{ seatLimit }} seats used</p>
          <div class="progress-bar">
            <div 
              :style="{ width: `${(activeDevices.length / seatLimit) * 100}%` }"
              :class="{ 'near-limit': activeDevices.length >= seatLimit - 1 }"
            ></div>
          </div>
        </div>

        <!-- Active Devices List -->
        <div class="devices-list">
          <h3>Active Devices</h3>
          <div v-if="activeDevices.length === 0" class="no-devices">
            No active devices found
          </div>
          <div v-else>
            <div v-for="device in activeDevices" :key="device.id" class="device-item">
              <div class="device-info">
                <div class="device-header">
                  <span class="device-name">{{ device.deviceName || 'Unnamed Device' }}</span>
                  <span v-if="isCurrentDevice(device.deviceId)" class="current-device-badge">Current Device</span>
                </div>
                <div class="device-details">
                  <span class="device-platform">
                    <i :class="getPlatformIcon(device.platform)"></i>
                    {{ formatPlatform(device.platform) }}
                  </span>
                  <span class="last-active">Last active: {{ formatDate(device.lastActive) }}</span>
                </div>
              </div>
              <button 
                v-if="!isCurrentDevice(device.deviceId)"
                @click="deactivateDevice(device.id)"
                :disabled="device.isDeactivating"
                :class="['deactivate-btn', { 'deactivating': device.isDeactivating }]"
              >
                {{ device.isDeactivating ? 'Deactivating...' : 'Deactivate' }}
              </button>
              <span 
                v-else 
                class="current-device-label"
              >
                Current Device
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useRouter } from 'vue-router';
import Navbar from '@/comps/Navbar/Navbar.vue';
import api from '@/api';
import { getStoredDeviceId } from '@/utils/device';

const router = useRouter();
const toast = useToast();
const activeDevices = ref([]);
const seatLimit = ref(3);
const loading = ref(true);
const error = ref(null);
const theme = ref('light');
const currentDeviceId = getStoredDeviceId();

const toggleTheme = (newTheme) => {
  theme.value = newTheme;
};

const fetchDevices = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    console.log('Fetching devices...');
    const response = await api.get('/api/devices');
    console.log('Device response:', response.data);
    
    if (response.data && response.data.devices) {
      activeDevices.value = response.data.devices.map(device => ({
        ...device,
        isDeactivating: false
      }));
      seatLimit.value = response.data.seatLimit;

      // Only redirect if there are no devices AND we're not already on the registration page
      if (activeDevices.value.length === 0 && router.currentRoute.value.path !== '/device-register') {
        console.log('No devices registered, redirecting to device registration');
        localStorage.removeItem('deviceId'); // Clear any existing deviceId
        router.push('/device-register');
        return;
      }
    } else {
      throw new Error('Invalid response format');
    }
  } catch (err) {
    console.error('Error fetching devices:', err);
    error.value = 'Failed to load devices. Please try again later.';
    toast.error('Error loading devices');
    activeDevices.value = [];
    
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      router.push('/sign-in');
    }
  } finally {
    loading.value = false;
  }
};

const deactivateDevice = async (deviceId) => {
  try {
    const deviceIndex = activeDevices.value.findIndex(d => d.id === deviceId);
    if (deviceIndex === -1) {
      toast.error("Device not found");
      return;
    }

    const device = activeDevices.value[deviceIndex];
    const currentDeviceId = localStorage.getItem('deviceId');
    
    // Prevent deactivating current device
    if (device.deviceId === currentDeviceId) {
      toast.error("Cannot deactivate your current device");
      return;
    }

    device.isDeactivating = true;

    const response = await api.post('/api/devices/deactivate', {
      id: deviceId
    }, {
      headers: {
        'X-Device-ID': currentDeviceId
      }
    });
    
    if (response.data.success) {
      toast.success('Device deactivated successfully');
      activeDevices.value = activeDevices.value.filter(d => d.id !== deviceId);
    } else {
      throw new Error(response.data.error || 'Failed to deactivate device');
    }
  } catch (err) {
    console.error('Error deactivating device:', err);
    
    const deviceIndex = activeDevices.value.findIndex(d => d.id === deviceId);
    if (deviceIndex !== -1) {
      activeDevices.value[deviceIndex].isDeactivating = false;
    }
    
    if (err.response?.data?.code === 'CURRENT_DEVICE') {
      toast.error("Cannot deactivate your current device");
    } else {
      toast.error(err.response?.data?.error || 'Failed to deactivate device');
    }
  }
};

const isCurrentDevice = (deviceId) => {
  return deviceId === currentDeviceId;
};

const formatDate = (date) => {
  return new Date(date).toLocaleString();
};

const getPlatformIcon = (platform) => {
  const icons = {
    'windows': 'fas fa-windows',
    'macos': 'fab fa-apple',
    'linux': 'fab fa-linux',
    'web': 'fas fa-globe'
  };
  return icons[platform.toLowerCase()] || 'fas fa-desktop';
};

const formatPlatform = (platform) => {
  const platforms = {
    'windows': 'Windows',
    'macos': 'MacOS',
    'linux': 'Linux',
    'web': 'Web Browser'
  };
  return platforms[platform.toLowerCase()] || platform;
};

onMounted(fetchDevices);
</script>

<style scoped>
.device-management {
  padding: 20px;
  max-width: 800px;
  margin: 70px auto 0;
}

.device-management.dark {
  color: var(--text-dark);
  background-color: var(--second-layer-dark);
}

.device-management.light {
  color: var(--text-light);
  background-color: var(--first-layer-light);
}

.loading, .error {
  text-align: center;
  padding: 20px;
  margin: 20px 0;
}

.error {
  color: #dc3545;
}

.usage-summary {
  margin: 20px 0;
}

.progress-bar {
  height: 10px;
  background-color: #e9ecef;
  border-radius: 5px;
  overflow: hidden;
}

.progress-bar > div {
  height: 100%;
  background-color: #28a745;
  transition: width 0.3s ease;
}

.progress-bar > div.near-limit {
  background-color: #ffc107;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #dee2e6;
  margin: 10px 0;
  border-radius: 8px;
}

.device-item.dark {
  background-color: var(--third-layer-dark);
  border: 1px solid var(--border-dark);
}

.device-item.light {
  background-color: white;
  border: 1px solid var(--border-light);
}

.device-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.device-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
}

.device-name {
  font-weight: bold;
  font-size: 1.1em;
}

.device-details {
  display: flex;
  gap: 20px;
  color: #666;
  font-size: 0.9em;
}

.device-platform {
  display: flex;
  align-items: center;
  gap: 5px;
}

.last-active {
  font-size: 0.9em;
  color: #6c757d;
}

.current-device-badge {
  background-color: #28a745;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
}

.current-device-label {
  padding: 8px 16px;
  background-color: #28a745;
  color: white;
  border-radius: 4px;
  font-size: 0.9em;
}

.deactivate-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: #dc3545;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.deactivate-btn:hover:not(:disabled) {
  background-color: #c82333;
}

.deactivate-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.7;
}

.deactivate-btn.deactivating {
  background-color: #6c757d;
  cursor: not-allowed;
}

.no-devices {
  text-align: center;
  padding: 2rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin: 1rem 0;
}

.loading-spinner {
  margin: 1rem auto;
  width: 2rem;
  height: 2rem;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.dark .no-devices {
  background-color: var(--third-layer-dark);
  color: var(--text-dark);
}

@media (max-width: 768px) {
  .device-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .device-item {
    flex-direction: column;
    gap: 10px;
  }
  
  .deactivate-btn {
    width: 100%;
  }
}
</style>
