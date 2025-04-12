export const generateDeviceId = () => {
  // Generate a simpler, more manageable device ID
  return 'dev_' + Math.random().toString(36).substr(2, 9);
};

export const storeDeviceId = (deviceId) => {
  try {
    localStorage.setItem('deviceId', deviceId);
    if (window.sessionStorage) {
      sessionStorage.setItem('currentDeviceId', deviceId);
    }
  } catch (e) {
    console.error('Device storage failed:', e);
  }
};

export const getStoredDeviceId = () => {
  return localStorage.getItem('deviceId');
};
