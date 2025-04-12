export const generateDeviceId = () => {
  const components = [
    navigator.userAgent,
    navigator.platform,
    screen.width + 'x' + screen.height,
    crypto.getRandomValues(new Uint8Array(8)).join(''),
    Date.now().toString(36)
  ];
  
  // Create a hash of the components
  const hashBuffer = new TextEncoder().encode(components.join('|'));
  return crypto.subtle.digest('SHA-256', hashBuffer)
    .then(hash => {
      const hashArray = Array.from(new Uint8Array(hash));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `dev_${hashHex.substring(0, 8)}`;
    });
};

// Use this for synchronous generation when needed
export const generateSimpleDeviceId = () => {
  return 'dev_' + ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  ).substring(0, 8);
};

export const storeDeviceId = (deviceId) => {
  try {
    localStorage.setItem('deviceId', deviceId);
    if (window.sessionStorage) {
      sessionStorage.setItem('currentDeviceId', deviceId);
    }
  } catch (e) {
    // Silent fail
  }
};

export const getStoredDeviceId = () => {
  return localStorage.getItem('deviceId');
};

export const restoreDeviceId = async () => {
  try {
    const response = await api.get('/api/devices');
    if (response.data.devices && response.data.devices.length > 0) {
      const currentDevice = response.data.devices.find(device => device.is_active);
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

