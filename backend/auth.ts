// src/api/auth.ts (rename from .js to .ts)
import api from '../src/api/index.js';
import { AxiosResponse } from 'axios';

interface AuthResponse {
  token: string;
  user?: any;
  expires_in?: number;
}

export default {
  register(userData: any): Promise<AxiosResponse<AuthResponse>> {
    return api.post('/auth/register', userData);
  },

  login(credentials: any): Promise<AxiosResponse<AuthResponse>> {
    return api.post('/auth/login', credentials);
  },

  googleLogin(idToken: string): Promise<AxiosResponse<AuthResponse>> {
    return api.post('/auth/google-login', { id_token: idToken });
  },

  logout(): Promise<AxiosResponse> {
    return api.post('/auth/logout');
  },

  // Add the missing methods
  getValidToken(): string | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    // Add token validation logic if needed
    return token;
  },

  clearAuthData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};