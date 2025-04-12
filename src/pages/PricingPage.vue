<script setup>
import Navbar from '@/comps/Navbar/Navbar.vue';
import PricingBackground from '@/comps/PricingBackground.vue';
import { ref } from 'vue';

let theme = ref('light');

function toggleTheme(newTheme) {
  theme.value = newTheme;
}
</script>

<template>
  <PricingBackground style-type="particles">
    <Navbar @toggle="toggleTheme" />
    
    <!-- Pricing Section -->
    <div :class="theme" class="pricing-section">
      <h1 class="pricing-title">Choose Your Plan</h1>
      <div class="pricing-cards">
        <!-- Free Plan -->
        <div class="card">
          <div class="plan-header current-plan">Current Plan</div>
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
          <button class="cta-button">Get Started</button>
        </div>

        <!-- Premium Plan -->
        <div class="card best-value">
          <div class="plan-header">Most Popular</div>
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
          <button class="cta-button premium">Upgrade Now</button>
        </div>

        <!-- Business Plan -->
        <div class="card">
          <div class="plan-header">Business</div>
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
          <button class="cta-button">Contact Sales</button>
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
.pricing-section {
  text-align: center;
  padding-top: calc(35px + 20px + 2rem); /* navbar height + navbar top margin + additional spacing */
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

.pricing-section.dark {
  color: var(--text-color-dark);
}

.pricing-section.light {
  color: var(--text-color-light);
}

.pricing-title {
  font-size: 2.5rem;
  margin-bottom: 40px;
  font-weight: 600;
}

.pricing-cards {
  display: flex;
  justify-content: center;
  gap: 30px;
  max-width: 1200px;
  margin: 80px auto 0; /* Added top margin to account for navbar */
  padding-bottom: 40px; /* Add some bottom padding for better scrolling */
}

.card {
  border: 1px solid var(--medium-gray);
  border-radius: 16px;
  padding: 32px;
  width: 320px;
  text-align: left;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.7);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
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
  margin-bottom: 16px;
}

.current-plan {
  color: var(--dark-blue);
}

.plan-title {
  font-size: 1.8rem;
  margin: 16px 0;
  color: var(--dark-gray);
}

.plan-price {
  font-size: 1.4rem;
  margin-bottom: 24px;
  color: var(--app-gray);
}

.plan-features {
  list-style: none;
  padding: 0;
  margin-bottom: 32px;
}

.plan-features li {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  color: var(--app-gray);
}

.checkmark {
  width: 20px;
  height: 20px;
  margin-right: 12px;
}

.cta-button {
  width: 100%;
  background-color: var(--blue-gray);
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
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

@media (max-width: 1024px) {
  .pricing-cards {
    flex-direction: column;
    align-items: center;
    gap: 20px;
    margin-top: 100px; /* Increased top margin for mobile */
  }

  .card {
    width: 100%;
    max-width: 400px;
  }

  .best-value {
    transform: none;
  }

  .best-value:hover {
    transform: translateY(-5px);
  }
}
</style>
