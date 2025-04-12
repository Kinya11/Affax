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
    <Navbar @toggle="toggleTheme" class="nav-glass" />
    
    <!-- Pricing Section -->
    <div :class="theme" class="pricing-section">
      <h1 class="pricing-title">Pricing</h1>
      <div class="pricing-cards">
        <!-- Free Plan -->
        <div class="card">
          <div class="plan-header current-plan">Current Plan</div>
          <h2 class="plan-title">Free</h2>
          <p class="plan-price">0.00 /month</p>
          <ul class="plan-features">
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 1 list per organization</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 5 apps per list</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 1 organization</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 5 members per organization</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 1 admin per organization</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 5 list modification auto updates for members per month</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 1 month of updates stored in history</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Basic Support</li>
          </ul>
          <button class="cta-button">Create Account</button>
        </div>

        <!-- Business Plan -->
        <div class="card">
          <div class="plan-header">Business</div>
          <h2 class="plan-title">Business</h2>
          <p class="plan-price">100.00 /month</p>
          <ul class="plan-features">
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 1 list per organization</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 5 apps per list</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 1 organization</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 5 members per organization</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 1 admin per organization</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 5 list modification auto updates for members per month</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 1 month of updates stored in history</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Basic Support</li>
          </ul>
          <button class="cta-button">Upgrade to Business</button>
        </div>

        <!-- Premium Plan -->
        <div class="card best-value">
          <div class="plan-header">Best Value</div>
          <h2 class="plan-title">Premium</h2>
          <p class="plan-price">10.00 /month</p>
          <ul class="plan-features">
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 1 list per organization</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 5 apps per list</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 1 organization</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 5 members per organization</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 1 admin per organization</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 5 list modification auto updates for members per month</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> 1 month of updates stored in history</li>
            <li><img src="../assets/CheckMark.png" class="checkmark" /> Basic Support</li>
          </ul>
          <button class="cta-button">Upgrade to Premium</button>
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
/* Styles */

.nav-glass {
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.5) !important;
}

.checkmark {
  size: 30px;
}

/* Removed wallpaper styles as we're using PricingBackground now */

.pricing-section {
  text-align: center;
  padding: 20px;

}

.pricing-title {
  font-size: 2.5rem;
  margin-bottom: 20px;
}

.pricing-cards {
  display: flex;
  justify-content: center;
  gap: 20px; 

}

.card {
  border: 1px solid var(--card-border-color);
  border-radius: 10px;
  padding: 20px;
  width: 300px;
  text-align: left;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.5);
}

.plan-header {
  font-weight: bold;
  color: var(--primary-color);
}

.best-value .plan-header {
  color: var(--highlight-color);
}

.plan-title {
  font-size: 1.5rem;
  margin: 10px 0;
}

.plan-price {
  font-size: 1.2rem;
  margin-bottom: 15px;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin-bottom: 15px;
}

.plan-features li {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

.checkmark {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

.cta-button {
  background-color: var(--blue-gray);
  color: var(--text-color-dark);
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  transition-duration: var(--standard-animation-duration);
  transition-timing-function: cubic-bezier(0.165, 0.84, 0.44, 1);
}

.cta-button:hover {
  background-color: var(--dark-blue);
}
</style>
