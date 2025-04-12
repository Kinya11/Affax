
<template>
  <button class="inverted-button">
    <slot></slot>
  </button>
</template>

<style scoped>
.inverted-button {
  background-color: transparent;
  border-radius: 5px;
  padding: 6px 11px;
  font-size: 1.1rem;
  font-weight: 600;
  border: 1px solid currentColor;
  transition: all 0.2s ease;
  cursor: pointer;
  color: black;
}

.inverted-button:hover {
  opacity: 0.8;
}
</style>