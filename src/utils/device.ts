import api from '@/api';

export const generateDeviceId = async (): Promise<string> => {
  const components = [
    navigator.userAgent,
    navigator.platform,
    screen.width + 'x' + screen.height,
    crypto.getRandomValues(new Uint8Array(8)).join(''),
    Date.now().toString(36)
  ];
  
  // Create a hash of the components
  const hashBuffer = new TextEncoder().encode(components.join('|'));
  const hash = await crypto.subtle.digest('SHA-256', hashBuffer);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `dev_${hashHex.substring(0, 8)}`;
};

export const generateSimpleDeviceId = (): string => {
  // Fix the UUID generation expression
  return 'dev_' + '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: string) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4)).toString(16)
  ).substring(0, 8);
};

export const storeDeviceId = (deviceId: string): void => {
  try {
    localStorage.setItem('deviceId', deviceId);
    if (window.sessionStorage) {
      sessionStorage.setItem('currentDeviceId', deviceId);
    }
  } catch (e) {
    // Silent fail
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
