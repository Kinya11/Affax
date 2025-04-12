<script setup>
import Navbar from "@/comps/Navbar/Navbar.vue";
import PricingBackground from '@/comps/PricingBackground.vue';
</script>

<template>
  <PricingBackground style-type="particles">
    <Navbar class="nav-glass"/>

    <div class="payment-container">
      <h1>Payment Information</h1>
      <div class="payment-methods">
        <button class="method-btn">Credit/Debit Card</button>
        <button class="method-btn">PayPal</button>
      </div>

      <form class="payment-form">
        <!-- Credit/Debit Card Form Fields -->
        <div class="form-group">
          <label for="cardholder-name">Cardholder Name</label>
          <input type="text" id="cardholder-name" placeholder="John Doe" />
        </div>
        <div class="form-group">
          <label for="card-number">Card Number</label>
          <input type="text" id="card-number" placeholder="1234 5678 9012 3456" />
        </div>
        <div class="form-group">
          <label for="expiry-date">Expiration Date</label>
          <input type="text" id="expiry-date" placeholder="MM/YY" />
        </div>
        <div class="form-group">
          <label for="cvv">CVV</label>
          <input type="text" id="cvv" placeholder="123" />
        </div>

        <div class="summary">
          <h2>Plan Summary</h2>
          <p>Selected Plan: <strong>Premium</strong></p>
          <p>Total: <strong>$10.00/month</strong></p>
        </div>

        <div class="form-actions">
          <button type="submit" class="proceed-btn">Proceed to Payment</button>
          <button type="button" class="cancel-btn">Cancel</button>
        </div>
      </form>
    </div>
  </PricingBackground>
</template>

<script>
export default {
  name: "PaymentPage",
  props: ["theme"],
};
</script>

<style scoped>
.nav-glass {
  background-color: rgba(255, 255, 255, 0.5) !important;
}

.payment-container {
  padding: 20px;
  max-width: 600px;
  margin: 20px auto;
  position: relative;
  z-index: 1;
}

h1 {
  text-align: center;
}

.payment-methods {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.method-btn {
  margin: 0 10px;
  padding: 10px 20px;
  background-color: #6c63ff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.method-btn:hover {
  background-color: #5548c9;
}

.payment-form {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 5px;
  backdrop-filter: blur(10px);  
  background-color: rgba(255, 255, 255, 0.5);
  padding-right: 35px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.summary {
  margin-top: 20px;
  text-align: center;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.proceed-btn {
  background-color: #6c63ff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.proceed-btn:hover {
  background-color: #5548c9;
}

.cancel-btn {
  background-color: rgba(253, 251, 251, 0.87);
  color: black;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.cancel-btn:active {
  background-color: #aaa;
}
</style>
