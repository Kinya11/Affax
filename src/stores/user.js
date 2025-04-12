import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    isAuthenticated: false
  }),
  actions: {
    setUser(user) {
      this.user = user;
      this.isAuthenticated = true;
    },
    clearUser() {
      this.user = null;
      this.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    initializeFromStorage() {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          this.user = JSON.parse(userStr);
          this.isAuthenticated = true;
        } catch (e) {
          this.clearUser();
        }
      }
    }
  }
});
