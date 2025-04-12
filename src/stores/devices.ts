import { defineStore } from 'pinia';
import api from '@/api';

interface Device {
  id: string;
  device_name: string;
  platform: string;
  last_active: string;
}

interface DeviceState {
  devices: Device[];
  loading: boolean;
  error: string | null;
}

export const useDeviceStore = defineStore('devices', {
  state: (): DeviceState => ({
    devices: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchDevices() {
      this.loading = true;
      try {
        const response = await api.get('/api/devices');
        this.devices = response.data;
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Failed to fetch devices';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deactivateDevice(deviceId: string) {
      try {
        await api.post('/api/devices/deactivate', { deviceId });
        this.devices = this.devices.filter(device => device.id !== deviceId);
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Failed to deactivate device';
        throw error;
      }
    }
  }
});
