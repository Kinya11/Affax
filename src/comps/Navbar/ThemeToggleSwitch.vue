<script setup>
import { ref, watch, onMounted } from "vue";

const emit = defineEmits(['toggled']);
const root = document.documentElement;

// Theme Scripts - set based on mode
let theme = ref(import.meta.env.MODE === 'development' ? 'dark' : 'light');
let isChecked = ref(import.meta.env.MODE === 'development');

function setCookie(name, value, days) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function updateCSSVariables() {
  if (theme.value === "dark") {
    root.style.setProperty("--inverted-button-background", "#0000");
    root.style.setProperty("--inverted-button-border", "var(--third-layer-dark)");
    root.style.setProperty("--inverted-button-text", "var(--text-color-dark)");
    root.style.setProperty("--inverted-button-hover", "var(--dark-gray)");
  } else {
    root.style.setProperty("--inverted-button-background", "var(--first-layer-light)");
    root.style.setProperty("--inverted-button-border", "var(--first-layer-dark)");
    root.style.setProperty("--inverted-button-text", "var(--text-color-light)");
    root.style.setProperty("--inverted-button-hover", "var(--second-layer-light)");
  }
}

onMounted(() => {
  const savedTheme = getCookie("theme");
  if (savedTheme) {
    theme.value = savedTheme;
    isChecked.value = savedTheme === "dark";
  } else {
    // If no saved theme, set based on mode
    const initialTheme = import.meta.env.MODE === 'development' ? 'dark' : 'light';
    theme.value = initialTheme;
    isChecked.value = initialTheme === 'dark';
    setCookie("theme", initialTheme, 365);
  }
  updateCSSVariables();
});

watch(isChecked, (newValue) => {
  theme.value = newValue ? "dark" : "light";
  setCookie("theme", theme.value, 365);
  emit("toggled", theme.value);
  updateCSSVariables();
});
</script>
<template>
  <div class="button r" id="theme-toggle-div">
    <input v-model="isChecked" type="checkbox" class="checkbox" />
    <div class="knobs"></div>
    <div class="layer"></div>
  </div>
</template>
<style>
/* Button 3 */
#theme-toggle-div .knobs:before {
  content: "";
  position: absolute;
  top: 3px;
  left: 4px;
  width: 11px;
  height: 1px;
  color: #fff;
  font-size: 10px;
  font-weight: bold;
  text-align: center;
  line-height: 1;
  padding: 9px 4px;
  background-color: var(--first-layer-light);
  border-radius: 50%;
  transition: 0.3s ease all, left 0.3s cubic-bezier(0.18, 0.89, 0.35, 1.15);
}

#theme-toggle-div .checkbox:active + .knobs:before {
  width: 30px;
  border-radius: 100px;
}

#theme-toggle-div .checkbox:checked:active + .knobs:before {
  margin-left: -20px;
}

#theme-toggle-div .checkbox:checked + .knobs:before {
  content: "";
  left: 33px;
  background-color: var(--second-layer-dark);
}

#theme-toggle-div .checkbox ~ .layer {
  background-color: var(--dark-gray);
}

#theme-toggle-div .checkbox:checked ~ .layer {
  background-color: var(--soft-gray);
}

.button-cover,
.knobs,
.layer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.button {
  position: absolute;
  top: calc((55px - 25px) / 2);
  right: 20px;
  width: 55px;
  height: 25px;
  overflow: hidden;
}

.button.r,
.button.r .layer {
  border-radius: 100px;
}

.button.b2 {
  border-radius: 2px;
}

.checkbox {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 3;
}

.knobs {
  z-index: 2;
}
</style>
