<!--
Go to http://localhost:5173/admin-console to view this page
-->
<script setup>
import InviteConatiner from '../comps/InviteContainer.vue'
import Navbar from '@/comps/Navbar/Navbar.vue';
</script>
<template>
  <Navbar />
  <InviteConatiner />
</template>

<script>
export default {
  name: 'AdminConsole',
};
</script>

<style scoped>
/* Add your styles here */
</style>