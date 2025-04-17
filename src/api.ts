import axios, { 
  InternalAxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
  AxiosHeaders 
} from 'axios';
import router from './router';

// Force development URL if in development mode
const baseURL = import.meta.env.MODE === 'development' 
  ? 'http://localhost:5001'
  : (import.meta.env.VITE_API_URL || 'http://localhost:5001');

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
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Log the full URL being requested
    const url = config.url || '';
    const requestBaseURL = config.baseURL || baseURL;
    console.log('Making request to:', requestBaseURL + url);
    
    const token = localStorage.getItem('token');
    const deviceId = localStorage.getItem('deviceId');
    
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }
    
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (deviceId) {
      config.headers.set('X-Device-ID', deviceId);
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

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
