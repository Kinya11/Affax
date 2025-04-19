import axios, { 
  InternalAxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
} from 'axios';
import router from './router';

const baseURL = import.meta.env.MODE === 'development' 
  ? 'http://localhost:5001'  // Change back to HTTP for development
  : (import.meta.env.VITE_API_URL || 'https://localhost:5001');

console.log('Creating API instance with baseURL:', baseURL);

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Request interceptor
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
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

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response?.status === 401 || 
        (error.response?.data as any)?.code === 'TOKEN_EXPIRED') {
      localStorage.removeItem('token');
      router.push('/sign-in');
    }
    return Promise.reject(error);
  }
);

export default api;
