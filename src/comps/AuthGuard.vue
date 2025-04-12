<!-- src/components/AuthGuard.vue -->
<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import auth from '@/api/auth';

const props = defineProps({
  requiresAuth: Boolean
});

const router = useRouter();
const userStore = useUserStore();
const isReady = ref(false);

const checkAuth = async () => {
  try {
    if (props.requiresAuth) {
      const token = auth.getToken();
      if (!token) {
        userStore.clearUser();
        router.push('/sign-in');
        return;
      }

      const isValid = await auth.verifyToken();
      if (!isValid) {
        userStore.clearUser();
        auth.clearAuthData();
        router.push('/sign-in');
        return;
      }
    }
    isReady.value = true;
  } catch (error) {
    console.error('Authentication check failed:', error);
    userStore.clearUser();
    auth.clearAuthData();
    router.push('/sign-in');
  }
};

onMounted(checkAuth);
</script>

<template>
  <div v-if="isReady">
    <slot></slot>
  </div>
  <div v-else>
    <!-- Add a loading state -->
    <p>Loading...</p>
  </div>
</template>
