<!--
Go to http://localhost:5173/settings to view this page
-->
<script setup>
import { ref, onMounted } from 'vue';
import Navbar from '@/comps/Navbar/Navbar.vue';
import BlueGrayButton from '@/comps/BlueGrayButton.vue';
import api from '@/api';
import { useUserStore } from '@/stores/user';
import { useToast } from 'vue-toastification';

// Add imports for eye icons
import EyeShow from '@/assets/Eye_Show.png';
import EyeHide from '@/assets/Eye_Hide.png';

const toast = useToast();
const theme = ref('light');
const userStore = useUserStore();
const loading = ref(false);
const error = ref('');
const success = ref('');
const isEmailVerified = ref(false);
const isResendingVerification = ref(false);
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

function toggleTheme(newTheme) {
  theme.value = newTheme;
}

onMounted(async () => {
  try {
    const response = await api.get('/api/account');
    formData.value.firstName = response.data.firstName;
    formData.value.lastName = response.data.lastName;
    formData.value.email = response.data.email;
    isEmailVerified.value = response.data.isEmailVerified;
  } catch (err) {
    toast.error('Failed to load account details');
  }
});

const resendVerificationEmail = async () => {
  try {
    isResendingVerification.value = true;
    await api.post('/api/auth/resend-verification');
    toast.success('Verification email sent successfully');
  } catch (err) {
    toast.error('Failed to send verification email');
  } finally {
    isResendingVerification.value = false;
  }
};

const saveChanges = async () => {
  try {
    error.value = '';
    success.value = '';
    loading.value = true;

    if (formData.value.newPassword || formData.value.confirmPassword || formData.value.currentPassword) {
      if (formData.value.newPassword !== formData.value.confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }
      if (!formData.value.currentPassword) {
        toast.error('Current password is required to change password');
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
      toast.success('Account details updated successfully');
      
      userStore.setUser({
        ...userStore.user,
        firstName: formData.value.firstName,
        lastName: formData.value.lastName,
        email: formData.value.email
      });

      formData.value.currentPassword = '';
      formData.value.newPassword = '';
      formData.value.confirmPassword = '';
    }
  } catch (err) {
    toast.error(err.response?.data?.error || 'Failed to update account details');
  } finally {
    loading.value = false;
  }
};
</script>
<template>
  <div class="settings-container" :class="theme">
    <Navbar @toggled="toggleTheme" />
    <div class="settings-content">
      <div class="settings-header">
        <h1>Account Settings</h1>
        <p class="subtitle">Manage your account information and security settings</p>
      </div>
      
      <div class="card">
        <form @submit.prevent="saveChanges" class="settings-form">
          <div class="form-section">
            <h2>Personal Information</h2>
            
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
              <div class="email-container">
                <input 
                  type="email" 
                  id="email" 
                  v-model="formData.email"
                  :disabled="loading"
                  required
                />
                <div class="email-status" :class="{ verified: isEmailVerified }">
                  {{ isEmailVerified ? 'Verified' : 'Not Verified' }}
                </div>
              </div>
              <div v-if="!isEmailVerified" class="verification-notice">
                <p>Please verify your email address to access all features.</p>
                <button 
                  type="button" 
                  class="resend-button" 
                  @click="resendVerificationEmail"
                  :disabled="isResendingVerification"
                >
                  {{ isResendingVerification ? 'Sending...' : 'Resend Verification Email' }}
                </button>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h2>Security</h2>
            <div class="form-group">
              <label for="currentPassword">Current Password</label>
              <div class="password-input-container">
                <input 
                  :type="showCurrentPassword ? 'text' : 'password'"
                  id="currentPassword" 
                  v-model="formData.currentPassword"
                  :disabled="loading"
                />
                <button 
                  type="button"
                  class="toggle-password"
                  @click="showCurrentPassword = !showCurrentPassword"
                  :aria-label="showCurrentPassword ? 'Hide current password' : 'Show current password'"
                >
                  <img :src="showCurrentPassword ? EyeHide : EyeShow" alt="toggle password visibility" />
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="newPassword">New Password</label>
              <div class="password-input-container">
                <input 
                  :type="showNewPassword ? 'text' : 'password'"
                  id="newPassword" 
                  v-model="formData.newPassword"
                  :disabled="loading"
                />
                <button 
                  type="button"
                  class="toggle-password"
                  @click="showNewPassword = !showNewPassword"
                  :aria-label="showNewPassword ? 'Hide new password' : 'Show new password'"
                >
                  <img :src="showNewPassword ? EyeHide : EyeShow" alt="toggle password visibility" />
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="confirmPassword">Confirm New Password</label>
              <div class="password-input-container">
                <input 
                  :type="showConfirmPassword ? 'text' : 'password'"
                  id="confirmPassword" 
                  v-model="formData.confirmPassword"
                  :disabled="loading"
                />
                <button 
                  type="button"
                  class="toggle-password"
                  @click="showConfirmPassword = !showConfirmPassword"
                  :aria-label="showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'"
                >
                  <img :src="showConfirmPassword ? EyeHide : EyeShow" alt="toggle password visibility" />
                </button>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <BlueGrayButton 
              type="submit" 
              :disabled="loading"
            >
              {{ loading ? 'Saving...' : 'Save Changes' }}
            </BlueGrayButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  name: "Settings",
};
</script>
<style scoped>
.settings-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  opacity: 0;
  animation: fadeIn 0.3s ease-out forwards;
}

.settings-container.dark {
  background-color: #1a1a1a;
  color: #fff;
}

.settings-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.settings-header {
  text-align: center;
  margin-bottom: 40px;
}

.settings-header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  color: #2c3e50;
}

.dark .settings-header h1 {
  color: #fff;
}

.subtitle {
  color: #6c757d;
  font-size: 1.1rem;
}

.dark .subtitle {
  color: #adb5bd;
}

.card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark .card {
  background: #2d2d2d;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

.form-section {
  margin-bottom: 2rem;
  padding: 0 1rem;
}

.form-section h2 {
  font-size: 1.5rem;
  margin-bottom: 20px;
  color: #2c3e50;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 10px;
}

.dark .form-section h2 {
  color: #fff;
  border-bottom-color: #404040;
}

.form-group {
  margin-bottom: 1.5rem;
  width: 100%;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #495057;
}

.dark .form-group label {
  color: #e9ecef;
}

/* Input container styles */
.form-group input,
.password-input-container {
  width: calc(100% - 24px); /* Account for padding */
  max-width: 100%;
  margin: 0;
}

/* Email container specific styles */
.email-container {
  width: calc(100% - 24px);
  display: flex;
  align-items: center;
  gap: 10px;
}

.email-container input {
  flex: 1;
  width: auto;
}

/* Password input container styles */
.password-input-container {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.password-input-container input {
  width: 100%;
  padding-right: 40px; /* Make room for the toggle button */
}

.toggle-password {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.toggle-password:hover {
  opacity: 1;
}

.toggle-password img {
  width: 20px;
  height: 20px;
}

/* Input styles */
input {
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.dark input {
  background: #3d3d3d;
  border-color: #404040;
  color: #fff;
}

input:focus {
  border-color: #007bff;
  outline: none;
}

.dark input:focus {
  border-color: #0056b3;
}

.email-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: #dc3545;
  color: white;
}

.email-status.verified {
  background-color: #28a745;
}

.verification-notice {
  margin-top: 10px;
  padding: 10px;
  background-color: #fff3cd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dark .verification-notice {
  background-color: #2d2d2d;
}

.resend-button {
  padding: 6px 12px;
  background-color: transparent;
  border: 1px solid #ffc107;
  color: #856404;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.dark .resend-button {
  border-color: #ffc107;
  color: #ffc107;
}

.resend-button:hover {
  background-color: #ffc107;
  color: #000;
}

.form-actions {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
