<script setup>
import { ref, onMounted, computed } from "vue";
import InvertedButton from "../InvertedButton.vue";
import BlueGrayButton from "../BlueGrayButton.vue";
import api from "@/api";

const props = defineProps({
  theme: {
    type: String,
    default: "light",
  },
});

const emit = defineEmits(["close", "apps-added"]);

const isVisible = ref(false);
const isClosing = ref(false);
const apps = ref([]);
const searchQuery = ref("");
const selectedAppIds = ref([]);
const isLoading = ref(false);
const serverPort = import.meta.env.VITE_SERVER_PORT || 5001;

// Computed properties
const filteredApps = computed(() => {
  if (!searchQuery.value) return apps.value;
  const query = searchQuery.value.toLowerCase();
  return apps.value.filter(app => 
    app.name.toLowerCase().includes(query) ||
    (app.description && app.description.toLowerCase().includes(query))
  );
});

const getIconUrl = (app) => {
  if (!app.icon_url) return '/default-app-icon.png';
  if (app.icon_url.startsWith('http')) return app.icon_url;
  return `http://localhost:${serverPort}${app.icon_url}`;
};

// Update the onMounted hook to fetch apps when the modal opens
const fetchApps = async () => {
  try {
    const response = await api.get("/api/apps");
    console.log("Raw API response:", response); // Debug the full response
    
    // Handle different response formats
    let appsData = response.data;
    
    // Check for paginated response
    if (appsData.items) {
      appsData = appsData.items;
    } else if (!Array.isArray(appsData)) {
      if (appsData.apps) {
        appsData = appsData.apps;
      } else if (appsData.data) {
        appsData = appsData.data;
      } else {
        console.error("Unexpected API response format:", appsData);
        apps.value = [];
        return;
      }
    }

    // Now map the data
    apps.value = appsData.map(app => ({
      id: app.id, // Ensure id is included
      name: app.name || "Unnamed App",
      description: app.description || "",
      website: app.website || "#",
      icon_url: app.icon_url || "/default-app-icon.png",
      file_size_kb: app.file_size_kb || 0
    }));
    
    console.log("Processed apps:", apps.value); // Debug processed data
  } catch (error) {
    console.error("Error fetching apps:", error);
    apps.value = [];
  }
};

// Methods
const toggleAppSelection = (appId) => {
  const index = selectedAppIds.value.indexOf(appId);
  if (index === -1) {
    selectedAppIds.value.push(appId);
  } else {
    selectedAppIds.value.splice(index, 1);
  }
};

const submitSelectedApps = async () => {
  if (selectedAppIds.value.length === 0 || isLoading.value) return;
  
  isLoading.value = true;
  try {
    emit("apps-added", [...selectedAppIds.value]);
    closeModal(); // This will now trigger the smooth closing animation
  } catch (error) {
    console.error("Error submitting apps:", error);
  } finally {
    isLoading.value = false;
  }
};

// Modal controls
const openModal = async () => {
  isVisible.value = true;
  selectedAppIds.value = [];
  searchQuery.value = "";
  await fetchApps(); // Fetch apps when modal opens
};

const closeModal = () => {
  isClosing.value = true;
  setTimeout(() => {
    isVisible.value = false;
    isClosing.value = false;
    emit("close");
  }, 150); // Reduced to 150ms
};

defineExpose({ openModal, closeModal });
</script>

<template>
  <div 
    v-if="isVisible" 
    class="modal-overlay" 
    :class="{ 'fade-out': isClosing }"
    @click.self="closeModal"
  >
    <div 
      :class="[
        'modal-content', 
        theme,
        { 'fade-out': isClosing }
      ]"
    >
      <h1 class="modal-title">Add Apps</h1>
      <input
        type="text"
        :class="['AppSearch', theme]"
        placeholder="Search Apps..."
        v-model="searchQuery"
        aria-label="Search apps"
      />
      
      <div class="apps-list">
        <div v-if="filteredApps.length === 0" class="empty-state">
          No apps found matching "{{ searchQuery }}"
        </div>
        
        <div
          v-for="app in filteredApps"
          :key="app.id"
          :class="['app-card', theme, { selected: selectedAppIds.includes(app.id) }]"
          @click="toggleAppSelection(app.id)"
        >
          <div class="app-details">
            <img
              :src="getIconUrl(app)"
              :class="['app-icon', theme]"
              alt="App icon"
              @error="(e) => e.target.src = '/default-app-icon.png'"
            />
            <div class="app-info">
              <h3>{{ app.name }}</h3>
              <p v-if="app.description" class="app-description">{{ app.description }}</p>
              <a
                v-if="app.website"
                :href="app.website"
                target="_blank"
                class="app-website"
              >
                {{ app.website }}
              </a>
              <p class="app-size">
                {{ (app.file_size_kb / 1024).toFixed(1) }} MB
              </p>
            </div>
          </div>
          <InvertedButton
            class="add-button"
            @click.stop="toggleAppSelection(app.id)"
          >
            {{ selectedAppIds.includes(app.id) ? "Added ✓" : "Add" }}
          </InvertedButton>
        </div>
      </div>

      <div class="modal-actions">
        <BlueGrayButton
          v-if="selectedAppIds.length > 0"
          @click="submitSelectedApps"
          :disabled="isLoading"
        >
          {{ isLoading ? "Adding..." : `Add ${selectedAppIds.length} App(s)` }}
        </BlueGrayButton>
        <BlueGrayButton @click="closeModal">
          Close
        </BlueGrayButton>
      </div>
    </div>
  </div>
</template>

<style scoped>

@keyframes fadeInOverlay {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOutOverlay {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes expand {
  from { 
    opacity: 0;
    transform: scale(0.9); 
  }
  to { 
    opacity: 1;
    transform: scale(1); 
  }
}

@keyframes retract {
  from { 
    opacity: 1;
    transform: scale(1); 
  }
  to { 
    opacity: 0;
    transform: scale(0.95); 
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100001;
  animation: fadeInOverlay 0.15s ease; /* Reduced to 0.15s */
}

.modal-overlay.fade-out {
  animation: fadeOutOverlay 0.15s ease forwards; /* Reduced to 0.15s */
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 3rem;
  width: 95%;
  max-width: 900px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  overflow: hidden;
  animation: expand 0.15s ease; /* Reduced to 0.15s */
}

.modal-content.fade-out {
  animation: retract 0.15s ease forwards; /* Reduced to 0.15s */
}

.modal-title {
  text-align: center;
  margin: 0;
  padding: 0 0 2rem 0;
  font-size: 2.5rem; /* Increased from 1.5rem */
  font-weight: 600; /* Added for better prominence */
  border-bottom: 1px solid var(--border-color);
}

.modal-content.dark {
  background: #2d2d2d;
  color: white;
}

.modal-content.dark .modal-title {
  border-bottom-color: var(--border-dark);
}

.AppSearch {
  width: calc(100% - 1.6rem); /* Account for padding */
  margin: 0; /* Remove negative margin */
  padding: 0.8rem;
  border: 1px solid #666;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: all 0.2s ease;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
}

.AppSearch:focus {
  border-color: var(--blue-gray);
  box-shadow: 0 0 0 2px rgba(var(--blue-gray-rgb), 0.2);
}

.AppSearch.dark {
  background: var(--third-layer-dark);
  color: var(--text-color-dark);
  border-color: #444;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.AppSearch.dark:focus {
  border-color: var(--blue-gray);
  box-shadow: 0 0 0 2px rgba(var(--blue-gray-rgb), 0.3);
}

.apps-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%; /* Fill available space */
  min-height: 400px; /* Set minimum height */
}

.app-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-radius: 8px;
  background: var(--third-layer-light);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 10px; /* Add right margin to account for scrollbar */
}

.app-card.dark {
  background: var(--third-layer-dark);
}

.app-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.app-card.selected {
  border: 2px solid var(--blue-gray);
}

.app-details {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.app-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
}

.app-info {
  flex: 1;
  text-align: left;
}

.app-info h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.app-description {
  margin: 0.5rem 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.app-website {
  display: block;
  margin-top: 0.5rem;
  color: var(--blue-gray);
  font-size: 0.85rem;
  text-decoration: none;
}

.app-website:hover {
  text-decoration: underline;
}

.app-size {
  margin-top: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
  margin-top: auto;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  height: 100%; /* Fill available space */
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
