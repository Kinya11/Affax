<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { useToast, POSITION } from 'vue-toastification'
import InvertedButton from '@/comps/InvertedButton.vue'
import { useUserStore } from '@/stores/user'
import { useSessionStorage } from '@/composables/useSessionStorage'
import BlueGrayButton from '../BlueGrayButton.vue'

interface Props {
  listId: number
  theme?: string
}

// Update the ApiError interface to include details
interface ApiError {
  response?: {
    status: number
    data?: {
      error?: string
      errorCode?: string
      message?: string
      details?: string // Add details property
    }
  }
  message: string
}

interface InstallationResponse {
  success: boolean
  installationId?: number
  error?: string
  errorCode?: string
  totalApps?: number
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'light'
})

const emit = defineEmits<{
  (e: 'install-progress', data: { progress: number; total: number; status: string }): void
  (e: 'install-complete'): void
  (e: 'install-error', error: string): void
  (e: 'install-request', listId: number): void
}>()

const router = useRouter()
const toast = useToast()

const isLoading = ref(false)
const progress = ref(0)
const totalApps = ref(0)
const statusMessage = ref('')
const installationError = ref<string | null>(null)
const pollInterval = ref<NodeJS.Timeout | null>(null)
const installationId = ref<number | null>(null)

const { value: sudoPassword, remove: removeSudoPassword } = useSessionStorage<string | null>('sudoPassword', null)

const handleInstallError = (error: ApiError, userFriendlyMessage?: string) => {
  isLoading.value = false
  removeSudoPassword()
  
  // Check for sudo/password related errors
  const isPasswordError = error.message?.toLowerCase().includes('password') ||
                         error.message?.includes('sudo') ||
                         error.response?.status === 403;
  
  const message = isPasswordError ? 'Incorrect Password' : (userFriendlyMessage || 'Installation failed');
  
  toast.error(message, {
    timeout: 5000,
    position: POSITION.TOP_RIGHT,
    closeOnClick: true
  })
  
  emit('install-error', message)
  resetState()
}

const startPolling = () => {
  if (pollInterval.value) {
    clearInterval(pollInterval.value);
  }
  
  pollInterval.value = setInterval(async () => {
    try {
      if (!installationId.value) return;
      
      const { data } = await api.get(
        `/api/installations/${installationId.value}/status`
      );
      
      progress.value = data.progress || 0;
      totalApps.value = data.total || 0;
      
      // Update status message with completed/total apps
      const completedApps = Math.floor((progress.value / 100) * totalApps.value);
      statusMessage.value = `Installing (${completedApps}/${totalApps.value})`;
      
      if (data.status === 'completed') {
        finishInstallation(true);
      } else if (data.status === 'failed') {
        const errorMsg = data.error || 'Installation failed';
        console.error('Installation failed:', errorMsg);
        // Check for password-related errors in the error message
        if (errorMsg.toLowerCase().includes('password') || errorMsg.includes('sudo')) {
          handleInstallError({ message: errorMsg }, 'Incorrect Password');
        } else {
          handleInstallError({ message: errorMsg }, errorMsg);
        }
      }
      
    } catch (error) {
      console.error('Polling error:', error);
      handleInstallError(error as ApiError, 'Failed to check installation status');
    }
  }, 2000);
}

const startInstallation = async (password: string) => {
  try {
    isLoading.value = true
    installationError.value = null
    statusMessage.value = 'Starting installation...'
    
    // Log headers for debugging
    console.log('Auth token:', localStorage.getItem('token'))
    console.log('Device ID:', localStorage.getItem('deviceId'))
    
    const response = await api.post<InstallationResponse>(
      `/api/lists/${props.listId}/install`,
      { 
        sudoPassword: password,
        deviceId: localStorage.getItem('deviceId') // Explicitly send deviceId
      }
    )
    
    if (response.data.success && response.data.installationId) {
      installationId.value = response.data.installationId
      totalApps.value = response.data.totalApps || 0
      statusMessage.value = `Installing (0/${totalApps.value})`
      startPolling()
      
      toast.info('Installation started...', {
        timeout: 3000,
        position: POSITION.TOP_RIGHT
      })
    } else {
      throw new Error(response.data.error || 'Failed to start installation')
    }
  } catch (error: any) {
    console.error('Installation error:', error.response?.data || error)
    
    if (error.response?.status === 403) {
      if (!localStorage.getItem('deviceId')) {
        router.push('/device-register')
        return
      }
      
      if (!localStorage.getItem('token')) {
        router.push('/sign-in')
        return
      }
    }
    
    handleInstallError(error)
  }
}

const finishInstallation = (success: boolean, errorMessage?: string) => {
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
    pollInterval.value = null
  }
  
  isLoading.value = false
  
  if (success) {
    // Show final status before resetting
    statusMessage.value = `Installing (${totalApps.value}/${totalApps.value})`
    setTimeout(() => {
      toast.success('Installation completed successfully', {
        timeout: 5000,
        position: POSITION.TOP_RIGHT
      })
      emit('install-complete')
      resetState()
    }, 1000) // Short delay to show final count
  } else if (errorMessage) {
    handleInstallError(new Error(errorMessage) as ApiError, errorMessage)
    resetState()
  }
}

const resetState = () => {
  progress.value = 0
  totalApps.value = 0
  statusMessage.value = ''
  installationError.value = null
  isLoading.value = false
  
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
    pollInterval.value = null
  }
}

// Expose the reset method to the parent
defineExpose({ 
  resetState,
  startInstallation
})

onBeforeUnmount(() => {
  resetState()
})
</script>

<template>
  <div class="install-button-container">
    <BlueGrayButton
      :disabled="isLoading"
      @click="$emit('install-request', props.listId)"
      :class="{ 'loading': isLoading }"
    >
      <span v-if="!isLoading">Install</span>
      <span v-else>{{ statusMessage || 'Starting...' }}</span>
    </BlueGrayButton>
  </div>
</template>

<style scoped>
.install-button-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.loading {
  opacity: 0.7;
  cursor: wait !important;
}
</style>
