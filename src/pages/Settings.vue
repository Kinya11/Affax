<!--
Go to http://localhost:5173/settings to view this page
-->
<script setup>
import Navbar from '@/comps/Navbar/Navbar.vue';
</script>
<template>
  <Navbar />
  <div id="settings-container" >
    <h2 class="container-header">Settings</h2>
  </div>
</template>
<script>
export default {
  name: "Settings",
};
</script>
<style>
#settings-container {
  max-width: 76vw;
  margin-left: 12vw;
  padding: 20px;
}

.container-header {
  font-size: 2rem;
  text-align: center;
}

.setting {
  display: flex;
  align-items: center;
  gap: 10px;
}

#settings-container {
  border-style: solid;
  border-width: 1px;
  border-color: black;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.289);
  box-shadow: #0000003b 0px 4px 4px;
  z-index: 10000;
}
</style>
