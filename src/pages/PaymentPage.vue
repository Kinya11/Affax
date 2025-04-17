<script setup>
import { ref, onMounted } from 'vue';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'vue-router';
import Navbar from "@/comps/Navbar/Navbar.vue";
import PricingBackground from '@/comps/PricingBackground.vue';
import BlueGrayButton from "@/comps/BlueGrayButton.vue";
import { useToast } from 'vue-toastification';
import api from '@/api';

const router = useRouter();
const toast = useToast();
const stripe = ref(null);
const card = ref(null);
const loading = ref(false);
const selectedMethod = ref('card');
const selectedPlan = ref('premium');
const isLoaded = ref(false);

onMounted(async () => {
  try {
    // Initialize Stripe
    stripe.value = await loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
    
    // Create card elements
    const elements = stripe.value.elements();
    card.value = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#424770',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
        invalid: {
          color: '#9e2146',
        },
      },
    });
    
    // Mount card element
    card.value.mount('#card-element');
    
    // Handle real-time validation errors
    card.value.addEventListener('change', function(event) {
      const displayError = document.getElementById('card-errors');
      if (event.error) {
        displayError.textContent = event.error.message;
      } else {
        displayError.textContent = '';
      }
    });

    setTimeout(() => {
      isLoaded.value = true;
    }, 100);
  } catch (error) {
    console.error('Failed to initialize payment page:', error);
  }
});

const handlePayment = async () => {
  if (!stripe.value || !card.value) {
    toast.error('Payment system not initialized');
    return;
  }

  loading.value = true;
  
  try {
    // Create payment intent
    const { data: { clientSecret } } = await api.post('/api/payment/create-payment-intent', {
      plan: selectedPlan.value
    });

    // Confirm payment
    const result = await stripe.value.confirmCardPayment(clientSecret, {
      payment_method: {
        card: card.value,
      }
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    // Payment successful
    toast.success('Payment successful!');
    router.push('/dashboard'); // or wherever you want to redirect after success
  } catch (error) {
    toast.error(error.message || 'Payment failed. Please try again.');
  } finally {
    loading.value = false;
  }
};

const setPaymentMethod = (method) => {
  selectedMethod.value = method;
};
</script>

<template>
  <div :class="{ 'loaded': isLoaded }" class="payment-page">
    <PricingBackground style-type="gradient-texture">
      <Navbar class="nav-glass" />
      <div class="payment-container">
        <h1 class="page-title">Payment Information</h1>

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
            <p>Selected Plan: <strong>{{ selectedPlan }}</strong></p>
            <p>Total: <strong>$10.00 / month</strong></p>
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
    </PricingBackground>
  </div>
</template>

<style scoped>
.payment-page {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.payment-page.loaded {
  opacity: 1;
  transform: translateY(0);
}

.nav-glass {
  background-color: rgba(255, 255, 255, 0.5);
  position: fixed;
  top: 10px;
  left: 0.25%;
  right: 1%;
  width: 98%;
  border-radius: 8px;
  padding: 12px 20px;
  box-shadow: #0000003b 0px 4px 4px;
  z-index: 10000;
  backdrop-filter: blur(10px);
  height: 35px;
}

.payment-container {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 2.5rem;
  margin: 0 auto;
  max-width: 500px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
  margin-top: calc(35px + 20px + 2rem);
}

.page-title {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 2rem;
  color: var(--dark-blue);
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
}

.payment-methods :deep(.blue-gray-button[disabled]) {
  opacity: 0.6;
  cursor: not-allowed;
}

.payment-form {
  background: rgba(255, 255, 255, 0.4);
  padding: 2rem;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-grid {
  margin-bottom: 1.5rem;
}

#card-element {
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #ccc;
  transition: border-color 0.15s ease;
}

#card-element:focus {
  border-color: var(--dark-blue);
  box-shadow: 0 0 0 1px var(--dark-blue);
}

#card-errors {
  color: #dc3545;
  font-size: 0.9rem;
  margin-top: 0.5rem;
  min-height: 20px;
}

.summary {
  margin-top: 2rem;
  text-align: center;
  color: var(--dark-blue);
}

.summary h2 {
  margin-bottom: 0.5rem;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: 2rem;
}

.form-actions :deep(.blue-gray-button) {
  width: 100%;
  padding: 0.9rem;
}

.proceed-btn {
  background-color: var(--dark-blue);
  color: white;
  font-weight: 500;
}

.proceed-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.cancel-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0.5rem;
}

.cancel-btn:hover {
  text-decoration: underline;
}

/* Ensure no overflow */
:deep(#app) {
  overflow: hidden;
}

body {
  overflow: hidden;
}
</style>
