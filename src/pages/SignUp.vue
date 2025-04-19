<script setup>
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import api from '@/api';
import { useToast } from 'vue-toastification';
import { generateDeviceId, storeDeviceId, getStoredDeviceId } from '@/utils/device';
import PricingBackground from '@/comps/PricingBackground.vue';
import { useListStore } from '@/stores/listStore';

const router = useRouter();
const toast = useToast();
const pageVisible = ref(false);
const googleLoaded = ref(false);
const isLoaded = ref(false);

const onSignIn = () => {
  pageVisible.value = false;
  router.push({ name: "SignIn" });
};

onMounted(() => {
  // Initialize Google Sign-In immediately
  initializeGoogleSignIn();
  
  // Handle page visibility after a micro-task
  queueMicrotask(() => {
    pageVisible.value = true;
  });
  
  // Set overall page loaded state
  requestAnimationFrame(() => {
    isLoaded.value = true;
  });
});

// Form data with validation states
const formData = ref({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  careerField: '',
  receiveEmails: false,
  agreeToTerms: false
});

const loading = ref(false);
const errorMessage = ref("");

const validateForm = () => {
  if (!formData.value.email || !formData.value.password) {
    errorMessage.value = "Email and password are required";
    return false;
  }
  if (!formData.value.firstName || !formData.value.lastName) {
    errorMessage.value = "First and last name are required";
    return false;
  }
  if (!formData.value.dateOfBirth) {
    errorMessage.value = "Date of birth is required";
    return false;
  }
  if (!formData.value.agreeToTerms) {
    errorMessage.value = "You must agree to the terms";
    return false;
  }
  return true;
};

// Form submission handler
const onFormSubmit = async () => {
  try {
    if (!validateForm()) {
      return;
    }

    loading.value = true;
    errorMessage.value = '';

    const deviceId = await generateDeviceId();
    storeDeviceId(deviceId);

    // Log the request payload for debugging
    const payload = {
      firstName: formData.value.firstName,
      lastName: formData.value.lastName,
      email: formData.value.email,
      password: formData.value.password,
      careerField: formData.value.careerField || undefined,
      dateOfBirth: formData.value.dateOfBirth,
      receiveEmails: formData.value.receiveEmails,
      agreeToTerms: formData.value.agreeToTerms,
      deviceId
    };
    
    console.log("Registration payload:", {
      ...payload,
      password: '[REDACTED]'
    });

    const registerResponse = await api.post("/api/auth/register", payload);

    console.log("Registration response:", {
      status: registerResponse.status,
      data: registerResponse.data
    });

    if (registerResponse.data.success) {
      const loginResponse = await api.post("/api/auth/login", {
        email: formData.value.email,
        password: formData.value.password,
        deviceId
      });

      if (loginResponse.data.token) {
        localStorage.setItem("token", loginResponse.data.token);
        
        const listStore = useListStore();
        listStore.lists = [];
        
        toast.success("Registration successful! Redirecting...");
        router.push({ name: "AppList" });
      }
    }
  } catch (error) {
    console.error("Registration error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // Handle specific error cases
    if (error.response?.status === 400) {
      const details = error.response.data.details;
      if (details) {
        // Show which fields are missing
        const missingFields = Object.entries(details)
          .filter(([_, value]) => !value)
          .map(([field]) => field)
          .join(', ');
        errorMessage.value = `Missing required fields: ${missingFields}`;
      } else {
        errorMessage.value = error.response.data.error || "Please check your input and try again.";
      }
    } else if (error.response?.status === 429) {
      errorMessage.value = "Too many registration attempts. Please try again in an hour.";
    } else if (error.response?.status === 409) {
      errorMessage.value = "This email is already registered.";
    } else {
      errorMessage.value = "Registration failed. Please try again later.";
    }
  } finally {
    loading.value = false;
  }
};

// Google Sign-In with device ID
const handleCredentialResponse = async (response) => {
  try {
    // Get existing device ID first
    let deviceId = getStoredDeviceId();
    
    // Only generate if doesn't exist
    if (!deviceId) {
      deviceId = await generateDeviceId();
      storeDeviceId(deviceId);
    }

    const res = await api.post("/api/auth/google-login", {
      id_token: response.credential,
      deviceId: deviceId
    });

    localStorage.setItem("token", res.data.token);
    
    if (res.data.requiresDeviceRegistration) {
      router.push({ name: "DeviceRegister" });
    } else {
      router.push({ name: "AppList" });
    }

  } catch (error) {
    console.error("Google sign-in error:", error);
    errorMessage.value = error.response?.data?.error?.includes("device") 
      ? "Device registration required"
      : "Google sign-in failed. Please try again.";
  }
};

// Google Script loading with retry
const loadGoogleScript = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      if (window.google) return;
      
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = (e) => reject(new Error("Failed to load Google script"));
        document.head.appendChild(script);
      });
      
      return;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

// Enhanced Google Sign-In initialization
const initializeGoogleSignIn = async () => {
  try {
    await loadGoogleScript();
    
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      throw new Error("Google Client ID not configured");
    }

    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false
      });

      // Pre-render the button container
      const buttonElement = document.getElementById("google-signin-btn");
      if (buttonElement) {
        window.google.accounts.id.renderButton(buttonElement, { 
          theme: "filled_black", 
          size: "large",
          width: 300,
          text: "continue_with",
          logo_alignment: "center"
        });
        
        // Use requestAnimationFrame for smoother transition
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            googleLoaded.value = true;
          });
        });
      }
    }
  } catch (error) {
    console.error("Google Sign-In initialization failed:", error);
    errorMessage.value = "Google Sign-In is currently unavailable";
  }
};
</script>

<template>
  <div class="sign-up-root">
    <PricingBackground styleType="particles" />

    <!-- Updated nav to match SignIn.vue -->
    <nav>
      <div class="logo-container" @click="router.push('/')">
        <img class="Logo" src="@/assets/logo.svg" alt="append logo" />
      </div>
      <div class="nav-element" id="nav-center"></div>
      <div class="nav-right">
        <span class="nav-element nav-link" id="sign-in" @click="onSignIn">
          Sign In
        </span>
      </div>
    </nav>

    <main :class="{ 'loaded': isLoaded }" class="main-content">
      <div class="sign-up-page">
        <div class="form-container" :class="{ 'fade-in': pageVisible, 'fade-out': !pageVisible }">
          <h1 id="setup-title">Create Your Account</h1>
          <p class="setup-description">
            Please make sure all information entered below is accurate and complete,
            as outlined in the terms of service.
          </p>
          <form @submit.prevent="onFormSubmit" class="signup-form">
            <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
            
            <!-- Input Fields -->
            <div class="input-group">
              <div class="form-row">
                <input
                  class="form-input"
                  v-model="formData.email"
                  type="email"
                  placeholder="Email Address *"
                  required
                />
                <input
                  class="form-input"
                  v-model="formData.password"
                  type="password"
                  placeholder="Password *"
                  required
                />
              </div>

              <div class="form-row">
                <input
                  class="form-input"
                  v-model="formData.firstName"
                  type="text"
                  placeholder="Legal First Name *"
                  required
                />
                <input
                  class="form-input"
                  v-model="formData.lastName"
                  type="text"
                  placeholder="Legal Last Name *"
                  required
                />
              </div>

              <div class="form-row">
                <input
                  class="form-input"
                  v-model="formData.careerField"
                  type="text"
                  placeholder="Career Field/Industry (Optional)"
                />
                <input
                  class="form-input"
                  v-model="formData.dateOfBirth"
                  type="date"
                  placeholder="Date of Birth *"
                  required
                />
              </div>
            </div>

            <!-- Checkboxes -->
            <div class="checkbox-group">
              <div class="form-checkbox">
                <input 
                  type="checkbox" 
                  v-model="formData.agreeToTerms" 
                  id="agreeToTerms" 
                  required
                />
                <label for="agreeToTerms">
                  I hereby acknowledge that I have read and agree with the Append
                  privacy policy and terms of service. *
                </label>
              </div>
              <div class="form-checkbox">
                <input 
                  type="checkbox" 
                  v-model="formData.receiveEmails" 
                  id="receiveEmails"
                />
                <label for="receiveEmails">
                  I would like to receive emails from Append that may include
                  promotions, updates, and sponsorships.
                </label>
              </div>
            </div>

            <div class="buttons-container">
              <!-- Sign Up Button -->
              <button 
                id="create-account-button" 
                type="submit" 
                :disabled="loading || !formData.agreeToTerms"
                class="primary-button"
              >
                <span v-if="loading">Loading...</span>
                <span v-else>Create Account</span>
              </button>

              <!-- Or Divider -->
              <div class="or-divider">
                <div class="line"></div>
                <span>Or</span>
                <div class="line"></div>
              </div>

              <!-- Updated Google Sign In container -->
              <div class="google-button-container">
                <div class="google-button-placeholder" v-if="!googleLoaded"></div>
                <div 
                  id="google-signin-btn" 
                  :class="{ 'visible': googleLoaded }"
                ></div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.main-content {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease, transform 0.5s ease;
  z-index: 10;
}

.main-content.loaded {
  opacity: 1;
  transform: translateY(0);
}

#setup-title {
  color: #000;
  font-size: 24px;
  margin-bottom: 15px;
  margin-top: 0; /* Remove negative margin */
  font-weight: 500;
  text-align: center;
}

.sign-up-root {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.sign-up-page {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.form-container {
  width: 40%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 20;
  margin-top: 45px; /* Changed from -40px to 0px to move it down */
  display: flex;
  flex-direction: column;
  align-items: center;
}

nav {
  position: fixed;
  top: 10px;
  left: 0.25%;
  right: 1%;
  width: 98%;
  z-index: 30;
}

/* If you need scrollbar styling for the form container */
.form-container::-webkit-scrollbar {
  width: 8px;
}

.form-container::-webkit-scrollbar-track {
  background: transparent;
}

.form-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.form-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* Add styles for the particles background */
:deep(#particles-background) {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

nav {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 300; /* Ensure nav stays above everything */
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: fixed;
  top: 10px;
  left: 0.25%;
  right: 1%;
  width: 98%;
  border-style: solid;
  border-width: 1px;
  border-radius: 5px;
  padding: 10px;
  z-index: 1000;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  background-color: rgba(255, 255, 255, 0.5);
  border-color: black;
  height: 35px;
}

.logo-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: opacity 0.2s ease;
  height: 35px;
}

.Logo {
  height: 100%;
  width: auto;
  object-fit: contain;
  filter: brightness(0); /* Makes logo black */
}

.logo-container:hover {
  opacity: 0.7;
}

.nav-link {
  text-decoration: none;
  position: relative;
  font-weight: 300;
}

.nav-link::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 1px;
  bottom: -2px;
  left: 0;
  background-color: #000;
  transform: scaleX(0);
  transform-origin: bottom right;
  transition: transform 0.3s ease;
}

.nav-link:hover::after {
  transform: scaleX(1);
  transform-origin: bottom left;
}

.nav-right {
  margin-left: auto;
  padding-right: 10px;
}

/* Keep exactly the same nav-element styles as SignIn */
.nav-element {
  font-size: 16px;
  color: #000;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

/* Page transition animations */
.fade-in {
  animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  will-change: transform, opacity;
}

.fade-out {
  animation: fadeOut 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
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

@keyframes fadeOut {
  from {
    opacity: 1;
    transform: translateY(0) translateZ(0);
  }
  to {
    opacity: 0;
    transform: translateY(-20px) translateZ(0);
  }
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 25px;
}

.form-row {
  display: flex;
  gap: 15px;
  width: 100%;
}

.form-input {
  flex: 1;
  height: 30px;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #545454;
  border-radius: 8px;
  transition: border-color 0.2s ease;
  position: relative;
  z-index: 300;
  background-color: rgba(255, 255, 255, 0.9);
}

h1 {
  color: #000;
  font-size: 24px;
  margin-bottom: 15px;
  font-weight: 500;
}

.setup-description {
  margin-bottom: 25px;
  color: #666;
  font-size: 14px;
  text-align: center; /* Add this for consistency */
}

.buttons-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 300;
}

.primary-button {
  width: 55%;
  height: 40px;
  background-color: var(--blue-gray);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.or-divider {
  width: 55%;
  display: flex;
  align-items: center;
  margin: 20px 0;
}

.or-divider .line {
  flex: 1;
  height: 1px;
  background-color: #000;
}

.or-divider span {
  padding: 0 15px;
  color: #000;
  font-size: 14px;
}

.google-button-container {
  position: relative;
  height: 40px;
  margin: 10px 0;
  width: 300px; /* Fixed width to match Google button */
}

.google-button-placeholder {
  width: 100%;
  height: 100%;
  background: #f0f0f0;
  border-radius: 4px;
  opacity: 0.6;
}

#google-signin-btn {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.2s ease; /* Faster transition */
}

#google-signin-btn.visible {
  opacity: 1;
}

/* Optional: Add a smoother placeholder animation */
@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 0.8; }
  100% { opacity: 0.6; }
}

.google-button-placeholder {
  animation: pulse 1.5s infinite;
}

.checkbox-group {
  margin: 20px 0;
  position: relative;
  z-index: 300;
}

.form-checkbox {
  text-align: left;
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.form-checkbox label {
  font-size: 13px;
  line-height: 1.4;
  color: #444;
}

/* Ensure no overflow */
.sign-in-page {
  min-height: 100vh;
  padding: 0 20px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

/* Date input specific styling */
input[type="date"] {
  flex: 1;
  padding: 8px 12px;
  appearance: none;
  -webkit-appearance: none;
  background-color: white;
}

input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
}

/* Error message styling */
.error-message {
  color: var(--error);
  font-size: 13px;
  margin: 8px 0;
}
</style>
