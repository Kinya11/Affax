<script setup>
import Navbar from '@/comps/Navbar/Navbar.vue';
import PricingBackground from '@/comps/PricingBackground.vue';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/api';

const router = useRouter();
let theme = ref('light');
const isLoaded = ref(false);
const currentPlan = ref('free');

function toggleTheme(newTheme) {
  theme.value = newTheme;
}

async function checkCurrentPlan() {
  const token = localStorage.getItem('token');
  try {
    const response = await api.get('/api/subscription', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    currentPlan.value = response.data.currentPlan.name;
  } catch (error) {
    console.error('Failed to fetch subscription status:', error);
    currentPlan.value = 'free';
  }
}

async function handleUpgradeClick(planName) {
  const token = localStorage.getItem('token');
  if (!token) {
    router.push('/sign-in');
    return;
  }

  if (planName.toLowerCase() === 'enterprise') {
    window.location.href = 'mailto:sales@yourcompany.com';
    return;
  }

  try {
    // Navigate to payment page with selected plan
    await router.push({
      name: 'PaymentPage',
      query: { 
        plan: planName.toLowerCase(),
        return_url: '/dashboard'
      }
    });
  } catch (error) {
    console.error('Navigation error:', error);
    // Direct navigation as fallback
    window.location.href = `/payment-page?plan=${planName.toLowerCase()}`;
  }
}

function getButtonConfig(planName) {
  const planRank = { 'free': 0, 'premium': 1, 'enterprise': 2 };
  const currentRank = planRank[currentPlan.value];
  const targetRank = planRank[planName.toLowerCase()];

  if (targetRank <= currentRank) {
    return {
      text: 'Current Plan',
      class: '',
      disabled: true,
      action: null
    };
  }

  if (planName.toLowerCase() === 'enterprise') {
    return {
      text: 'Contact Sales',
      class: '',
      disabled: false,
      action: () => handleUpgradeClick('enterprise')
    };
  }

  return {
    text: 'Upgrade Now',
    class: 'premium',
    disabled: false,
    action: () => handleUpgradeClick(planName)
  };
}

onMounted(async () => {
  await checkCurrentPlan();
  setTimeout(() => {
    isLoaded.value = true;
  }, 100);
});
</script>

<template>
  <PricingBackground style-type="particles">
    <Navbar @toggle="toggleTheme" />
    
    <!-- Pricing Section -->
    <div :class="[theme, { 'loaded': isLoaded }]" class="pricing-section">
      <h1 class="pricing-title">Choose Your Plan</h1>
      <div class="pricing-cards">
        <!-- Free Plan -->
        <div class="card">
          <div class="plan-header" :class="{ 'current-plan': currentPlan === 'free' }">
            {{ currentPlan === 'free' ? 'Current Plan' : 'Basic' }}
          </div>
          <h2 class="plan-title">Free</h2>
          <p class="plan-price">$0.00 /month</p>
          <ul class="plan-features">
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 1 app list</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Up to 5 apps</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Basic app monitoring</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 7-day update history</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Email notifications</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Community support</li>
          </ul>
          <button 
            class="cta-button"
            :class="getButtonConfig('free').class"
            :disabled="getButtonConfig('free').disabled"
            @click="getButtonConfig('free').action"
          >
            {{ getButtonConfig('free').text }}
          </button>
        </div>

        <!-- Premium Plan -->
        <div class="card best-value">
          <div class="plan-header" :class="{ 'current-plan': currentPlan === 'premium' }">
            {{ currentPlan === 'premium' ? 'Current Plan' : 'Most Popular' }}
          </div>
          <h2 class="plan-title">Premium</h2>
          <p class="plan-price">$10.00 /month</p>
          <ul class="plan-features">
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Unlimited app lists</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Up to 25 apps per list</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Advanced app monitoring</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 30-day update history</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Priority notifications</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Priority support</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Custom update schedules</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> API access</li>
          </ul>
          <button 
            class="cta-button"
            :class="getButtonConfig('premium').class"
            :disabled="getButtonConfig('premium').disabled"
            @click="getButtonConfig('premium').action"
          >
            {{ getButtonConfig('premium').text }}
          </button>
        </div>

        <!-- Enterprise Plan -->
        <div class="card">
          <div class="plan-header" :class="{ 'current-plan': currentPlan === 'enterprise' }">
            {{ currentPlan === 'enterprise' ? 'Current Plan' : 'Business' }}
          </div>
          <h2 class="plan-title">Enterprise</h2>
          <p class="plan-price">$100.00 /month</p>
          <ul class="plan-features">
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Everything in Premium</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Unlimited apps</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Advanced analytics</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 90-day update history</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Custom integrations</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Dedicated support</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> SLA guarantees</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Custom features</li>
          </ul>
          <button 
            class="cta-button"
            :class="getButtonConfig('enterprise').class"
            :disabled="getButtonConfig('enterprise').disabled"
            @click="getButtonConfig('enterprise').action"
          >
            {{ getButtonConfig('enterprise').text }}
          </button>
        </div>
      </div>
    </div>
  </PricingBackground>
</template>

<script>
export default {
  name: 'PricingPage',
  props: ["theme"],
};
</script>

<style scoped>
/* Add these new animation styles */
.pricing-section {
  margin-top: 20px;
  opacity: 0;
  transition: opacity 0.2s ease;
  position: relative;
  z-index: 10; /* Added to ensure content stays above particles */
  overflow: hidden;
}

.pricing-section.loaded {
  opacity: 1;
}

.pricing-section {
  text-align: center;
  padding-top: calc(35px + 20px + 1rem);
  padding-left: 20px;
  padding-right: 20px;
  height: 100vh;
  overflow-y: auto;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* Ensure PricingBackground particles stay behind */
:deep(#particles-background) {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1; /* Behind everything */
}

/* Navbar should be above particles but below modals if any */
:deep(.navbar) {
  position: fixed;
  z-index: 100; /* Higher than content */
}

.pricing-section.dark {
  color: var(--text-color-dark);
}

.pricing-section.light {
  color: var(--text-color-light);
}
.pricing-title {
  font-size: 2.2rem; /* Slightly smaller title */
  margin-bottom: 60px; /* Reduced margin */
  font-weight: 600;
}

.pricing-cards {
  display: flex;
  justify-content: center;
  gap: 20px; /* Reduced gap */
  max-width: 1200px;
  margin: 20px auto 0; /* Reduced top margin */
  padding-bottom: 20px; /* Reduced bottom padding */
}

.card {
  border: 1px solid var(--medium-gray);
  border-radius: 16px;
  padding: 24px;
  width: 300px;
  text-align: left;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.7);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 520px;
  position: relative;
  z-index: 10; /* Ensure cards stay above particles */
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.best-value {
  border: 2px solid var(--blue-gray);
  transform: scale(1.05);
}

.best-value:hover {
  transform: scale(1.05) translateY(-5px);
}

.plan-header {
  font-weight: 600;
  color: var(--blue-gray);
  margin-bottom: 12px; /* Reduced margin */
}

.current-plan {
  color: var(--dark-blue);
}

.plan-title {
  font-size: 1.6rem; /* Slightly smaller title */
  margin: 12px 0; /* Reduced margin */
  color: var(--dark-gray);
}

.plan-price {
  font-size: 1.3rem; /* Slightly smaller price */
  margin-bottom: 20px; /* Reduced margin */
  color: var(--app-gray);
}

.plan-features {
  list-style: none;
  padding: 0;
  margin-bottom: 24px; /* Reduced margin */
  flex-grow: 1;
}

.plan-features li {
  margin-bottom: 8px; /* Reduced margin between list items */
  display: flex;
  align-items: center;
  color: var(--app-gray);
  font-size: 0.95rem; /* Slightly smaller text */
}

.checkmark {
  width: 16px; /* Slightly smaller checkmarks */
  height: 16px;
  margin-right: 8px;
  filter: brightness(0);
}

.cta-button {
  width: 100%;
  background-color: var(--blue-gray);
  color: white;
  border: none;
  padding: 12px 20px; /* Reduced padding */
  border-radius: 8px;
  font-size: 0.95rem; /* Slightly smaller text */
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 0;
}

.cta-button:hover {
  background-color: var(--dark-blue);
  transform: translateY(-2px);
}

.cta-button.premium {
  background-color: var(--dark-blue);
}

.cta-button.premium:hover {
  background-color: var(--blue-gray);
}

.cta-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background-color: var(--medium-gray);
  transform: none !important;
}

.cta-button:disabled:hover {
  background-color: var(--medium-gray);
  transform: none !important;
}

@media (max-width: 1024px) {
  .pricing-cards {
    flex-direction: column;
    align-items: center;
    gap: 16px;
    margin-top: 40px;
  }

  .card {
    min-height: auto;
    width: 100%;
    max-width: 360px;
  }

  .best-value {
    transform: none;
  }

  .best-value:hover {
    transform: translateY(-5px);
  }
}
</style>
