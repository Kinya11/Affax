<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import api from '@/api';
import BlueGrayButton from '@/comps/BlueGrayButton.vue';
import InvertedButton from '@/comps/InvertedButton.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const token = ref('');

onMounted(() => {
  token.value = route.query.token;
  if (!token.value) {
    toast.error('Invalid reset link');
    router.push('/sign-in');
  }
});

const resetPassword = async () => {
  try {
    if (!newPassword.value || !confirmPassword.value) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.value !== confirmPassword.value) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.value.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    loading.value = true;
    await api.post('/api/auth/reset-password', {
      token: token.value,
      newPassword: newPassword.value
    });

    toast.success('Password reset successful! Please sign in with your new password.');
    router.push('/sign-in');
  } catch (error) {
    console.error('Password reset error:', error);
    toast.error(error.response?.data?.error || 'Failed to reset password');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="reset-password-container">
    <h2>Reset Password</h2>
    <form @submit.prevent="resetPassword" class="reset-form">
      <div class="input-group">
        <input
          type="password"
          v-model="newPassword"
          placeholder="New Password"
          class="input-field"
        />
      </div>
      <div class="input-group">
        <input
          type="password"
          v-model="confirmPassword"
          placeholder="Confirm Password"
          class="input-field"
        />
      </div>
      <div class="button-group">
        <BlueGrayButton
          type="button"
          @click="router.push('/sign-in')"
        >
          Cancel
        </BlueGrayButton>
        <InvertedButton
          type="submit"
          :disabled="loading"
        >
          {{ loading ? 'Resetting...' : 'Reset Password' }}
        </InvertedButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.reset-password-container {
  max-width: 400px;
  margin: 40px auto;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.reset-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-field {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.button-group {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
</style>