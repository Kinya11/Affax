<script setup>
import { computed, ref } from 'vue';
import FirefoxLogo from '@/assets/Firefox_logo,_2019.svg';
import MediaPlayerLogo from '@/assets/MediaPlayerLogo.svg';

const props = defineProps({
  app: {
    type: Object,
    required: true
  },
  theme: {
    type: String,
    default: 'light'
  },
  listId: {
    type: Number,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['delete-app']);

const serverPort = import.meta.env.VITE_SERVER_PORT || 5001;

const appIcon = computed(() => {
  // First check for built-in app icons
  if (props.app.name?.toLowerCase().includes('firefox')) {
    return FirefoxLogo;
  }
  if (props.app.name?.toLowerCase().includes('media player')) {
    return MediaPlayerLogo;
  }
  
  // Then fall back to regular icon logic
  if (!props.app.icon_url) return '/default-app-icon.png';
  if (props.app.icon_url.startsWith('http')) return props.app.icon_url;
  return `https://affax.app:${serverPort}${props.app.icon_url}`;
});

function handleImageError(e) {
  e.target.src = '/default-app-icon.png';
}

function formatFileSize(sizeInKb) {
  if (!sizeInKb) return '0 MB';
  return `${(sizeInKb / 1024).toFixed(1)} MB`;
}

const isDeleting = ref(false);

const handleDelete = () => {
  if (!props.disabled) {
    isDeleting.value = true;
    setTimeout(() => {
      emit('delete-app', {
        listId: props.listId,
        appId: props.app.app_id
      });
    }, 150); // Match animation duration
  }
};
</script>

<template>
  <div 
    class="added-app" 
    :class="[
      theme,
      { 'deleting': isDeleting }
    ]"
  >
    <div class="app-content">
      <img 
        :src="appIcon" 
        class="app-icon" 
        :class="theme"
        @error="handleImageError" 
        alt="App icon" 
      />
      <div class="app-info">
        <h3 class="app-name">{{ app.name }}</h3>
        <p v-if="app.description" class="app-description">{{ app.description }}</p>
        <span class="app-size">{{ formatFileSize(app.file_size_kb) }}</span>
      </div>
    </div>
    <button 
      class="delete-button" 
      :class="[theme, { 'disabled': disabled }]"
      @click="handleDelete"
      :disabled="disabled"
    >
      ×
    </button>
  </div>
</template>

<style scoped>

.added-app {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px;
  padding-left: 5px;
  border-radius: 8px;
  background: var(--background-secondary);
  margin-right: 5px;
  transition: all 0.15s ease;
  opacity: 1;
  transform: translateX(0);
  border-radius: 7px;
  border-width: 1px;
  border-style: solid;
  border-color: var(--app-gray);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.added-app.deleting {
  opacity: 0.3;  /* Changed from 0 to 0.3 to keep border slightly visible */
  transform: translateX(-20px);
}

.added-app.dark {
  background-color: var(--second-layer-dark);
  color: var(--text-color-dark);
  border: 1px solid var(--text-color-dark);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.app-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;

}

.app-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  background-color: var(--first-layer-light);
}

.app-icon.dark {
  background-color: var(--first-layer-dark);
}

.app-info {
  flex: 1;
}

.app-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
}

.app-description {
  margin: 0.25rem 0;
  font-size: 0.85rem;
  color: var(--dark-gray);
}

.dark .app-description {
  color: var(--medium-gray);
}

.app-size {
  font-size: 0.8rem;
  color: var(--dark-gray);
  font-style: italic;
}

.dark .app-size {
  color: var(--soft-gray);
}

.delete-button {
  background: transparent;
  border: none;
  color: var(--dark-gray);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all var(--standard-animation-duration) ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-button.dark {
  color: var(--soft-gray);
}

.delete-button:hover {
  background-color: var(--error);
  color: white;
}

.added-app:hover {
  transform: translateX(4px);
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed !important;
  pointer-events: none;
}
</style>
