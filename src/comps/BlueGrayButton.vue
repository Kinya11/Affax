<template>
  <button class="blue-gray-button">
    <slot></slot>
  </button>
</template>
<style scoped>
.blue-gray-button {
  background-color: #2c4c6b;  
  border-radius: 3px;
  color: white;
  padding: 6px 11px;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  transition-duration: 0.2s;
  transition-timing-function: ease;
  height: fit-content !important;
}

.blue-gray-button:hover {
  background-color: var(--dark-blue);
}
</style>