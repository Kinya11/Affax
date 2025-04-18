import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  const deviceId = localStorage.getItem('deviceId');
  if (deviceId) {
    config.headers['X-Device-ID'] = deviceId;
  }
  
  return config;
});

export default api;
