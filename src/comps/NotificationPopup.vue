<template>
  <!-- Display the notification only when it's visible -->
  <div v-if="visible" :class="notifClass" @click="close">
    {{ message }}
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const notifClass = ref('notification');

// Define the component's props: the message to display and its duration
const props = defineProps({
  message: String,
  duration: {
    type: Number,
    default: 3000, // Default duration is 3 seconds
  },
});

// Reactive visibility state to control whether the notification should be shown
const visible = ref(false);

// Watch for changes to the message prop and trigger the notification
watch(
  () => props.message,  // Watch for changes in the message prop
  (newMessage) => {
    if (newMessage !== 'idle123') {
      visible.value = true; // Show the notification
      notifClass.value = 'notification shown';
      setTimeout(() => {
        close();
      }, props.duration);
    }
  }
);

// Close the notification when it's clicked
const close = () => {
  notifClass.value = 'notification hidden';
  setTimeout(() => {
    visible.value = false;
  }, 300); // Match the duration of the fade-out animation
};
</script>

<style scoped>
/* Notification Styles */
.notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: var(--blue-gray);
  color: white;
  padding: 12px 20px;
  border-radius: 5px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
  text-align: bottom;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 200px;
}

.notification.shown {
  opacity: 1;
  transform: translateY(0);
}

.notification.hidden {
  opacity: 0;
  transform: translateY(10px);
}



</style>
