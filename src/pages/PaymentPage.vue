<script setup>
import Navbar from "@/comps/Navbar/Navbar.vue";
import PricingBackground from '@/comps/PricingBackground.vue';
</script>

<template>
  <PricingBackground style-type="gradient-texture">
    <Navbar class="nav-glass" />
    <div class="payment-container">
      <h1 class="page-title">Payment Information</h1>

      <div class="payment-methods">
        <button class="method-btn active">Credit/Debit Card</button>
        <button class="method-btn">PayPal</button>
      </div>

      <form class="payment-form">
        <!-- Card Form -->
        <div class="form-grid">
          <div class="form-group">
            <label for="cardholder-name">Cardholder Name</label>
            <input type="text" id="cardholder-name" placeholder="John Doe" />
          </div>

          <div class="form-group">
            <label for="card-number">Card Number</label>
            <input type="text" id="card-number" placeholder="1234 5678 9012 3456" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="expiry-date">Expiration</label>
              <input type="text" id="expiry-date" placeholder="MM/YY" />
            </div>
            <div class="form-group">
              <label for="cvv">CVV</label>
              <input type="text" id="cvv" placeholder="123" />
            </div>
          </div>
        </div>

        <!-- Plan Summary -->
        <div class="summary">
          <h2>Plan Summary</h2>
          <p>Selected Plan: <strong>Premium</strong></p>
          <p>Total: <strong>$10.00 / month</strong></p>
        </div>

        <!-- Actions -->
        <div class="form-actions">
          <button type="submit" class="proceed-btn">Pay Now</button>
          <button type="button" class="cancel-btn">Cancel</button>
        </div>
      </form>
    </div>
  </PricingBackground>
</template>

<script>
export default {
  name: "PaymentPage",
};
</script>

<style scoped>
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
  margin-top: calc(35px + 20px + 2rem); /* navbar height + navbar top margin + additional spacing */
}

.page-title {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 2rem;
}

.payment-methods {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.method-btn {
  flex: 1;
  padding: 0.8rem 1rem;
  background-color: #6c63ff;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.method-btn:hover {
  background-color: #5548c9;
}

.method-btn.active {
  background-color: #5548c9;
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
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 0.9rem;
  margin-bottom: 0.3rem;
}

.form-group input {
  padding: 0.8rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  background-color: white;
}

.summary {
  margin-top: 2rem;
  text-align: center;
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

.proceed-btn {
  background-color: #6c63ff;
  color: white;
  padding: 0.9rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.proceed-btn:hover {
  background-color: #5548c9;
}

.cancel-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 0.95rem;
  cursor: pointer;
}

.cancel-btn:hover {
  text-decoration: underline;
}
</style>
