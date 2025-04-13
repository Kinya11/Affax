<script setup>
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import api from '@/api';
import { useToast } from 'vue-toastification';
import { generateDeviceId, storeDeviceId, getStoredDeviceId } from '@/utils/device';
import PricingBackground from '@/comps/PricingBackground.vue';

const router = useRouter();
const toast = useToast();
const pageVisible = ref(false);

const onSignIn = () => {
  pageVisible.value = false;
  router.push({ name: "SignIn" });
};

onMounted(() => {
  setTimeout(() => {
    pageVisible.value = true;
  }, 0);
});

// Form data with validation states
const formData = reactive({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  careerField: "",
  dateOfBirth: "",
  agreeToTerms: false,
  receiveEmails: false
});

const validation = reactive({
  isEmailValid: false,
  isPasswordValid: false
});

const loading = ref(false);
const errorMessage = ref("");

// Password validation computed properties
const hasMinLength = computed(() => formData.password.length >= 8);
const hasNumber = computed(() => /\d/.test(formData.password));
const hasSpecialChar = computed(() => /[!@#$%^&*]/.test(formData.password));
const hasUpperCase = computed(() => /[A-Z]/.test(formData.password));

const showPasswordRequirements = ref(false);

// Enhanced validation
const validateForm = () => {
  errorMessage.value = "";
  
  // Email validation with better regex
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  validation.isEmailValid = emailRegex.test(formData.email);

  // Password validation (min 8 chars, 1 number, 1 special char, 1 uppercase)
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  validation.isPasswordValid = passwordRegex.test(formData.password);

  // Age validation (minimum 13 years old)
  if (formData.dateOfBirth) {
    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    validation.isAdult = age > 13 || (age === 13 && monthDiff >= 0);
  }

  if (!validation.isEmailValid) {
    errorMessage.value = "Please enter a valid email address";
    return false;
  }

  if (!validation.isPasswordValid) {
    errorMessage.value = "Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character";
    return false;
  }

  if (!validation.isAdult) {
    errorMessage.value = "You must be at least 13 years old to register";
    return false;
  }

  if (!formData.agreeToTerms) {
    errorMessage.value = "You must agree to the terms and conditions";
    return false;
  }

  return true;
};

const onFormSubmit = async () => {
  if (!validateForm()) {
    errorMessage.value = "Please fix validation errors";
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const deviceId = getStoredDeviceId() || generateDeviceId();
    storeDeviceId(deviceId);

    const response = await api.post("/api/auth/register", {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      careerField: formData.careerField,
      receiveEmails: formData.receiveEmails,
      deviceId
    });

    // Auto-login after successful registration
    const loginResponse = await api.post("/api/auth/login", {
      email: formData.email,
      password: formData.password,
      deviceId
    });

    localStorage.setItem("token", loginResponse.data.token);
    toast.success("Registration successful! Redirecting...");
    
    // Redirect to device registration if needed
    if (loginResponse.data.requiresDeviceRegistration) {
      router.push({ name: "DeviceRegister" });
    } else {
      router.push({ name: "AppList" });
    }

  } catch (error) {
    console.error("Registration error:", error);
    handleRegistrationError(error);
  } finally {
    loading.value = false;
  }
};

// Enhanced error handling
const handleRegistrationError = (error) => {
  const errorMap = {
    "EMAIL_EXISTS": "This email is already registered",
    "INVALID_BIRTHDATE": "You must be at least 13 years old",
    "WEAK_PASSWORD": "Password must contain at least 8 characters, one number, and one special character",
    "TERMS_NOT_ACCEPTED": "You must accept the terms and conditions"
  };

  const serverErrorCode = error.response?.data?.errorCode;
  errorMessage.value = errorMap[serverErrorCode] || 
                      error.response?.data?.error || 
                      "Registration failed. Please try again.";
};

// Google Sign-In with device ID
const handleCredentialResponse = async (response) => {
  try {
    const deviceId = generateDeviceId();
    storeDeviceId(deviceId); // Make sure this is called before the API request

    const res = await api.post("/api/auth/google-login", {
      id_token: response.credential,
      deviceId: deviceId // Make sure deviceId is included in the request
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

      const buttonElement = document.getElementById("google-signin-btn");
      if (buttonElement) {
        window.google.accounts.id.renderButton(buttonElement, { 
          theme: "filled_black", 
          size: "large",
          width: 300,
          text: "continue_with",
          logo_alignment: "center"
        });
      }
    }
  } catch (error) {
    console.error("Google Sign-In initialization failed:", error);
    errorMessage.value = "Google Sign-In is currently unavailable";
  }
};

onMounted(() => {
  initializeGoogleSignIn();
});
</script>

<template>
  <div class="sign-up-wrapper">
    <PricingBackground styleType="particles">
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
      <div class="sign-up-page" :class="{ 'fade-in': pageVisible, 'fade-out': !pageVisible }">
        <div class="form-container">
          <h1 id="setup-title">Create Your Account</h1>
          <p class="setup-description">
            Please make sure all information entered below is accurate and complete,
            as outlined in the terms of service.
          </p>
          <form @submit.prevent="onFormSubmit">
            <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
            
            <!-- Input Fields -->
            <div class="input-group">
              <div class="form-row">
                <input
                  class="form-input"
                  v-model="formData.email"
                  type="email"
                  placeholder="Email Address"
                  required
                />
                <input
                  class="form-input"
                  v-model="formData.password"
                  type="password"
                  placeholder="Password"
                  required
                  @focus="showPasswordRequirements = true"
                  @blur="showPasswordRequirements = false"
                />
              </div>

              <div class="form-row">
                <input
                  class="form-input"
                  v-model="formData.firstName"
                  type="text"
                  placeholder="Legal First Name"
                  required
                />
                <input
                  class="form-input"
                  v-model="formData.lastName"
                  type="text"
                  placeholder="Legal Last Name"
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
                  placeholder="Date of Birth"
                  required
                />
              </div>
            </div>

            <!-- Checkboxes -->
            <div class="checkbox-group">
              <div class="form-checkbox">
                <input type="checkbox" v-model="formData.agreeToTerms" id="agreeToTerms" />
                <label for="agreeToTerms">
                  I hereby acknowledge that I have read and agree with the Append
                  privacy policy and terms of service.
                </label>
              </div>
              <div class="form-checkbox">
                <input type="checkbox" v-model="formData.receiveEmails" id="receiveEmails" />
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
                :disabled="loading"
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

              <!-- Google Sign In -->
              <div id="google-signin-btn" class="google-button-container"></div>
            </div>
          </form>
        </div>
      </div>
    </PricingBackground>
  </div>
</template>

<style scoped>
.sign-up-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.sign-up-page {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 20px;
  position: relative;
  z-index: 15;
  overflow: hidden;
}

nav {
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

.form-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 40%;
  height: auto;
  min-height: fit-content;
  padding: 2.5rem;
  margin: 0 auto;
  margin-top: 115px;
  margin-bottom: 40px;
  padding-top: 10px;
  padding-bottom: 40px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 200;
  text-align: center;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
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
  width: 300px;
  margin: 0 auto;
  min-height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
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
