<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <div :key="$route.fullPath">
        <component :is="Component" />
      </div>
    </transition>
  </router-view>
</template>

<script setup>
import DevToolbar from '@/comps/DevToolbar.vue';
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

/* Subtle page transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Ensure the transition wrapper doesn't affect layout */
.fade-enter-active > div,
.fade-leave-active > div {
  width: 100%;
  height: 100%;
}

/* Vue-Toastification container styles */
.Vue-Toastification__container.toast-container {
  z-index: 100002 !important; /* Higher than navbar's z-index of 10000 */
  top: 20px !important;
}

/* Optional: Adjust individual toast z-index if needed */
.Vue-Toastification__toast {
  z-index: 100003 !important;
}
</style>
