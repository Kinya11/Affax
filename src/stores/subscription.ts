import { defineStore } from 'pinia';
import api from '@/api';

interface SubscriptionPlan {
  id: string;
  name: string;
  seats: number;
  price: number;
}

interface SubscriptionState {
  currentPlan: SubscriptionPlan | null;
  availableSeats: number;
  usedSeats: number;
  loading: boolean;
  error: string | null;
}

export const useSubscriptionStore = defineStore('subscription', {
  state: (): SubscriptionState => ({
    currentPlan: null,
    availableSeats: 0,
    usedSeats: 0,
    loading: false,
    error: null
  }),

  actions: {
    async fetchSubscriptionDetails() {
      this.loading = true;
      try {
        console.log('Fetching subscription details...');
        const token = localStorage.getItem('token');
        console.log('Token present:', !!token);
        
        const response = await api.get('/api/subscription', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log('Subscription response:', response.data);
        
        const { currentPlan, availableSeats, usedSeats } = response.data;
        this.currentPlan = currentPlan;
        this.availableSeats = availableSeats;
        this.usedSeats = usedSeats;
        this.error = null;
      } catch (error: any) {
        console.error('Subscription fetch error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          config: error.config
        });
        
        this.error = error.response?.data?.error || 'Failed to fetch subscription details';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async upgradePlan(priceId: string) {
      try {
        const response = await api.post('/api/subscription/upgrade', { priceId });
        window.location.href = response.data.checkoutUrl;
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Failed to upgrade subscription';
        throw error;
      }
    }
  }
});
