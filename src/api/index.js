import axios from 'axios';

const baseURL = import.meta.env.MODE === 'development' 
  ? 'https://localhost:5001'  // Changed to https
  : import.meta.env.VITE_API_URL;

console.log('API baseURL:', baseURL);

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true,
  // Add this for development
  httpsAgent: import.meta.env.MODE === 'development' ? { 
    rejectUnauthorized: false 
  } : undefined
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
  
  // Log request for debugging
  console.log('Making API request:', {
    url: config.url,
    method: config.method,
    baseURL: config.baseURL
  });
  
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

export default api;
