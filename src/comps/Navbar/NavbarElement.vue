<script setup>
import { ref } from "vue";

let arrowStatus = ref("idle");

defineProps({
  arrowSrc: String,
  theme: String,
});

function moveArrowRight() {
  arrowStatus.value = "moved";
}

function unmoveArrowRight() {
  arrowStatus.value = "idle";
}

// Method to handle logout
async function logout() {
  try {
    // Get token from storage
    const token = localStorage.getItem('jwtToken');
    
    if (token) {
      // Call backend logout
      const response = await fetch('http://localhost:5001/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }
    }

    // Clear client-side storage
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
    
    // Clear cookies if any
    document.cookie = 'jwtToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    
    // Redirect to login
    window.location.href = '/sign-in';
    
  } catch (error) {
    console.error('Logout error:', error);
    // Even if server logout fails, clear client side and redirect
    localStorage.removeItem('jwtToken');
    window.location.href = '/sign-in';
  }
}

</script>
<template>
  <div
    class="navbar-element"
    @mouseover="moveArrowRight()"
    @mouseleave="unmoveArrowRight()"
  >
    <div :class="['nav-dropdown-span', theme]">
      <slot></slot>
    </div>
    <img
      :class="['sideways-arrow', arrowStatus]"
      :src="arrowSrc"
      width="10px"
    />
  </div>
</template>
<style scoped>
.navbar-element {
  margin-bottom: 10px;
  margin-right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-dropdown-span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sideways-arrow {
  transform: rotate(270deg);
  transition-duration: 0.3s;
}

.idle {
  transform: translateX(5px) rotate(270deg);
}

.moved {
  transform: translateX(30px) rotate(270deg);
}

.nav-dropdown-span.light {
  color: var(--text-color-light);
  text-decoration: underline;
  text-decoration-color: var(--text-color-light);
}

.nav-dropdown-span.dark {
  color: var(--text-color-dark);
  text-decoration: underline;
  text-decoration-color: var(--text-color-dark);
}
</style>
