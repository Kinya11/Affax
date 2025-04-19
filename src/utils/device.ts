import api from '@/api';

export const generateDeviceId = (): string => {
  const hardwareFingerprint = [
    navigator.userAgent,
    navigator.platform,
    navigator.hardwareConcurrency,
    screen.width + 'x' + screen.height,
    navigator.language,
    // CPU class, GPU info, etc. could be added here
  ].filter(Boolean).join('|');

  // Create consistent hash that will always be the same for this device
  const hash = btoa(hardwareFingerprint).replace(/[/+=]/g, '').substring(0, 32);
  return `dev_${hash}`;
};

export const generateSimpleDeviceId = (): string => {
  // Fix the UUID generation expression
  return 'dev_' + '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: string) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4)).toString(16)
  ).substring(0, 8);
};

export const storeDeviceId = (deviceId: string): void => {
  // Only store if different from existing
  const existing = getStoredDeviceId();
  if (existing && existing === deviceId) {
    return;
  }

  try {
    localStorage.setItem('deviceId', deviceId);
    if (window.sessionStorage) {
      sessionStorage.setItem('currentDeviceId', deviceId);
    }
  } catch (e) {
    console.error('Failed to store device ID:', e);
  }
};

export const getStoredDeviceId = (): string | null => {
  return localStorage.getItem('deviceId');
};

interface Device {
  device_id: string;
  is_active: boolean;
}

interface DeviceResponse {
  devices: Device[];
}

export const restoreDeviceId = async (): Promise<string | null> => {
  try {
    const response = await api.get<DeviceResponse>('/api/devices');
    if (response.data.devices && response.data.devices.length > 0) {
      const currentDevice = response.data.devices.find((device: Device) => device.is_active);
      if (currentDevice) {
        localStorage.setItem('deviceId', currentDevice.device_id);
        return currentDevice.device_id;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};
