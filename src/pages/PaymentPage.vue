<script setup>
import { ref, onMounted } from 'vue';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter, useRoute } from 'vue-router';
import Navbar from "@/comps/Navbar/Navbar.vue";
import PricingBackground from '@/comps/PricingBackground.vue';
import BlueGrayButton from "@/comps/BlueGrayButton.vue";
import { useToast } from 'vue-toastification';
import api from '@/api';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const stripe = ref(null);
const card = ref(null);
const loading = ref(false);
const selectedMethod = ref('card');
const selectedPlan = ref('premium');
const isLoaded = ref(false);
const theme = ref('light');
const selectedBackground = ref('diagonal-lines');

// Add theme toggle function
const toggleTheme = (newTheme) => {
  theme.value = newTheme;
};

onMounted(async () => {
  try {
    // Get the plan from the URL query parameters
    if (route.query.plan) {
      selectedPlan.value = route.query.plan;
    }

    // Check if Stripe key is available
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    if (!stripeKey) {
      throw new Error('Stripe public key is not configured');
    }

    // Initialize Stripe
    stripe.value = await loadStripe(stripeKey);
    if (!stripe.value) {
      throw new Error('Failed to initialize Stripe');
    }
    
    // Mount the card element
    const elements = stripe.value.elements();
    card.value = elements.create('card');
    card.value.mount('#card-element');

    // Handle card element errors
    card.value.on('change', ({error}) => {
      const displayError = document.getElementById('card-errors');
      if (error) {
        displayError.textContent = error.message;
      } else {
        displayError.textContent = '';
      }
    });

    setTimeout(() => {
      isLoaded.value = true;
    }, 100);
  } catch (error) {
    console.error('Payment page initialization error:', error);
    toast.error('Failed to initialize payment system');
    router.push('/pricing');
  }
});

const handlePayment = async () => {
  if (!stripe.value || !card.value) {
    toast.error('Payment system not initialized');
    return;
  }

  loading.value = true;
  
  try {
    const response = await api.post('/api/payment/create-payment-intent', {
      plan: selectedPlan.value
    });

    if (!response.data.clientSecret) {
      throw new Error('No client secret received');
    }

    const result = await stripe.value.confirmCardPayment(response.data.clientSecret, {
      payment_method: {
        card: card.value,
      }
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    toast.success('Payment successful!');
    router.push('/dashboard');
  } catch (error) {
    console.error('Payment error:', error);
    toast.error(error.response?.data?.error || error.message || 'Payment failed. Please try again.');
  } finally {
    loading.value = false;
  }
};

const setPaymentMethod = (method) => {
  selectedMethod.value = method;
};
</script>

<template>
  <div class="payment-page-wrapper">
    <PricingBackground :styleType="selectedBackground" />
    
    <!-- Replace custom nav with Navbar component -->
    <Navbar @toggle="toggleTheme" />

    <main :class="{ 'loaded': isLoaded }" class="main-content">
      <div class="payment-container" :class="{ 'fade-in': true }">
        <h1 class="page-title">Payment Information</h1>
        <p class="subtitle">Complete your subscription to get started</p>

        <div class="payment-methods">
          <BlueGrayButton 
            :class="{ active: selectedMethod === 'card' }"
            @click="setPaymentMethod('card')"
          >
            Credit/Debit Card
          </BlueGrayButton>
          <BlueGrayButton 
            :class="{ active: selectedMethod === 'paypal' }"
            @click="setPaymentMethod('paypal')"
            disabled
          >
            PayPal (Coming Soon)
          </BlueGrayButton>
        </div>

        <form class="payment-form" @submit.prevent="handlePayment">
          <div v-if="selectedMethod === 'card'" class="form-grid">
            <div id="card-element"></div>
            <div id="card-errors" role="alert"></div>
          </div>

          <!-- Plan Summary -->
          <div class="summary">
            <h2>Plan Summary</h2>
            <p>Selected Plan: <strong>{{ selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1) }}</strong></p>
            <p>Total: <strong>${{ selectedPlan === 'premium' ? '10.00' : '100.00' }} / month</strong></p>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <BlueGrayButton 
              type="submit" 
              :disabled="loading"
              class="proceed-btn"
            >
              {{ loading ? 'Processing...' : 'Pay Now' }}
            </BlueGrayButton>
            <button 
              type="button" 
              class="cancel-btn" 
              @click="$router.push('/pricing')"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<style scoped>
.payment-page-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

:deep(#particles-background) {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.main-content {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease, transform 0.5s ease;
  z-index: 10;
  padding-top: 60px;
}

.main-content.loaded {
  opacity: 1;
  transform: translateY(0);
}

/* Modify the payment container to be more transparent */
.payment-container {
  margin-top: 20px;
  width: 35%;
  max-width: 500px;
  background: rgba(255, 255, 255, 0.85); /* Reduced opacity */
  backdrop-filter: blur(5px); /* Reduced blur */
  -webkit-backdrop-filter: blur(5px);
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 20;
  margin-top: -20px;
}

/* Make the payment form more transparent as well */
.payment-form {
  background: rgba(255, 255, 255, 0.3); /* More transparent */
  padding: 1.5rem;
  border-radius: 12px;
}

/* Ensure the card element stands out */
#card-element {
  padding: 12px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  transition: border-color 0.2s ease;
}

.page-title {
  text-align: center;
  font-size: 24px;
  margin-bottom: 15px;
  font-weight: 500;
  color: #000;
}

.subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 25px;
  font-size: 14px;
}

.payment-methods {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.payment-methods :deep(.blue-gray-button) {
  flex: 1;
  padding: 0.8rem 1rem;
}

.payment-methods :deep(.blue-gray-button.active) {
  background-color: var(--dark-blue);
  color: white;
}

#card-element {
  padding: 12px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.368);
  border-radius: 8px;
  transition: border-color 0.2s ease;
}

#card-element:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
}

#card-errors {
  color: red;
  font-size: 14px;
  margin-top: 8px;
  min-height: 20px;
}

.summary {
  margin-top: 1.5rem;
  text-align: center;
}

.summary h2 {
  font-size: 18px;
  margin-bottom: 10px;
}

.form-actions {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.form-actions :deep(.blue-gray-button) {
  width: 70%;
  height: 40px !important;
  min-height: 40px !important;
  border-radius: 5px;
}

.cancel-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  padding: 8px;
}

.cancel-btn:hover {
  text-decoration: underline;
}

.fade-in {
  animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  will-change: transform, opacity;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px) translateZ(0);
  }
  to {
    opacity: 1;
    transform: translateY(0) translateZ(0);
  }
}

@media (max-width: 768px) {
  .payment-container {
    width: 90%;
    padding: 30px;
  }
  
  .form-actions :deep(.blue-gray-button) {
    width: 100%;
  }
}
</style>
