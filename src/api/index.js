import axios from 'axios';
import router from '../router';

const baseURL = import.meta.env.MODE === 'development' 
  ? 'http://localhost:5001'
  : import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Request interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  const deviceId = localStorage.getItem('deviceId') || 'dev_e767e97b';
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  config.headers['X-Device-ID'] = deviceId;
  return config;
});

// Response interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/sign-in')) {
        router.push('/sign-in');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
