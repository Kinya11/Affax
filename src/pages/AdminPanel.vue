<template>
    <div v-if="user.isAdmin">
      <h3>Admin Controls</h3>
      <label>
        <input type="checkbox" v-model="bypassDeviceRegistration">
        Bypass Device Registration
      </label>
    </div>
  </template>
  
  <script setup>
  const bypassDeviceRegistration = ref(false);
  watch(bypassDeviceRegistration, (val) => {
    localStorage.setItem('adminBypassDeviceCheck', val);
  });
  </script>