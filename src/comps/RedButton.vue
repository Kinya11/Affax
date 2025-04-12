<template>
  <button class="red-button">
    <slot></slot>
  </button>
</template>

<style scoped>
.red-button {
  background-color: var(--error);  
  border-radius: 3px;
  color: white;
  padding: 6px 11px;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  transition-duration: 0.2s;
  transition-timing-function: ease;
  height: fit-content !important;
  cursor: pointer;
}

.red-button:hover {
  opacity: 0.9;
}
</style>