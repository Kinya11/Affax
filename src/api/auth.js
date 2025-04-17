import api from './index';

const auth = {
  async login(credentials) {
    const response = await api.post('/api/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      // Store the device ID used for login
      if (credentials.deviceId) {
        localStorage.setItem('currentDeviceId', credentials.deviceId);
      }
    }
    return response;
  },

  async logout() {
    try {
      const token = this.getToken();
      const currentDeviceId = localStorage.getItem('currentDeviceId');
      
      if (token) {
        await api.post('/api/auth/logout', {}, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Device-ID': currentDeviceId // Include device ID in logout request
          }
        });
      }
      
      // Clear auth data but preserve device ID
      this.clearAuthData();
      if (currentDeviceId) {
        localStorage.setItem('currentDeviceId', currentDeviceId);
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  getToken() {
    return localStorage.getItem('token');
  },

  clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('deviceId');
    // Clear any other auth-related data
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  },

  async verifyToken() {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await api.get('/api/auth/verify');
      return response.data?.valid || false;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  },

  async isAuthenticated() {
    return await this.verifyToken();
  },

  async checkSubscription() {
    // For development, allow override with query param or localStorage
    if (import.meta.env.MODE === 'development') {
      const devMode = localStorage.getItem('devSubscriptionMode');
      if (devMode === 'free') {
        return {
          currentPlan: {
            name: 'free',
            limits: {
              maxLists: 3,
              maxAppsPerList: 5
            }
          }
        };
      }
      // Default pro subscription for development
      return {
        currentPlan: {
          name: 'pro',
          limits: {
            maxLists: -1,
            maxAppsPerList: -1
          }
        }
      };
    }

    try {
      const token = this.getToken();
      if (!token) return null;

      const response = await api.get('/api/subscription');
      return response.data;
    } catch (error) {
      console.error('Subscription check failed:', error);
      throw error;
    }
  }
};

export default auth;

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth attempt:', {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    path: req.path
  });

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  });
};
