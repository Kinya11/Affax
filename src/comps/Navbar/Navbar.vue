<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import NavbarElement from "./NavbarElement.vue";
import ThemeToggleSwitch from "./ThemeToggleSwitch.vue";
import auth from '@/api/auth';
import api from '@/api';
import { useToast } from 'vue-toastification';

const router = useRouter();
const userStore = useUserStore();
const lists = ref([]);
const toast = useToast();
const isUpgradeLoading = ref(false);
const subscriptionStatus = ref(null);
const route = useRoute();

// Add this function to fetch lists
async function fetchLists() {
  try {
    const response = await api.get("/api/lists");
    lists.value = response.data;
  } catch (error) {
    console.error('Failed to fetch lists:', error);
  }
}

// Set up polling for list updates
const startListPolling = () => {
  // Initial fetch
  fetchLists();
  
  // Poll every 5 seconds instead of 2
  const interval = setInterval(fetchLists, 5000);
  
  // Clean up on component unmount
  onBeforeUnmount(() => {
    clearInterval(interval);
  });
};

// Listen for custom events that should trigger list refresh
const setupListUpdateListeners = () => {
  window.addEventListener('list-updated', fetchLists);
  window.addEventListener('list-created', fetchLists);
  window.addEventListener('list-deleted', fetchLists);
  
  // Clean up listeners on unmount
  onBeforeUnmount(() => {
    window.removeEventListener('list-updated', fetchLists);
    window.removeEventListener('list-created', fetchLists);
    window.removeEventListener('list-deleted', fetchLists);
  });
};

// Add this function to handle subscription checks
async function checkSubscription() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await api.get('/api/subscription');
    return response.data;
  } catch (error) {
    console.error('Failed to check subscription:', error);
    // Return default free plan for development
    if (import.meta.env.MODE === 'development') {
      return {
        currentPlan: {
          name: 'free',
          limits: {
            maxLists: 3,
            maxAppsPerList: 5
          }
        },
        availableSeats: 1,
        usedSeats: 1
      };
    }
    return null;
  }
}

onMounted(async () => {
  startListPolling();
  setupListUpdateListeners();
  
  // Preload subscription status
  subscriptionStatus.value = await checkSubscription();
});

// Add this function to handle list click
const handleListClick = (listId) => {
  // Navigate to app-list and trigger list expansion
  router.push({
    path: '/app-list',
    query: { expandList: listId }
  });
  
  // Dispatch custom event to expand the list
  window.dispatchEvent(new CustomEvent('expand-list', {
    detail: { listId, shouldScroll: true }
  }));
};

// Add function to handle logo click
const handleLogoClick = () => {
  // Only navigate if user is logged in
  const token = localStorage.getItem('token');
  if (token) {
    router.push('/app-list');
  }
};

// Track dropdown states
const isOrgDropdownOpen = ref(false);
const isListsDropdownOpen = ref(false);
const isAccountDropdownOpen = ref(false);
const emit = defineEmits(['toggled']);


// Handle hover effect for dropdowns
function onHover(id) {
  const arrow = document.getElementById(`${id}-arrow`);
  if (arrow) {
    arrow.classList.add("rotated");
  }

  if (id === "orgs") isOrgDropdownOpen.value = true;
  if (id === "lists") isListsDropdownOpen.value = true;
  if (id === "account") isAccountDropdownOpen.value = true;
}

const logout = async () => {
  try {
    await auth.logout();
    userStore.clearUser(); // Clear Pinia store
    await router.push('/sign-in');
  } catch (error) {
    console.error('Logout failed:', error);
    // Even if logout fails, ensure user is redirected to sign-in
    userStore.clearUser();
    await router.push('/sign-in');
  }
};

function onLeave(id) {
  const arrow = document.getElementById(`${id}-arrow`);
  if (arrow) {
    arrow.classList.remove("rotated");
  }

  if (id === "orgs") isOrgDropdownOpen.value = false;
  if (id === "lists") isListsDropdownOpen.value = false;
  if (id === "account") isAccountDropdownOpen.value = false;
}

// Theme management
let theme = ref(route.path === "/pricing-page" ? "light" : "dark");
let arrowSrc = ref("/src/assets/Arrow_Black.svg");
let logoSrc = ref("/src/assets/LogoDark.svg");

watch(
  () => route.path,
  (newPath) => {
    if (newPath === "/pricing-page") {
      theme.value = "light";
    }
  }
);

watch(theme, (newTheme) => {
  emit("toggled", theme.value);
  if (newTheme === "dark") {
    document.body.classList.add("dark");
    document.body.classList.remove("light");
    arrowSrc.value = "/src/assets/Arrow_White.svg";
    logoSrc.value = "/src/assets/LogoLight.svg";

  } else {
    document.body.classList.add("light");
    document.body.classList.remove("dark");
    arrowSrc.value = "/src/assets/Arrow_Black.svg";
    logoSrc.value = "/src/assets/LogoDark.svg";
  }
});

// Method to update the theme
function toggleTheme(newTheme) {
  theme.value = newTheme;
  emit('toggled', newTheme);
}

// Add function to handle upgrade click
const handleUpgradeClick = async () => {
  if (isUpgradeLoading.value) return;
  
  try {
    isUpgradeLoading.value = true;
    
    // For development, allow direct navigation
    if (import.meta.env.MODE === 'development') {
      router.push('/pricing-page');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/sign-in');
      return;
    }

    // Check subscription status
    const status = await checkSubscription();
    if (status?.currentPlan?.name !== 'free') {
      toast.info('You are already on a paid plan!');
      return;
    }

    router.push('/pricing-page');
  } catch (error) {
    console.error('Failed to check subscription:', error);
    // Always allow navigation to pricing page
    router.push('/pricing-page');
  } finally {
    isUpgradeLoading.value = false;
  }
};
</script>

<template>
  <nav class="navbar" :class="theme">
    <div class="logo-container" @click="handleLogoClick">
      <img :src="logoSrc" alt="Logo" class="logo" />
    </div>
    <div class="nav-element" id="nav-center">
      <!-- Removed Organizations dropdown -->
      <span
        :class="['nav-element-container', theme]"
        @mouseover="onHover('lists')"
        @mouseleave="onLeave('lists')"
      >
        <div class="dropdown-actuator">
          <span :class="['nav-element', theme]">Lists</span>
          <img
            class="Arrow"
            :src="arrowSrc"
            alt="arrow"
            width="10px"
            id="lists-arrow"
          />
        </div>
        <div
          :class="['nav-dropdown', theme, { show: isListsDropdownOpen }]"
          id="lists"
        >
          <div v-if="lists.length === 0" :class="['router-link', theme]">
            <NavbarElement :theme="theme" :arrowSrc="arrowSrc">
              No lists
            </NavbarElement>
          </div>
          <div
            v-else
            v-for="list in lists" 
            :key="list.id"
            :class="['router-link', theme]"
            @click="handleListClick(list.id)"
          >
            <NavbarElement :theme="theme" :arrowSrc="arrowSrc">
              {{ list.name }}
            </NavbarElement>
          </div>
        </div>
      </span>
    </div>
    <span
      class="nav-element-container"
      @mouseover="onHover('account')"
      @mouseleave="onLeave('account')"
    >
      <div class="dropdown-actuator">
        <span class="nav-element">
          <img
            id="user-profile-picture"
            src="@/assets/user.png"
            alt="Profile Picture"
          />
        </span>
        <img
          class="Arrow"
          :src="arrowSrc"
          alt="arrow"
          width="10px"
          id="account-arrow"
        />
      </div>
      <div
        :class="['nav-dropdown', theme, { show: isAccountDropdownOpen }]"
        id="account"
        style="margin-left: -120px !important"
      >
        <div id="theme-toggle-container">
          <span>Theme:</span>
          <ThemeToggleSwitch @toggled="toggleTheme" />
        </div>
        <router-link to="/settings">
          <NavbarElement :theme="theme" :arrowSrc="arrowSrc">
            Settings
          </NavbarElement>
        </router-link>
        <router-link to="/devices">
          <NavbarElement :theme="theme" :arrowSrc="arrowSrc">
            Devices
          </NavbarElement>
        </router-link>
        <router-link to="/app-database-management">
          <NavbarElement :theme="theme" :arrowSrc="arrowSrc">
            Manage Database
          </NavbarElement>
        </router-link>
        <div @click="handleUpgradeClick">
          <NavbarElement :theme="theme" :arrowSrc="arrowSrc">
            <div class="upgrade-button-content">
              <span>Upgrade</span>
              <div v-if="isUpgradeLoading" class="spinner"></div>
            </div>
          </NavbarElement>
        </div>
        <router-link to="/sign-in">
          <NavbarElement @click="logout" id="logoutbutton" :theme="theme" :arrowSrc="arrowSrc">
            Log out
          </NavbarElement>
        </router-link>
      </div>
    </span>
    <!-- Removing the standalone Devices link that was here -->
  </nav>
</template>

<style scoped>
/* Handle arrow rotation */
.rotated {
  transform: rotate(180deg);
}

.dropdown-actuator {
  display: flex;
}

.nav-dropdown {
  transform: scaleY(0);
  transform-origin: top;
  position: absolute;
  margin-top: 5px;
  overflow: hidden;
  border-style: solid;
  border-width: 0px;
  border-radius: 4px;
  transition-duration: var(--standard-animation-duration);
  opacity: 0;
  font-size: 1.1rem;
  height: fit-content;
  margin-left: -55px;
  padding-right: 20px;
  padding-left: 20px;
  justify-content: left;
  padding-top: 10px;
  padding-bottom: 5px;
  width: calc(fit-content + 10vw);
}

.nav-dropdown.dark {
  background-color: var(--second-layer-dark);
  color: var(--text-color-dark);
  text-decoration: underline;
  text-decoration-color: white;
  border-color: var(--third-layer-dark);
}

.nav-dropdown.light {
  background-color: white;
  color: var(--text-color-light);
  text-decoration: underline;
  text-decoration-color: black;
  border-color: black;
}

#orgs {
  margin-left: -12px;
}

#account {
  right: 5px;
}

/* Show dropdown when hovered or clicked */
.show {
  transform: scaleY(1);
  opacity: 1;
  border-width: 0.4px;
  box-shadow: #0000003b 0px 4px 4px;
}

#nav-center {
  width: 130px; /* Reduced from 260px */
  margin: auto;
  gap: 75px;
}

.nav-element {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-weight: 300;
  transition-duration: var(--standard-animation-duration);
}

.nav-element.dark {
  color: var(--text-color-dark);
}

.nav-element.light {
  color: var(--text-color-light);
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

.nav-element-container.dark {
  border-bottom-color: white;
}

.nav-element-container.light {
  border-bottom-color: black;
}

.Arrow {
  margin-top: 3px;
  margin-left: 5px;
  transition-duration: 0.4s;
  transition-timing-function: ease;
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
  z-index: 10000;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  font-size: 20px;
  transition-duration: 0.2s;
  transition-timing-function: ease;
}

nav.dark {
  background-color: var(--second-layer-dark);
  border-color: var(--second-layer-dark);
}

nav.light {
  background-color: var(--first-layer-light);
  border-color: black;
}

.Ductape {
  position: fixed;
  top: 0px;
  width: 100vw;
  height: 12px;
  background-color: #fff;
  z-index: 90;
}

.Ductape.dark {
  background-color: white;
}

header {
  display: flex;
  gap: 245px;
  font-size: 18px;
}

#theme-toggle-container {
  height: 2.2rem;
  display: flex;
  align-items: center;
  margin-bottom: 2px;
}

#user-profile-picture {
  width: 30px;
  border-radius: 0; /* Remove border radius */
  border: none; /* Remove border */
}

.logo-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: opacity var(--standard-animation-duration) ease;
  height: 35px; /* Maintain specific height */
}

.logo {
  height: 100%;
  width: auto;
  object-fit: contain;
}

.logo-container:hover {
  opacity: 0.8;
}

.upgrade-button-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
