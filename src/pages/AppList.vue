<script setup>
import { 
  ref, 
  onMounted, 
  onUnmounted, 
  onBeforeUnmount, 
  computed,
  nextTick 
} from "vue";
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from '@/stores/user';
import api from "@/api";
import Navbar from "@/comps/Navbar/Navbar.vue";
import MainContainer from "@/comps/MainContainer.vue";
import AddedApp from "@/comps/AppList/AddedApp.vue";
import BlueGrayButton from "@/comps/BlueGrayButton.vue";
import AddApps from "@/comps/AppList/AddAppsModal.vue";
import ConfirmDeleteModal from "@/comps/AppList/ConfirmDeleteModal.vue";
import Arrow_Black from "@/assets/Arrow_Black.svg";
import Arrow_White from "@/assets/Arrow_White.svg";
import InstallButton from '@/comps/AppList/InstallButton.vue';
import InvertedButton from '@/comps/InvertedButton.vue';
import SudoPasswordModal from '@/comps/AppList/SudoPasswordModal.vue';
import { useToast } from 'vue-toastification';
import { getStoredDeviceId } from '@/utils/device';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const toast = useToast();


// Theme and UI state
const theme = ref("light");
const arrowSrc = computed(() =>
  theme.value === "light" ? Arrow_Black : Arrow_White
);

// List management
const lists = ref([]);
const newListName = ref("New List");
const expandedListLastIndex = ref(0);
const listToDelete = ref(null);

// Modals
const addAppsModal = ref(null);
const confirmDeleteModal = ref(null);
const currentListId = ref(null);
const sudoPasswordModal = ref(null);
const currentListForInstall = ref(null);

const installButtonRefs = ref({});

const setInstallButtonRef = (el, listId) => {
  if (el) {
    installButtonRefs.value[listId] = el;
  }
};

const cancelDelete = () => {
  confirmDeleteModal.value.closeModal();
  listToDelete.value = null;
};

const handleInstallSuccess = (listId) => {
  if (installButtonRefs.value[listId]) {
    installButtonRefs.value[listId].resetState()
  }
  isInstalling.value = false
}

const handleInstallError = (error, listId) => {
  isInstalling.value = false;
  installingListId.value = null;
  // ... existing error handling code ...
}

const checkDeviceRegistration = async () => {
  try {
    const deviceId = getStoredDeviceId();
    const token = localStorage.getItem('token');

    console.log('AppList checking device:', deviceId);

    if (!token) {
      router.push('/sign-in');
      return false;
    }
    
    // Skip device check if we don't have a deviceId
    if (!deviceId) {
      router.push('/device-register');
      return false;
    }

    const { data } = await api.get('/api/devices/check', {
      headers: {
        'X-Device-ID': deviceId
      }
    });
    
    console.log('Device check response:', data);

    if (!data.registered) {
      localStorage.removeItem('deviceId');
      router.push('/device-register');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Device check failed:', error);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      router.push('/sign-in');
    }
    return false;
  }
};

// Fetch user's lists when component mounts
onMounted(async () => {
  try {
    const isDeviceValid = await checkDeviceRegistration();
    if (isDeviceValid) {
      await fetchUserLists();
      
      // Handle expanding list from query parameter
      const expandListId = route.query.expandList;
      if (expandListId) {
        expandListById(Number(expandListId));
      }
    } else {
      toast.error('Failed to verify device. Please try again.');
    }
  } catch (error) {
    console.error('AppList mounting error:', error);
  }

  // Add event listener for list expansion
  window.addEventListener('expand-list', handleExpandList);
});

// Add onUnmounted hook
onUnmounted(() => {
  window.removeEventListener('expand-list', handleExpandList);
});

// Theme toggle
function toggleTheme(newTheme) {
  theme.value = newTheme;
}

function adjustWidth(event) {
  const input = event.target;
  input.style.width = `${Math.max(input.value.length, 1)}ch`;
}

// List expansion with animation
function expandList(index) {
  // Toggle the expanded state
  lists.value[index].isExpanded = !lists.value[index].isExpanded;
  
  // If expanding, update the last expanded index
  if (lists.value[index].isExpanded) {
    if (lists.value[expandedListLastIndex.value] && expandedListLastIndex.value !== index) {
      lists.value[expandedListLastIndex.value].isExpanded = false;
    }
    expandedListLastIndex.value = index;
  }
}

async function fetchUserLists() {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/sign-in");
      return;
    }

    const response = await api.get("/api/lists").catch(error => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("token");
        router.push("/sign-in");
      }
      throw error;
    });

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error("Invalid server response format");
    }

    lists.value = response.data.map(list => ({
      id: list.id,
      name: list.name,
      user_id: list.user_id,
      isExpanded: false,
      isEditing: false,
      apps: [],
      size: "0 GB"
    }));

    await Promise.allSettled(
      lists.value.map(async (list, index) => {
        try {
          const { data } = await api.get(`/api/lists/${list.id}/items`);
          lists.value[index].apps = data?.items || data || [];
          updateListSize(index);
        } catch (error) {
          console.error(`Error loading apps for list ${list.id}:`, error);
          lists.value[index].apps = [];
          updateListSize(index);
          
          if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem("token");
            router.push("/sign-in");
          } else {
            toast.error("Failed to load apps");
          }
        }
      })
    );
  } catch (error) {
    console.error("Failed to load lists:", error);
    if (error.response) {
      switch (error.response.status) {
        case 400:
          alert("Invalid request. Please try again.");
          break;
        case 401:
        case 403:
          localStorage.removeItem("token");
          router.push("/sign-in");
          break;
        default:
          alert("Server error. Please try again later.");
      }
    } else {
      alert("Network error. Please check your connection.");
    }
  }
}

async function createNewList() {
  const name = newListName.value.trim().substring(0, 24);
  if (!name) {
    toast.error("List name cannot be empty");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/sign-in");
      return;
    }

    const response = await api.post("/api/lists", { name });
    const newList = {
      id: response.data.id,
      name: response.data.name,
      user_id: response.data.user_id,
      isExpanded: false,
      isEditing: false,
      apps: [],
      size: "0 GB",
    };

    lists.value.push(newList);
    newListName.value = "New List";
    
    // Dispatch event for navbar update
    window.dispatchEvent(new CustomEvent('list-created'));
    
    toast.success('List created successfully');
  } catch (error) {
    if (error.response?.status === 403) {
      toast.error("You've reached your list limit", {
        timeout: 8000,
        onClick: () => router.push('/upgrade-plan'),
        action: {
          text: "Upgrade Plan",
          onClick: () => router.push('/upgrade-plan')
        }
      });
    } else {
      toast.error("Failed to create list");
    }
  }
}

function showError(message, action = null) {
  // Implement your error display logic here
  // This could be a toast notification or modal
  console.error(message);
  if (action) {
    // Show upgrade button or other action
  }
}

function updateListSize(listIndex) {
  const totalSizeKB = lists.value[listIndex].apps.reduce(
    (sum, app) => sum + (app.file_size_kb || 0),
    0
  );
  lists.value[listIndex].size = `${(totalSizeKB / 1048576).toFixed(2)} GB`;
}

async function updateListName(index, newName) {
  if (isListDisabled.value) return;
  
  const name = newName.trim().substring(0, 24);
  if (!name) {
    alert("List name cannot be empty");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/sign-in");
      return;
    }

    await api.put(`/api/lists/${lists.value[index].id}`, { name });
    lists.value[index].name = name;
    lists.value[index].isEditing = false;
    
    // Dispatch event for navbar update
    window.dispatchEvent(new CustomEvent('list-updated'));
  } catch (error) {
    handleApiError(error, "Failed to update list name");
  }
}

async function deleteList() {
  if (listToDelete.value === null) return;

  const deletingIndex = listToDelete.value;
  const listId = lists.value[deletingIndex]?.id;

  if (!listId) {
    console.error('No list ID found for deletion');
    return;
  }

  try {
    const deletedList = lists.value.splice(deletingIndex, 1)[0];
    
    if (expandedListLastIndex.value >= deletingIndex) {
      expandedListLastIndex.value = Math.max(0, expandedListLastIndex.value - 1);
    }

    confirmDeleteModal.value.closeModal();
    listToDelete.value = null;

    await api.delete(`/api/lists/${listId}`);
    
    // Dispatch event for navbar update
    window.dispatchEvent(new CustomEvent('list-deleted'));
  } catch (error) {
    lists.value.splice(deletingIndex, 0, deletedList);
    
    console.error('Delete failed:', error);
    if (error.response) {
      if (error.response.status === 401) {
        router.push('/sign-in');
      } else {
        alert(`Delete failed: ${error.response.data?.message || 'Server error'}`);
      }
    } else {
      alert('Network error - could not delete list');
    }
  }
}

const handleAppsAdded = async (appIds) => {
  if (!currentListId.value) return;

  try {
    const validAppIds = Array.isArray(appIds) ? appIds : [appIds];
    
    if (validAppIds.length === 0) {
      toast.warning('Please select at least one app');
      return;
    }

    // Store the current list's index and expanded state before refreshing
    const listIndex = lists.value.findIndex(list => list.id === currentListId.value);
    const wasExpanded = listIndex !== -1 ? lists.value[listIndex].isExpanded : false;

    const response = await api.post(`/api/lists/${currentListId.value}/items`, {
      appIds: validAppIds
    });

    // Removed the success toast notification
    addAppsModal.value.closeModal();
    
    // Refresh the lists
    await fetchUserLists();

    // After refresh, find the list again and restore its expanded state
    const newListIndex = lists.value.findIndex(list => list.id === currentListId.value);
    if (newListIndex !== -1 && wasExpanded) {
      lists.value[newListIndex].isExpanded = true;
      expandedListLastIndex.value = newListIndex;
    }
  } catch (error) {
    console.error('Error adding apps:', error);
    
    if (error.response?.status === 400) {
      if (error.response.data?.errorCode === 'INVALID_PASSWORD' || 
          error.response.data?.error?.toLowerCase().includes('password')) {
        toast.error('Incorrect Password');
      } else if (error.response.data?.error?.includes('already in the list')) {
        toast.warning('Selected apps are already in the list');
      } else {
        toast.error(error.response.data?.error || 'Failed to add apps');
      }
    } else if (error.response?.status === 403) {
      toast.error('Incorrect Password');
    } else {
      toast.error('Failed to add apps. Please try again.');
    }
  }
};

const deleteAppFromList = async ({ listId, appId }) => {
  if (isListDisabled.value || installingListId.value === listId) {
    return;
  }
  
  try {
    await api.delete(`/api/lists/${listId}/items/${appId}`);
    const listIndex = lists.value.findIndex(list => list.id === listId);
    if (listIndex !== -1) {
      lists.value[listIndex].apps = lists.value[listIndex].apps.filter(
        app => app.app_id !== appId
      );
      // Update the list size after removing the app
      updateListSize(listIndex);
    }
  } catch (error) {
    console.error('Error deleting app:', error);
    toast.error('Failed to delete app');
  }
};

function handleApiError(error, defaultMessage) {
  console.error("API Error:", error);
  if (error.response?.status === 401) {
    router.push("/sign-in");
  } else {
    toast.error(error.response?.data?.message || defaultMessage);
  }
}

const openAddAppsModal = (listId) => {
  if (isListDisabled.value) return;
  currentListId.value = listId;
  addAppsModal.value.openModal();
};

const isInstalling = ref(false)
const installingListId = ref(null)

const openDeleteModal = (index) => {
  if (isListDisabled.value) return;
  listToDelete.value = index;
  confirmDeleteModal.value.openModal();
}

const pollInterval = ref(null)
const monitorInstallation = async (installationId, listId) => {
  try {
    const response = await api.get(`/api/installations/${installationId}/status`)
    const { status, error } = response.data
    
    if (status === 'completed') {
      clearInterval(pollInterval.value)
      pollInterval.value = null
      handleInstallSuccess(listId)
      toast.success('Installation completed successfully')
    } else if (status === 'failed') {
      clearInterval(pollInterval.value)
      pollInterval.value = null
      handleInstallError(error || 'Installation failed', listId)
      toast.error(error || 'Installation failed')
    }
  } catch (error) {
    clearInterval(pollInterval.value)
    pollInterval.value = null
    handleInstallError('Failed to monitor installation status', listId)
    toast.error('Failed to monitor installation status')
  }
}

const proceedWithInstallation = async (listId, password) => {
  try {
    if (!installButtonRefs.value[listId]) {
      toast.error('Installation component not found');
      return;
    }
    
    isInstalling.value = true;
    installingListId.value = listId;
    
    // Changed to use startInstallation instead of proceedWithInstallation
    if (typeof installButtonRefs.value[listId].startInstallation !== 'function') {
      toast.error('Installation method not available');
      return;
    }

    await installButtonRefs.value[listId].startInstallation(password);
  } catch (error) {
    console.error('Installation failed:', error);
    handleInstallError('Installation failed', listId);
    
    // Handle different error scenarios
    if (error.response?.status === 403) {
      if (error.response.data?.errorCode === 'DEVICE_NOT_REGISTERED') {
        toast.warning('Device needs to be registered');
        router.push('/device-register');
        return;
      }
      if (error.response.data?.error?.toLowerCase().includes('password') ||
          error.message?.toLowerCase().includes('password')) {
        toast.error('Incorrect Password');
        return;
      }
      toast.error('Access denied');
    } else {
      toast.error('Installation failed');
    }
  } finally {
    isInstalling.value = false;
    installingListId.value = null;
  }
}

const handleInstallComplete = () => {
  isInstalling.value = false
  installingListId.value = null
}

// Function to be called from the list when install is triggered
const handleInstallRequest = (listId) => {
  currentListForInstall.value = listId;
  sudoPasswordModal.value.openModal();
};

// Handle the password confirmation
const handleSudoConfirm = (password) => {
  if (!currentListForInstall.value) return
  
  proceedWithInstallation(currentListForInstall.value, password)
  sudoPasswordModal.value.closeModal()
}

const handleSudoCancel = () => {
  currentListForInstall.value = null
  isInstalling.value = false
  // Reset the installation state of the current list
  if (currentListForInstall.value && installButtonRefs.value[currentListForInstall.value]) {
    installButtonRefs.value[currentListForInstall.value].resetState()
  }
}

const expandListById = (listId, shouldScroll = false) => {
  const index = lists.value.findIndex(list => list.id === listId);
  if (index !== -1) {
    // Close previously expanded list
    if (lists.value[expandedListLastIndex.value]) {
      lists.value[expandedListLastIndex.value].isExpanded = false;
    }
    
    // Expand the selected list
    lists.value[index].isExpanded = true;
    expandedListLastIndex.value = index;

    // Scroll to the list if requested
    if (shouldScroll) {
      // Wait for DOM update
      nextTick(() => {
        const listElement = document.querySelector(`[data-list-id="${listId}"]`);
        if (listElement) {
          const navbarHeight = 60; // Adjust this value based on your navbar height
          const padding = 20; // Additional padding from the top
          const targetPosition = listElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight - padding;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    }
  }
};

const handleExpandList = (event) => {
  const { listId, shouldScroll } = event.detail;
  expandListById(Number(listId), shouldScroll);
};

// Clean up on component unmount
onBeforeUnmount(() => {
  if (pollInterval.value) {
    clearInterval(pollInterval.value);
    pollInterval.value = null;
  }
  isInstalling.value = false;
  currentListForInstall.value = null;
});

// Add this computed property to help manage disabled state
const isListDisabled = computed(() => {
  return isInstalling.value || installingListId.value !== null;
});
</script>

<template>
  <div class="app-list-container">
    <Navbar @toggled="toggleTheme" />

    <div id="applist-main-container">
      <h1 id="my-list-h" :class="theme">Dashboard</h1>

      <div id="ai-tool-buttons" class="tool-buttons-applist">
        <BlueGrayButton @click="createNewList" :theme="theme">
          New List
        </BlueGrayButton>
      </div>

      <MainContainer
        v-for="(list, index) in lists"
        :key="list.id"
        :data-list-id="list.id"
        :class="['glassmorphic-container-applist-main', 'list-wrapper', theme]"
        
      >
        <div class="list-container">
         <div 
            class="hitbox" 
            @click="expandList(index)"
          ></div>
          <div class="container-top-flex" :class="theme">
            <div class="top-flex-inline-div">
              <input
                v-if="list.isEditing"
                v-model="list.name"
                @keydown.enter="updateListName(index, list.name)"
                @blur="updateListName(index, list.name)"
                class="list-name-input"
                :class="[theme, { 'disabled': isListDisabled }]"
                @input="adjustWidth"
                maxlength="24"
                :disabled="isListDisabled"
              />
              <span 
                v-else 
                @click.stop="!isListDisabled && (list.isEditing = true)" 
                class="list-name"
                :class="{ 'disabled': isListDisabled }"
              >
                {{ list.name }}
              </span>
              <img
                :class="['arrow-icon', { rotated: list.isExpanded }]"
                :src="arrowSrc"
                alt="Toggle list"
              />
            </div>
            <div class="top-right-div">
              <span class="size-span">{{ list.size }}</span>
              <InstallButton
                :ref="el => setInstallButtonRef(el, list.id)"
                :listId="list.id"
                :theme="theme"
                @install-complete="handleInstallSuccess(list.id)"
                @install-error="(error) => handleInstallError(error, list.id)"
                @install-request="handleInstallRequest"
              />
            </div>
          </div>

          <div 
            class="app-list"
            :class="{
              expand: list.isExpanded,
              collapse: !list.isExpanded,
            }"
          >
            <div class="app-list-content">
              <AddedApp
                v-for="app in list.apps"
                :key="app.app_id"
                :app="app"
                :theme="theme"
                :list-id="list.id"
                :disabled="isListDisabled || installingListId === list.id"
                @delete-app="deleteAppFromList"
              />
              <div 
                v-if="list.apps.length === 0" 
                :key="'empty-' + list.id" 
                class="empty-list-message"
              >
                No apps in this list yet
              </div>
            </div>
          </div>

          <div
            id="tool-buttons-applist-bottom"
            :class="{
              expand: list.isExpanded,
              collapse: !list.isExpanded,
            }"
          >
            <BlueGrayButton
              v-if="list.isExpanded"
              id="add-apps-button"
              @click.stop="openAddAppsModal(list.id)"
              :disabled="isListDisabled"
              :class="{ 'disabled': isListDisabled }"
            >
              Add Apps
            </BlueGrayButton>
            <InvertedButton
              v-if="list.isExpanded"
              @click.stop="openDeleteModal(index)"
              :disabled="isListDisabled"
              :class="{ 'disabled': isListDisabled }"
            >
              Delete List
            </InvertedButton>
          </div>
        </div>
      </MainContainer>
    </div>

    <AddApps 
      ref="addAppsModal" 
      :theme="theme" 
      @apps-added="handleAppsAdded"
    />

    <ConfirmDeleteModal 
      ref="confirmDeleteModal" 
      :theme="theme" 
      :isInstalling="isInstalling"
      @confirm="deleteList" 
      @cancel="cancelDelete"
    />

    <SudoPasswordModal
      ref="sudoPasswordModal"
      :theme="theme"
      @confirm="handleSudoConfirm"
      @cancel="handleSudoCancel"
    />
  </div>
</template>

<style scoped>
.list-container {
  position: relative;
  width: 100%;
}

.hitbox {
  width: 77.5%;
  height: 70px;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
  margin-left: 12.5%;
  margin-top: -15px;
}

.container-top-flex {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.top-flex-inline-div {
  display: flex;
  align-items: center;
  gap: 10px; /* Space between name and arrow */
}

.list-name,
.list-name-input {
  font-size: 1.2rem;
  font-weight: 800;
  padding: 3px 5px;
  margin: 0;
  white-space: nowrap;
  position: relative; /* Ensure text stays above hitbox */
  z-index: 1001;
}

.app-list-container {
  position: relative;
  min-height: 100vh;
}

.modal-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  z-index: 9999;
}

/* When modal is visible, enable pointer events */
.modal-wrapper :deep(.sudo-modal-overlay) {
  pointer-events: auto;
}

/* Animation classes */
.app-list {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  border-radius: 8px;
  background: var(--background-primary);
  cursor: default; /* Remove pointer cursor from content area */
}

.app-list.expand {
  max-height: 60vh;
  opacity: 1;
  margin-top: 1rem;
  margin-bottom: 1rem;
  padding: 0.5rem 0; /* Add padding top and bottom */
}

.app-list.collapse {
  max-height: 0;
  opacity: 0;
  margin: 0;
}

.app-list-content {
  overflow: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem; /* Add space between apps */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0.5rem;
}

.empty-list-message {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  transition: opacity 0.15s ease;
}

/* Tool buttons animation */
#tool-buttons-applist-bottom {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

#tool-buttons-applist-bottom.expand {
  max-height: 100px;
  opacity: 1;
}

#tool-buttons-applist-bottom.collapse {
  max-height: 0;
  opacity: 0;
}

/* Container styles */
.glassmorphic-container-applist-main {
  width: 76vw;
  padding: 20px;
  margin-top: 40px;
  margin-left: 10vw;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.arrow-icon {
  transition: transform 0.3s ease;
}

.arrow-icon.rotated {
  transform: rotate(180deg);
}

.empty-list-message {
  padding: 1rem;
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
}

#my-list-h {
  font-size: 3rem;
  font-weight: 400;
  text-align: center;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

#my-list-h.light {
  color: #000;
}

#my-list-h.dark {
  color: var(--text-color-dark);
}

.list-wrapper {
  margin-top: 20px;
  margin-bottom: 0px;
}

.container-top-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  height: 10px;
  margin-left: -15px;
}

.list-name,
.list-name-input {
  flex-grow: 0;
  flex-shrink: 0; /* Prevent shrinking */
}

.arrow-icon {
  width: 13px;
  height: 13px;
  transition-duration: 0.5s;
  transition-timing-function: cubic-bezier(0.165, 0.84, 0.44, 1);
  cursor: pointer;
}

.arrow-icon.rotated {
  transform: rotate(180deg);
}

.size-span {
  font-size: 1.2rem;
  font-weight: 200;
  font-style: italic;
  margin-left: 10px; /* Space between arrow and size span */
  white-space: nowrap; /* Prevent wrapping of "GB" */
  flex-shrink: 0; /* Prevent shrinking of the size text */
}

.list-name-input {
  font-size: 1.2rem;
  border: none;
  background: transparent;
  outline: none;
  color: inherit;
  padding: 0;
  text-align: left;
  min-width: 1ch; /* Minimum width */
  max-width: 100%; /* Maximum width */
  font-weight: 400;
  border-bottom-color: var(--blue-gray);
}

.list-name {
  font-size: 1.2rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  width: fit-content;
}

.glassmorphic-container-applist-main {
  width: 76vw;
  padding: 20px;
  margin-top: 40px;
  margin-left: 10vw;
  animation: fadeIn 0.5s ease-out;
}

.tool-buttons-applist {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  gap: 20px;
}

.list-name {
  font-size: 1.2rem;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
  border-style: solid;
  border-width: 2px;
  border-color: #0000;
  padding: 3px;
  padding-left: 5px;
  padding-right: 5px;
  margin: auto;
}

.list-name-input {
  font-size: 1.2rem;
  font-weight: 800;
  border-style: solid;
  border-width: 2px;
  border-color: #0000;
  border-bottom-color: var(--blue-gray);
  background: transparent;
  outline: none;
  color: inherit;
  padding: 0px;
  text-align: left;
  margin: auto;
  max-width: fit-content !important;
}

.size-span {
  font-size: 1.2rem;
  font-weight: 200;
  font-style: italic;
  margin-left: 10px; /* Space between arrow and size span */
  white-space: nowrap; /* Prevent wrapping of "GB" */
  flex-shrink: 0; /* Prevent shrinking of the size text */
  margin-top: 0; /* Ensure it stays on the same row */
}

#tool-buttons-applist-bottom {
  display: flex;
  justify-content: right;
  gap: 20px;
  margin-top: 20px;
  transition-duration: 0.75s;
  transition-timing-function: cubic-bezier(0.165, 0.84, 0.44, 1);
  overflow: hidden;
}

#tool-buttons-applist-bottom.collapse {
  height: 0px;
  margin-top: 0px;
}

#tool-buttons-applist-bottom.expand {
  height: calc(1.1rem + 16px);
}

.glassmorphic-container-applist-main.light {
  background-color: var(--second-layer-light);
  box-shadow: #0000003b 0px 4px 4px;
  border-color: black;
  border: none;
}

.glassmorphic-container-applist-main.dark {
  background-color: var(--second-layer-dark);
  box-shadow: none;
  border-color: var(--second-layer-dark);
  color: var(--text-color-dark);
}

/* Styles for the app list */
.app-list-content {
  overflow: hidden; /* Remove scrollbar */
  padding: 0;
}

.top-right-div {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.size-span {
  font-size: 1.2rem;
  font-weight: 200;
  font-style: italic;
  white-space: nowrap;
  flex-shrink: 0;
}

.container-top-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 1rem;
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed !important;
  pointer-events: none;
}

.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.list-name.disabled {
  cursor: not-allowed;
}

.list-name-input.disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.app-list {
  overflow: hidden;
}

.app-list-content {
  position: relative;
  padding: 0.5rem;
}

.list-complete-item {
  transition: all 0.3s ease;
  display: inline-block;
  margin-right: 10px;
}

.list-complete-enter-from,
.list-complete-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.list-complete-leave-active {
  position: absolute;
}

/* Move animation */
.list-complete-move {
  transition: transform 0.3s ease;
}

/* Empty state message */
.empty-list-message {
  text-align: center;
  padding: 1rem;
  color: var(--text-secondary);
  transition: opacity 0.3s ease;
}
</style>
