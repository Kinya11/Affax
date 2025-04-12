<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import api from '@/api';
import { useToast } from 'vue-toastification';
import { generateDeviceId, storeDeviceId, getStoredDeviceId } from '@/utils/device';

const router = useRouter();
const toast = useToast();

// Form data with validation states
const formData = reactive({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  dateOfBirth: "",
  careerField: "",
  agreeToTerms: false,
  receiveEmails: false
});

const validation = reactive({
  isEmailValid: false,
  isPasswordValid: false,
  isAdult: false
});

const loading = ref(false);
const errorMessage = ref("");

// Enhanced validation
const validateForm = () => {
  errorMessage.value = "";

  // Email validation
  validation.isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

  // Password validation (min 8 chars, 1 number, 1 special char)
  validation.isPasswordValid = 
    formData.password.length >= 8 &&
    /\d/.test(formData.password) &&
    /[!@#$%^&*]/.test(formData.password);

  // Age validation (minimum 13 years old)
  if (formData.dateOfBirth) {
    const birthDate = new Date(formData.dateOfBirth);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    validation.isAdult = Math.abs(ageDate.getUTCFullYear() - 1970) >= 13;
  }

  return (
    validation.isEmailValid &&
    validation.isPasswordValid &&
    validation.isAdult &&
    formData.agreeToTerms
  );
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
      dateOfBirth: formData.dateOfBirth,
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
    storeDeviceId(deviceId);

    const res = await api.post("/api/auth/google-login", {
      id_token: response.credential,
      deviceId
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

onMounted(async () => {
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

      window.google.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { 
          theme: "filled_black", 
          size: "large", 
          width: "300",
          logo_alignment: "center"
        }
      );
    }
  } catch (error) {
    console.error("Google Sign-In initialization failed:", error);
    errorMessage.value = "Google Sign-In is currently unavailable";
  }
});
</script>

<template>
  <img src="../assets/PurpleBackground.png" class="wallpaper" />
  <nav>
    <img class="Logo" src="@/assets/logo.svg" alt="append logo" width="40px" />
    <div class="nav-element" id="nav-center"></div>
    <span class="nav-element-container">
      <div class="dropdown-actuator">
        <span class="nav-element" id="sign-in" @click="onSignIn">
          Sign In
        </span>
      </div>
    </span>
  </nav>
  <div class="sign-in-page">
    <div class="form-container">
      <h1>Complete Your Account Setup</h1>
      <p>
        Please make sure all information entered below is accurate and complete,
        as outlined in the terms of service.
      </p>
      <form @submit.prevent="onFormSubmit">
        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
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
            v-model="formData.dateOfBirth"
            type="date"
            placeholder="Date of Birth"
            required
          />
          <input
            class="form-input"
            v-model="formData.careerField"
            type="text"
            placeholder="Career Field/Industry (Optional)"
          />
        </div>
        <div class="form-checkbox">
          <input type="checkbox" v-model="formData.agreeToTerms" id="agreeToTerms" />
          <label for="agreeToTerms"
            >I hereby acknowledge that I have read and agree with the Append
            privacy policy and terms of service.</label
          >
        </div>
        <div class="form-checkbox">
          <input type="checkbox" v-model="formData.receiveEmails" id="receiveEmails" />
          <label for="receiveEmails"
            >I would like to receive emails from Append that may include
            promotions, updates, and sponsorships.</label
          >
        </div>
        <button id="create-account-button" type="submit" :disabled="loading">
          <span v-if="loading">Loading...</span>
          <span v-else>Create Account</span>
        </button>
      </form>
      <div id="google-signin-btn"></div>
    </div>
  </div>
</template>

<style scoped>
.error-message {
  color: red;
  margin-bottom: 15px;
}

#google-signin-btn {
  display: flex;
  margin-top: 20px;
  justify-content: center;
}

.wallpaper {
  width: 100%;
  height: 100vh;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  object-fit: cover;
}

.fade-out {
  animation: fadeOut 0.6s forwards;
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

#sign-in {
  cursor: pointer;
  margin-left: 89.5vw;
}

.form-container {
  width: 50%;
  height: 37vw;
  margin: 100px auto;
  text-align: center;
  margin-left: calc(50% - 25%);
  padding: 20px;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background-color: #ffffff;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.5);
  position: relative; /* Change from fixed to relative */
  border-color: black;
  border-width: 1px;
  border-style: solid;
}

.form-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  gap: 20px;
}

.form-input {
  width: 48%;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.form-checkbox {
  text-align: left;
  margin: 10px;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  color: white;
  background-color: #6c63ff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #5953c3;
}

.nav-dropdown {
  display: none;
}

.sign-up-page {
  height: fit-content;
  overflow: hidden;
}

.nav-element:hover {
  text-decoration: underline;
  text-decoration-color: #000f;
}

.nav-element-container {
  display: block;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  padding-left: 0px;
  padding-right: 0px;
  border-style: solid;
  border-color: transparent;
  border-width: 1px;
  transition-duration: var(--standard-animation-duration);
}

.nav-element {
  display: inline-flex;
  gap: 5px;
  font-weight: 300;
  transition-duration: var(--standard-animation-duration);
  text-decoration: underline;
  text-decoration-color: #0000;
}

nav {
  display: flex;
  align-items: center;
  position: fixed;
  top: 10px;
  left: 0.25%;
  right: 1%;
  width: 98%;
  border-style: solid;
  border-width: 1px;
  border-radius: 5px;
  padding: 10px;
  box-shadow: #0000003b 0px 4px 4px;
  z-index: 10000;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(4px);
  font-size: 20px;
  transition-duration: 0.2s;
  transition-timing-function: ease;
  background-color: rgba(255, 255, 255, 0.5);
  border-color: black;
}

.Logo {
  width: 40px;
}

#create-account-button {
  position: absolute; /* Position the button absolutely within the container */
  bottom: 80px; /* Adjust this value to fine-tune the button's distance from the bottom */
  left: 50%;
  transform: translateX(-50%); /* Center the button horizontally */
  padding: 10px 20px;
  font-size: 16px;
  color: white;
  background-color: #6c63ff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  width: 70%; /* Adjust this to control button width */
}
</style>
