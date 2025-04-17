<template>
  <div>
    <Navbar @toggled="toggleTheme" />
    <div class="device-management" :class="[theme, { 'fade-in': !initialLoading }]">
      <h2>Device Management</h2>
      
      <!-- Device Usage Summary -->
      <div v-if="loading" class="loading-container fade-in">
        <div class="loading-spinner"></div>
        <p>Loading devices...</p>
      </div>
      
      <div v-else-if="error" class="error fade-in">
        {{ error }}
      </div>
      
      <div v-else-if="activeDevices.length === 0" class="no-devices fade-in">
        <p>No devices registered. Redirecting to device registration...</p>
        <div class="loading-spinner"></div>
      </div>
      
      <div v-else class="content-container fade-in">
        <div class="usage-summary">
          <p>Device Usage: {{ activeDevices.length }} of {{ seatLimit }} seats used</p>
          <div class="progress-bar">
            <div 
              :style="{ width: `${(activeDevices.length / seatLimit) * 100}%` }"
              :class="{ 'near-limit': activeDevices.length >= seatLimit - 1 }"
            ></div>
          </div>
        </div>

        <!-- Device List -->
        <div class="device-list">
          <div v-for="device in activeDevices" 
               :key="device.id" 
               class="device-item"
               :class="{ 'fade-in': !initialLoading }">
            <div class="device-info">
              <h3>{{ device.deviceName }}</h3>
              <p>Platform: {{ device.platform }}</p>
              <p>Last Active: {{ new Date(device.lastActive).toLocaleDateString() }}</p>
            </div>
            <div class="device-actions">
              <div 
                v-if="isCurrentDevice(device.deviceId)"
                class="current-device-badge"
              >
                Current Device
              </div>
              <button 
                v-else
                @click="handleDeviceAction(device)"
                :class="['deactivate-btn', { 
                  'deactivating': device.isDeactivating
                }]"
                :disabled="device.isDeactivating || isCurrentDevice(device.deviceId)"
              >
                {{ device.isDeactivating ? 'Deactivating...' : 'Deactivate' }}
              </button>
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
const currentDeviceId = ref(getStoredDeviceId());
const initialLoading = ref(true);

const toggleTheme = (newTheme) => {
  theme.value = newTheme;
};

const fetchDevices = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    const deviceId = getStoredDeviceId();
    
    const deviceCheck = await api.get('/api/devices/check', {
      headers: {
        'X-Device-ID': deviceId
      }
    });
    
    currentDeviceId.value = deviceCheck.data.deviceId || deviceId;
    
    const response = await api.get('/api/devices', {
      headers: {
        'X-Device-ID': currentDeviceId.value
      }
    });

    if (response.data && response.data.devices) {
      activeDevices.value = response.data.devices.map(device => ({
        ...device,
        isDeactivating: false,
        deviceId: device.device_id || device.deviceId,
        isCurrentDevice: isCurrentDevice(device.device_id || device.deviceId)
      }));
      seatLimit.value = response.data.seatLimit;
    }
  } catch (err) {
    console.error('Error fetching devices:', err);
    error.value = err.response?.data?.error || 'Failed to load devices';
    activeDevices.value = [];
  } finally {
    loading.value = false;
    // Add small delay before removing initial loading state
    setTimeout(() => {
      initialLoading.value = false;
    }, 100);
  }
};

const handleDeviceAction = (device) => {
  // Don't even try to deactivate if it's the current device
  if (isCurrentDevice(device.deviceId)) {
    return;
  }
  deactivateDevice(device.id);
};

const deactivateDevice = async (deviceId) => {
  const device = activeDevices.value.find(d => d.id === deviceId);
  if (!device) return;

  // Double-check to prevent deactivating current device
  if (isCurrentDevice(device.deviceId)) {
    toast.error('Cannot deactivate current device');
    return;
  }
  
  try {
    device.isDeactivating = true;
    
    const response = await api.post('/api/devices/deactivate', {
      id: device.id,
      deviceId: device.deviceId
    }, {
      headers: {
        'X-Device-ID': currentDeviceId.value,
        'Authorization': `Bearer ${localStorage.getItem('token')}` // Ensure token is sent
      }
    });
    
    if (response.data.success) {
      toast.success('Device deactivated successfully');
      activeDevices.value = activeDevices.value.filter(d => d.id !== deviceId);
    }
  } catch (err) {
    console.error('Error deactivating device:', err);
    device.isDeactivating = false;
    
    const errorMessage = err.response?.data?.error || 'Failed to deactivate device';
    
    if (err.response?.status === 403) {
      toast.error('Cannot deactivate current device');
    } else if (err.response?.status === 404) {
      toast.error('Device not found');
      activeDevices.value = activeDevices.value.filter(d => d.id !== deviceId);
    } else if (err.response?.status === 401) {
      toast.error('Session expired. Please sign in again.');
      router.push('/sign-in');
    } else {
      toast.error(errorMessage);
    }
  }
};

const isCurrentDevice = (deviceId) => {
  if (!deviceId || !currentDeviceId.value) return false;
  const normalizedCurrentDevice = currentDeviceId.value.toLowerCase().trim();
  const normalizedDeviceId = deviceId.toLowerCase().trim();
  const result = normalizedCurrentDevice === normalizedDeviceId;
  console.log('Device comparison:', {
    current: normalizedCurrentDevice,
    device: normalizedDeviceId,
    isMatch: result
  });
  return result;
};

onMounted(() => {
  fetchDevices();
  // Shorter delay for more immediate response
  setTimeout(() => {
    initialLoading.value = false;
  }, 50);
});

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
  opacity: 0;
}

.fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
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
  background-color: #4CAF50;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  min-width: 120px;
  text-align: center;
}

.device-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 120px;
}

.deactivate-btn {
  background-color: #ff4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.deactivate-btn:hover {
  background-color: #cc0000;
}

.deactivate-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.deactivating {
  opacity: 0.7;
  cursor: not-allowed;
}

.deactivate-btn.current-device {
  background-color: #28a745;
  cursor: default;
}

.deactivate-btn.current-device:hover {
  background-color: #28a745;
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
