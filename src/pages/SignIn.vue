<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from '../stores/user';
import api from "@/api";
import BlueGrayButton from "@/comps/BlueGrayButton.vue";
import PopupModal from "@/comps/SignInModal.vue";
import { 
  generateDeviceId, 
  generateSimpleDeviceId, 
  storeDeviceId, 
  getStoredDeviceId 
} from '@/utils/device';

const router = useRouter();
const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");
const showPopup = ref(false);
const userStore = useUserStore();

// Initialize Google Sign-In
const initializeGoogleAuth = async () => {
  console.log('Initializing Google Auth...');
  
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    console.error('Google Client ID not found in environment variables');
    return;
  }

  try {
    // Wait for the Google API to load
    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = resolve;
      document.head.appendChild(script);
    });

    // Initialize Google Sign-In
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    // Render the button
    window.google.accounts.id.renderButton(
      document.getElementById('googleSignInDiv'),
      { theme: 'outline', size: 'large', width: 250 }
    );

    console.log('Google Auth initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Google Auth:', error);
  }
};

const handleCredentialResponse = async (response) => {
  try {
    loading.value = true;
    error.value = '';
    
    // Generate a simple device ID synchronously
    const deviceId = generateSimpleDeviceId(); // Use the synchronous version
    storeDeviceId(deviceId);

    console.log('Sending request with:', {
      id_token: response.credential,
      deviceId: deviceId
    });

    const res = await api.post('/api/auth/google-login', {
      id_token: response.credential,
      deviceId: deviceId
    });

    console.log('Server response:', res.data);

    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      
      if (res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        userStore.setUser(res.data.user);
      }

      if (res.data.requiresDeviceRegistration) {
        router.push({ name: "DeviceRegister" });
      } else {
        router.push({ name: "AppList" });
      }
    }
  } catch (error) {
    console.error("Authentication error:", error);
    if (error.response) {
      console.error("Server error details:", error.response.data);
    }
    error.value = error.response?.data?.error || "Authentication failed. Please try again.";
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  console.log('SignIn component mounted');
  initializeGoogleAuth();
});

const handleSuccessfulLogin = (response) => {
  localStorage.setItem('token', response.data.token);
  
  if (response.data.user) {
    localStorage.setItem('user', JSON.stringify(response.data.user));
    userStore.setUser(response.data.user);
  }

  // Don't set deviceId here - let device registration handle it
  if (response.data.requiresDeviceRegistration) {
    router.push('/device-register');
  } else {
    const deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      router.push('/device-register');
    } else {
      router.push('/app-list');
    }
  }
};

const onSignIn = async () => {
  try {
    loading.value = true;
    error.value = '';
    
    const response = await api.post('/api/auth/login', {
      email: email.value,
      password: password.value
    });

    handleSuccessfulLogin(response);
  } catch (error) {
    handleAuthError(error);
  } finally {
    loading.value = false;
  }
};

const handleAuthError = (err) => {
  console.error("Authentication error:", err);
  
  if (err.response) {
    switch (err.response.status) {
      case 400:
        error.value = "Invalid request format";
        break;
      case 401:
        error.value = "Invalid email or password";
        break;
      case 404:
        error.value = "User not found";
        break;
      case 500:
        error.value = "Server error. Please try again later";
        break;
      default:
        error.value = "An error occurred. Please try again.";
    }
  } else {
    error.value = "Network error. Please check your connection";
  }
};

const onSignUp = () => {
  router.push({ name: "SignUp" });
};
</script>

<template>
  <img src="../assets/ScracthyWallpaper.png" class="wallpaper" />
  <nav>
    <img class="Logo" src="@/assets/logo.svg" alt="append logo" width="40px" />
    <div class="nav-element" id="nav-center"></div>
    <span class="nav-element-container">
      <div class="dropdown-actuator">
        <span @click="onSignUp" class="nav-element" id="sign-up">
          Sign Up
        </span>
      </div>
    </span>
  </nav>

  <div class="sign-in-page">
    <div class="sign-in-container">
      <h1>Sign In</h1>
      <p>Sign in using your email or password</p>
      
      <div v-if="error" class="error-message">{{ error }}</div>
      
      <label class="input-label">
        <input
          type="text"
          v-model="email"
          id="email-input"
          class="sign-in-input"
          placeholder="Email"
          @keyup.enter="onSignIn"
        />
      </label>
      <label class="input-label">
        <input
          type="password"
          v-model="password"
          id="password-input"
          class="sign-in-input"
          placeholder="Password"
          @keyup.enter="onSignIn"
        />
      </label>
      
      <BlueGrayButton 
        id="sign-in-button" 
        @click="onSignIn"
        :disabled="loading"
      >
        {{ loading ? 'Signing In...' : 'Sign In' }}
      </BlueGrayButton>
      
      <div class="or">
        <img src="/src/assets/Line.svg" alt="line" />
        <p>Or</p>
        <img src="/src/assets/Line.svg" alt="line" />
      </div>
      
      <div id="googleSignInDiv" class="google-sign-in-button"></div>
    </div>
    
    <PopupModal
      v-if="showPopup"
      title="Account Issue"
      message="Account does not exist. Please create an account first."
      @close="showPopup = false"
    />
  </div>
</template>


<style scoped>
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

.wallpaper {
  width: 100%;
  height: 100vh;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

#sign-up {
  cursor: pointer;
  margin-left: 89vw;
}

/* Basic styling for nav */
.nav-element-container {
  display: block;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
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

.nav-element:hover {
  text-decoration: underline;
  text-decoration-color: #000f;
}

nav {
  display: flex;
  align-items: center;
  position: fixed;
  top: 10px;
  left: 0.25%;
  right: 1%;
  width: 98%;
  border-radius: 8px;
  padding: 10px;
  box-shadow: #0000003b 0px 4px 4px;
  z-index: 10000;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.5);
}

.Logo {
  width: 40px;
}

.sign-in-page {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.sign-in-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 650px;
  padding-left: 55px;
  padding-right: 55px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.5);
  position: absolute;
  top: 10vh;
  left: calc(calc(100vw - 410px) / 2);
}

.sign-in-input {
  height: 20px;
  border-radius: 5px;
  border: 1px solid black;
  margin-top: 10px;
  padding: 10px;
  font-weight: bold;
  width: 280px;
}

.sign-in-input:focus {
  outline: none;
}

#sign-in-button {
  height: 40px;
  margin-top: 30px;
  width: 300px;
  font-size: 16px;
  padding: 10px;
  background-color: var(--blue-gray);
  border-radius: 4px;
  color: white;
  border: none;
  z-index: 100000 !important;
}

#sign-in-button:hover {
  background-color: var(--dark-blue);
  transition-duration: 0.1s;
  z-index: 1000;
}

.input-label {
  display: block;
  width: 300px;
  margin-bottom: 10px;
}

.or {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px 0;
}

.or img {
  width: 100px;
}

.or p {
  margin: 0 10px;
}

.passport-sign-in {
  margin-top: 10px;
  width: 300px;
  border-radius: 5px;
  border: 1px solid black;
  font-size: 16px;
  padding: 10px;
  background-size: 25px;
  background-repeat: no-repeat;
  background-position-x: 40px;
  background-position-y: center;
}

#google-sign-in {
  background-image: url("/src/assets/GoogleLogo.svg");
}

.passport-sign-in:active {
  background-color: #d5d5d5;
  transform: scale(0.98);
  transition-duration: 0.08s;
}

.sign-in-page-full {
  animation: fade-in 6s forwards;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.google-sign-in-button {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.error-message {
  color: red;
  margin-top: 10px;
  text-align: center;
}
</style>
