<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import api from '@/api';
import { generateDeviceId, storeDeviceId } from '@/utils/device';
import BlueGrayButton from "@/comps/BlueGrayButton.vue";
import PricingBackground from '@/comps/PricingBackground.vue';
import PopupModal from '@/comps/SignInModal.vue';
import Navbar from '@/comps/Navbar/Navbar.vue';

let theme = ref('light');
function toggleTheme(newTheme) {
  theme.value = newTheme;
}

const router = useRouter();
const userStore = useUserStore();
const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");
const showPopup = ref(false);
const googleSignInBtn = ref(null);

const onSignIn = async () => {
  if (!email.value || !password.value) {
    error.value = "Please fill in all fields";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const deviceId = generateDeviceId();
    storeDeviceId(deviceId);

    const response = await api.post("/api/auth/login", {
      email: email.value,
      password: password.value,
      deviceId: deviceId
    });

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        userStore.setUser(response.data.user);
      }

      if (response.data.requiresDeviceRegistration) {
        router.push({ name: "DeviceRegister" });
      } else {
        router.push({ name: "AppList" });
      }
    }
  } catch (error) {
    console.error("Sign-in error:", error);
    if (error.response?.status === 404) {
      showPopup.value = true;
    } else {
      error.value = error.response?.data?.error || "Authentication failed";
    }
  } finally {
    loading.value = false;
  }
};

const initializeGoogleAuth = async () => {
  try {
    await new Promise((resolve) => {
      if (window.google) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      document.head.appendChild(script);
    });

    await new Promise((resolve) => {
      const checkButton = () => {
        const buttonElement = document.getElementById("googleSignInDiv");
        if (buttonElement) {
          resolve();
        } else {
          setTimeout(checkButton, 100);
        }
      };
      checkButton();
    });

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse
    });

    window.google.accounts.id.renderButton(
      document.getElementById("googleSignInDiv"),
      { 
        theme: "filled_black", 
        size: "large", 
        width: "300",
        text: "signin_with",
        shape: "rectangular"
      }
    );
  } catch (error) {
    console.error("Failed to initialize Google Auth:", error);
    error.value = "Failed to initialize Google Sign-In";
  }
};

const handleCredentialResponse = async (response) => {
  try {
    loading.value = true; // Add loading state
    const deviceId = generateDeviceId();
    
    if (!deviceId) {
      throw new Error("Failed to generate device ID");
    }
    
    storeDeviceId(deviceId);

    const res = await api.post("/api/auth/google-login", {
      id_token: response.credential,
      deviceId: deviceId.toString() // Ensure deviceId is a string
    });

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
    console.error("Google sign-in error:", error);
    error.value = error.response?.data?.value || error.response?.data?.error || "Google sign-in failed";
  } finally {
    loading.value = false;
  }
};

const onSignUp = () => {
  router.push({ name: "SignUp" });
};

onMounted(() => {
  setTimeout(() => {
    initializeGoogleAuth();
  }, 100);
});
</script>

<template>
  <div class="sign-in-wrapper">
    <PricingBackground styleType="particles" />
    
    <!-- Move nav outside of main-content to match SignUp -->
    <nav>
      <div class="logo-container" @click="router.push('/')">
        <img class="Logo" src="@/assets/logo.svg" alt="append logo" />
      </div>
      <div class="nav-element" id="nav-center"></div>
      <div class="nav-right">
        <span class="nav-element nav-link" id="sign-up" @click="onSignUp">
          Sign Up
        </span>
      </div>
    </nav>
    
    <main class="main-content">
      <div class="sign-in-container">
        <h1 id="setup-title">Sign In</h1>
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
          <div class="line"></div>
          <p>Or</p>
          <div class="line"></div>
        </div>
        
        <div id="googleSignInDiv" ref="googleSignInBtn" class="google-sign-in-button"></div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.sign-in-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
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
}

.sign-in-container {
  width: 35%;
  max-width: 500px;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.sign-in-container h1 {
  width: 100%;
  text-align: center;
  margin: 0 0 10px 0;
  font-size: 24px;
}

/* OR divider styling */
.or {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 45px auto;
  width: 300px;
  gap: 10px;
  align-self: center;
}

.line {
  flex: 1;
  height: 1px;
  background-color: black;
  display: block;
  min-width: 100px;
}

.or p {
  margin: 0;
  color: black;
  font-size: 14px;
  padding: 0 10px;
  white-space: nowrap;
}

.google-sign-in-button {
  width: 300px;
  margin: 0 auto;
  min-height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Error message styling */
.error-message {
  color: red;
  margin-bottom: 15px;
  width: 100%;
  text-align: center;
}

/* Input styling */
.input-label {
  display: block;
  width: 100%;
  margin-bottom: 15px;
}

.sign-in-input {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  transition: border-color 0.2s ease;
}

.sign-in-input:focus {
  outline: none;
  border-color: #4F46E5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
}

#sign-in-button {
  width: 100%;
  margin: 10px 0;
  height: 40px;
}

@media (max-width: 768px) {
  .sign-in-container {
    width: 90%;
    padding: 30px;
  }
}
</style>
