import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css';
import App from './App.vue';
import router from './router';
import { useUserStore } from '@/stores/user';

const app = createApp(App);
const pinia = createPinia();

const toastOptions = {
  position: 'top-right',
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: true,
  closeButton: 'button',
  icon: true,
  rtl: false,
  maxToasts: 3,
  toastClassName: 'centered-toast'
};

app.use(pinia);
app.use(router);
app.use(Toast, toastOptions);

// Initialize user store from localStorage
const userStore = useUserStore();
userStore.initializeFromStorage();

app.mount('#app');
