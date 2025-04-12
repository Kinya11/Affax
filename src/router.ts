import { createRouter, createWebHistory } from 'vue-router';
import { getStoredDeviceId } from '@/utils/device';
import api from '@/api';
import AppList from './pages/AppList.vue';
import AdminConsole from './pages/AdminConsole.vue';
import TermsOfUse from './pages/TermsOfUse.vue';
import Settings from './pages/Settings.vue';
import AppDatabaseManagement from './pages/AppDatabaseManagement.vue';
import SignIn from './pages/SignIn.vue';
import SignUp from './pages/SignUp.vue';
import PricingPage from './pages/PricingPage.vue';
import PaymentPage from './pages/PaymentPage.vue';
import auth from '@/api/auth';
import DeviceManagement from '@/comps/DeviceManagement.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    redirect: '/app-list'
  },
  {
    path: '/admin-console', 
    name: 'AdminConsole',
    component: AdminConsole,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/terms-of-use',
    name: 'TermsOfUse',
    component: TermsOfUse,
    meta: { public: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresAuth: true }
  },
  {
    path: '/app-list',
    name: 'AppList',
    component: () => import('@/pages/AppList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/app-database-management',
    name: 'AppDatabaseManagement',
    component: AppDatabaseManagement,
    meta: { requiresAuth: true }
  },
  {
    path: '/sign-in',
    name: 'SignIn',
    component: () => import('@/pages/SignIn.vue'),
    meta: { public: true, hideWhenAuth: true }
  },
  {
    path: '/sign-up',
    name: 'SignUp',
    component: SignUp,
    meta: { public: true, hideWhenAuth: true }
  },
  {
    path: '/pricing-page',
    name: 'PricingPage',
    component: PricingPage,
    meta: { public: true }
  },
  {
    path: '/payment-page',
    name: 'PaymentPage',
    component: PaymentPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/app-list'
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/sign-in'
  },
  {
    path: '/device-register',
    name: 'DeviceRegister',
    component: () => import('./pages/DeviceRegistration.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/devices',
    name: 'DeviceManagement',
    component: DeviceManagement,
    meta: { requiresAuth: true }
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('token');
  const deviceId = getStoredDeviceId();

  // If route requires auth
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!token) {
      console.log('No token, redirecting to sign-in');
      next('/sign-in');
      return;
    }

    // Check for devices first
    try {
      const devicesResponse = await api.get('/api/devices');
      const hasDevices = devicesResponse.data.devices && devicesResponse.data.devices.length > 0;

      // If no devices, always redirect to device registration
      if (!hasDevices && to.path !== '/device-register') {
        console.log('No devices found, redirecting to device registration');
        next('/device-register');
        return;
      }

      // If we have devices but no current device ID, redirect to registration
      if (hasDevices && !deviceId && to.path !== '/device-register') {
        console.log('No current device ID, redirecting to device registration');
        next('/device-register');
        return;
      }

      next();
    } catch (error) {
      console.error('Device check failed:', error);
      if (error.response?.status === 401) {
        next('/sign-in');
        return;
      }
      next();
    }
  } else {
    next();
  }
});  

export default router;
