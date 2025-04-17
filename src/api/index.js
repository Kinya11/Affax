import axios from 'axios';

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

// Add request deduplication
const pendingRequests = new Map();

api.interceptors.request.use(config => {
  const requestKey = `${config.method}:${config.url}`;
  
  if (pendingRequests.has(requestKey)) {
    const timestamp = pendingRequests.get(requestKey);
    if (Date.now() - timestamp < 2000) { // 2 second cooldown
      return Promise.reject(new axios.Cancel('Duplicate request cancelled'));
    }
  }
  
  pendingRequests.set(requestKey, Date.now());
  return config;
});

api.interceptors.response.use(
  response => {
    const requestKey = `${response.config.method}:${response.config.url}`;
    pendingRequests.delete(requestKey);
    return response;
  },
  error => {
    if (error.config) {
      const requestKey = `${error.config.method}:${error.config.url}`;
      pendingRequests.delete(requestKey);
    }
    return Promise.reject(error);
  }
);

export default api;
