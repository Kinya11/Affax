<template>
  <router-view v-slot="{ Component, route }">
    <AuthGuard :requires-auth="route.meta.requiresAuth">
      <component :is="Component" />
    </AuthGuard>
  </router-view>
</template>

<script setup>
import AuthGuard from '@/comps/AuthGuard.vue';
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

body {
  font-family: 'Poppins', sans-serif;
  padding-top: 70px;
}

html {
  scroll-behavior: smooth;
}

/* Override toast container z-index */
.Vue-Toastification__container.toast-container {
  z-index: 100001 !important; /* Higher than navbar's 10000 */
  top: 20px !important; /* Ensure some spacing from the top */
}

/* Adjust toast appearance */
.Vue-Toastification__toast {
  padding: 12px 20px !important;
  border-radius: 8px !important;
  text-align: center !important;
}

.Vue-Toastification__toast-body {
  text-align: center !important;
  width: 100% !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

/* Optional: If you want to center the icon and text together */
.Vue-Toastification__toast-component-body {
  justify-content: center !important;
}

.centered-toast {
  text-align: center !important;
}
</style>
