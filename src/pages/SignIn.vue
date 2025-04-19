<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import api from "@/api";
import { generateDeviceId, storeDeviceId } from "@/utils/device";
import BlueGrayButton from "@/comps/BlueGrayButton.vue";
import PricingBackground from "@/comps/PricingBackground.vue";
import PopupModal from "@/comps/SignInModal.vue";
import Navbar from "@/comps/Navbar/Navbar.vue";

let theme = ref("light");
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
const pageVisible = ref(false);
const errorMessage = ref("");
const googleLoaded = ref(false);
const isLoaded = ref(false);

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
        script.onerror = (e) =>
          reject(new Error("Failed to load Google script"));
        document.head.appendChild(script);
      });

      return;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

const onSignIn = async () => {
  try {
    loading.value = true;
    error.value = "";

    const deviceId = await generateDeviceId();
    console.log("Generated Device ID:", deviceId);

    if (!deviceId) {
      error.value = "Failed to generate device ID";
      return;
    }

    // Store device ID before making the request
    storeDeviceId(deviceId);

    const response = await api.post("/api/auth/login", {
      email: email.value,
      password: password.value,
      deviceId
    });

    console.log("API Login Response:", response.data);

    if (response.data.token) {
      localStorage.setItem("token", response.data.token);

      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
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
    error.value = error.response?.data?.error || "Authentication failed";
    
    if (error.response?.status === 404) {
      showPopup.value = true;
    }
  } finally {
    loading.value = false;
  }
};

const initializeGoogleAuth = async () => {
  try {
    await loadGoogleScript();

    if (!window.google) {
      throw new Error("Google API not loaded");
    }

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    const buttonContainer = document.getElementById("googleSignInDiv");
    if (buttonContainer) {
      window.google.accounts.id.renderButton(buttonContainer, {
        theme: "filled_black",
        size: "large",
        width: 300,
        text: "continue_with",
        shape: "rectangular",
      });
      // Set googleLoaded to true after button is rendered
      googleLoaded.value = true;
    }
  } catch (error) {
    console.error("Failed to initialize Google Auth:", error);
    errorMessage.value = "Failed to initialize Google Sign-In";
  }
};

const handleCredentialResponse = async (response) => {
  try {
    loading.value = true;
    const deviceId = await generateDeviceId();

    if (!deviceId) {
      throw new Error("Failed to generate device ID");
    }

    // Store device ID before making the request
    storeDeviceId(deviceId);

    const res = await api.post("/api/auth/google-login", {
      id_token: response.credential,
      deviceId,
    });

    if (res.data.token) {
      localStorage.setItem("token", res.data.token);

      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        userStore.setUser(res.data.user);
      }

      // Update device ID if server returns a different one
      if (res.data.deviceId && res.data.deviceId !== deviceId) {
        storeDeviceId(res.data.deviceId);
      }

      if (res.data.requiresDeviceRegistration) {
        router.push({ name: "DeviceRegister" });
      } else {
        router.push({ name: "AppList" });
      }
    }
  } catch (error) {
    console.error("Google sign-in error:", {
      message: error.message,
      response: error.response?.data,
      config: {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
      },
    });
    errorMessage.value =
      "Failed to authenticate with Google. Please try again.";
  } finally {
    loading.value = false;
  }
};

const onSignUp = () => {
  router.push({ name: "SignUp" });
};

onMounted(() => {
  setTimeout(() => {
    pageVisible.value = true;
  }, 0);

  // Remove the delay for Google auth initialization
  initializeGoogleAuth();
  setTimeout(() => {
    isLoaded.value = true;
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

    <main :class="{ loaded: isLoaded }" class="main-content">
      <div
        class="sign-in-container"
        :class="{ 'fade-in': pageVisible, 'fade-out': !pageVisible }"
      >
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
          {{ loading ? "Signing In..." : "Sign In" }}
        </BlueGrayButton>

        <div class="or">
          <div class="line"></div>
          <p>Or</p>
          <div class="line"></div>
        </div>

        <!-- Add placeholder for Google button -->
        <div class="google-button-container">
          <div class="google-button-placeholder" v-if="!googleLoaded"></div>
          <div
            id="googleSignInDiv"
            ref="googleSignInBtn"
            :class="{ visible: googleLoaded }"
          ></div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
:deep(#particles-background) {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1; /* Changed to -1 to be behind all content */
}

#setup-title {
  color: #000;
  font-size: 24px;
  margin-bottom: 15px;
  font-weight: 500;
}
.sign-in-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
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
  filter: brightness(0);
}

.logo-container:hover {
  opacity: 0.7;
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
  z-index: 100; /* Increased to 100 to stay above particles but below modal if needed */
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
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease, transform 0.5s ease;
  z-index: 10; /* Added z-index to ensure it's above particles */
}

.main-content.loaded {
  opacity: 1;
  transform: translateY(0);
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
  margin-top: -20px; /* Added to move it up */
}

.sign-in-container h1 {
  width: 100%;
  text-align: center;
  margin: 0 0 5px 0;
  font-size: 24px;
}

.sign-in-container p {
  margin: 0 0 25px 0; /* Reduced margin-bottom from default to 10px */
  color: #666; /* Optional: added to maintain readability */
}

/* OR divider styling */
.or {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 25px auto; /* Reduced from 45px */
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
  margin-bottom: 50px;
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
  border: 1px solid rgba(0, 0, 0, 0.368);
  width: 80%;
  margin-left: 35px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  transition: border-color 0.2s ease;
}

.sign-in-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
}

#sign-in-button,
#sign-in-button :deep(button) {
  width: 70%;
  margin: 15px 0;
  height: 40px !important; /* Increased height and added !important */
  min-height: 40px !important; /* Added min-height to ensure consistency */
  border-radius: 5px;
  z-index: -1;
}

@media (max-width: 768px) {
  .sign-in-container {
    width: 90%;
    padding: 30px;
  }
}

/* Keep exactly the same nav-element styles as SignUp */
.nav-element {
  font-size: 16px;
  color: #000;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.nav-link {
  text-decoration: none;
  position: relative;
  font-weight: 300;
  cursor: pointer;
}

.nav-link::after {
  content: "";
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

.nav-element:hover {
  opacity: 0.7;
}

/* Add these animation classes */
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

/* Add to your existing styles */
.google-button-container {
  position: relative;
  height: 40px; /* Match Google button height */
  margin: 10px 0;
}

.google-button-placeholder {
  width: 300px;
  height: 40px;
  background: #f0f0f0;
  border-radius: 4px;
  animation: pulse 1.5s infinite;
}

#googleSignInDiv {
  opacity: 0;
  transition: opacity 0.3s ease;
}

#googleSignInDiv.visible {
  opacity: 1;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 0.6;
  }
}
</style>
