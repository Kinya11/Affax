import axios from 'axios';
import router from './router';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  const deviceId = localStorage.getItem('deviceId');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (deviceId) {
    config.headers['X-Device-ID'] = deviceId;
  }
  
  return config;
}, error => {
  return Promise.reject(error);
});

// Response interceptor
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 || 
        error.response?.data?.code === 'TOKEN_EXPIRED') {
      localStorage.removeItem('token');
      router.push('/sign-in');
    }
    return Promise.reject(error);
  }
);

export default api;
