<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useListStore } from '@/stores/listStore';
import { storeToRefs } from 'pinia';
import NavbarElement from "./NavbarElement.vue";
import ThemeToggleSwitch from "./ThemeToggleSwitch.vue";
import auth from '@/api/auth';
import api from '@/api';
import { useToast } from 'vue-toastification';

const router = useRouter();
const userStore = useUserStore();
const listStore = useListStore();
const { lists } = storeToRefs(listStore);
const toast = useToast();
const isUpgradeLoading = ref(false);
const subscriptionStatus = ref(null);
const route = useRoute();

const emit = defineEmits(['toggled']);

// Track dropdown states
const isOrgDropdownOpen = ref(false);
const isListsDropdownOpen = ref(false);
const isAccountDropdownOpen = ref(false);

// Theme management - set based on mode
const theme = ref(import.meta.env.MODE === 'development' ? 'dark' : 'light');
const arrowSrc = ref(theme.value === 'dark' ? "/src/assets/Arrow_White.svg" : "/src/assets/Arrow_Black.svg");
const logoSrc = ref(theme.value === 'dark' ? "/src/assets/LogoLight.svg" : "/src/assets/LogoDark.svg");

// Force light theme on pricing page
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

// Add this function to fetch lists
const fetchLists = async () => {
  try {
    await listStore.fetchLists();
  } catch (error) {
    console.error('Failed to fetch lists:', error);
  }
};

onMounted(async () => {
  // Existing theme initialization
  const initialTheme = import.meta.env.MODE === 'development' ? 'dark' : 'light';
  theme.value = initialTheme;
  emit("toggled", initialTheme);
  
  // Fetch lists
  await fetchLists();
  
  // Add event listeners for list updates
  window.addEventListener('list-created', fetchLists);
  window.addEventListener('list-updated', fetchLists);
  window.addEventListener('list-deleted', fetchLists);
});

// Clean up event listeners
onUnmounted(() => {
  window.removeEventListener('list-created', fetchLists);
  window.removeEventListener('list-updated', fetchLists);
  window.removeEventListener('list-deleted', fetchLists);
});

function onHover(id) {
  const arrow = document.getElementById(`${id}-arrow`);
  if (arrow) {
    arrow.classList.add("rotated");
  }

  if (id === "orgs") isOrgDropdownOpen.value = true;
  if (id === "lists") isListsDropdownOpen.value = true;
  if (id === "account") isAccountDropdownOpen.value = true;
}

function onLeave(id) {
  const arrow = document.getElementById(`${id}-arrow`);
  if (arrow) {
    arrow.classList.remove("rotated");
  }

  if (id === "orgs") isOrgDropdownOpen.value = false;
  if (id === "lists") isListsDropdownOpen.value = false;
  if (id === "account") isAccountDropdownOpen.value = false;
}

// Method to update the theme
function toggleTheme(newTheme) {
  theme.value = newTheme;
  emit('toggled', newTheme);
}

const navigateToList = (listId) => {
  // Close the dropdown
  isListsDropdownOpen.value = false;

  // If we're already on the app-list page, just dispatch the expand event
  if (route.path === '/app-list') {
    window.dispatchEvent(new CustomEvent('expand-list', {
      detail: {
        listId,
        shouldScroll: true
      }
    }));
    return;
  }

  // Otherwise, navigate to app-list with the expand parameter
  router.push({
    path: '/app-list',
    query: { expandList: listId }
  });
};

const handleUpgradeClick = async () => {
  try {
    isUpgradeLoading.value = true;
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/sign-in');
      return;
    }

    // Close the dropdown
    isAccountDropdownOpen.value = false;
    
    // Navigate to pricing page
    router.push('/pricing-page');
  } catch (error) {
    console.error('Error handling upgrade click:', error);
    toast.error('Failed to process upgrade request');
  } finally {
    isUpgradeLoading.value = false;
  }
};

const logout = async () => {
  try {
    // Get token from storage
    const token = localStorage.getItem('token');
    
    if (token) {
      // Call backend logout
      await auth.logout();
    }

    // Clear client-side storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear cookies if any
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    
    // Close dropdown
    isAccountDropdownOpen.value = false;
    
    // Redirect to login
    router.push('/sign-in');
    
  } catch (error) {
    console.error('Logout error:', error);
    // Even if server logout fails, clear client side and redirect
    localStorage.removeItem('token');
    router.push('/sign-in');
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
          <div v-if="!lists.length" :class="['router-link', theme]">
            <NavbarElement :theme="theme" :arrowSrc="arrowSrc">
              No lists
            </NavbarElement>
          </div>
          <div
            v-else
            v-for="list in lists"
            :key="list.id"
            :class="['router-link', theme]"
            @click="navigateToList(list.id)"
            style="cursor: pointer;"
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
        <div @click="logout">
          <NavbarElement :theme="theme" :arrowSrc="arrowSrc">
            Log out
          </NavbarElement>
        </div>
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
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.router-link {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}
</style>
