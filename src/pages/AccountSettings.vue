<template>
  <div class="account-settings">
    <h2>Account Settings</h2>
    
    <form @submit.prevent="saveChanges" class="settings-form">
      <div class="form-group">
        <label for="firstName">First Name</label>
        <input 
          type="text" 
          id="firstName" 
          v-model="formData.firstName"
          :disabled="loading"
          required
        />
      </div>

      <div class="form-group">
        <label for="lastName">Last Name</label>
        <input 
          type="text" 
          id="lastName" 
          v-model="formData.lastName"
          :disabled="loading"
        />
      </div>

      <div class="form-group">
        <label for="email">Email</label>
        <input 
          type="email" 
          id="email" 
          v-model="formData.email"
          :disabled="loading"
          required
        />
      </div>

      <div class="password-section">
        <h3>Change Password</h3>
        <div class="form-group">
          <label for="currentPassword">Current Password</label>
          <input 
            type="password" 
            id="currentPassword" 
            v-model="formData.currentPassword"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="newPassword">New Password</label>
          <input 
            type="password" 
            id="newPassword" 
            v-model="formData.newPassword"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm New Password</label>
          <input 
            type="password" 
            id="confirmPassword" 
            v-model="formData.confirmPassword"
            :disabled="loading"
          />
        </div>
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-if="success" class="success-message">{{ success }}</div>

      <button 
        type="submit" 
        :disabled="loading" 
        class="save-button"
      >
        {{ loading ? 'Saving...' : 'Save Changes' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/api';
import { useUserStore } from '../stores/user';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const error = ref('');
const success = ref('');

const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

onMounted(async () => {
  try {
    const response = await api.get('/api/account');
    formData.value.firstName = response.data.firstName;
    formData.value.lastName = response.data.lastName;
    formData.value.email = response.data.email;
  } catch (err) {
    error.value = 'Failed to load account details';
  }
});

const saveChanges = async () => {
  try {
    error.value = '';
    success.value = '';
    loading.value = true;

    // Validate password changes
    if (formData.value.newPassword || formData.value.confirmPassword || formData.value.currentPassword) {
      if (formData.value.newPassword !== formData.value.confirmPassword) {
        error.value = 'New passwords do not match';
        return;
      }
      if (!formData.value.currentPassword) {
        error.value = 'Current password is required to change password';
        return;
      }
    }

    const payload = {
      firstName: formData.value.firstName,
      lastName: formData.value.lastName,
      email: formData.value.email
    };

    if (formData.value.newPassword) {
      payload.currentPassword = formData.value.currentPassword;
      payload.newPassword = formData.value.newPassword;
    }

    const response = await api.put('/api/account', payload);

    if (response.data.success) {
      success.value = 'Account details updated successfully';
      
      // Update user store
      userStore.setUser({
        ...userStore.user,
        firstName: formData.value.firstName,
        lastName: formData.value.lastName,
        email: formData.value.email
      });

      // Clear password fields
      formData.value.currentPassword = '';
      formData.value.newPassword = '';
      formData.value.confirmPassword = '';
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to update account details';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.account-settings {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.password-section {
  border-top: 1px solid #eee;
  padding-top: 20px;
  margin-top: 20px;
}

.error-message {
  color: #dc3545;
  padding: 10px;
  background-color: #fce8e8;
  border-radius: 4px;
}

.success-message {
  color: #28a745;
  padding: 10px;
  background-color: #e8f5e9;
  border-radius: 4px;
}

button {
  padding: 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

input:disabled {
  background-color: #f5f5f5;
}
</style>
