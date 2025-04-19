<template>
  <div class="verify-email-container">
    <h2>Email Verification</h2>
    <p v-if="loading">Verifying your email...</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="success" class="success">
      Email verified successfully! 
      <router-link to="/app-list">Continue to App List</router-link>
    </p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { useToast } from 'vue-toastification';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(true);
const error = ref(null);
const success = ref(false);

onMounted(async () => {
  const token = route.query.token;
  
  if (!token) {
    error.value = 'Invalid verification link';
    loading.value = false;
    return;
  }

  try {
    const response = await api.get(`/api/auth/verify-email/${token}`);
    if (response.data.success) {
      success.value = true;
      toast.success('Email verified successfully!');
      setTimeout(() => router.push('/app-list'), 2000);
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Verification failed';
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.verify-email-container {
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
  text-align: center;
}
.error {
  color: red;
}
.success {
  color: green;
}
</style>