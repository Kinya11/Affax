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
// import AccountSettings from '@/pages/AccountSettings.vue';

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
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: () => import('./pages/VerifyEmail.vue')
  }
];

// Add this route for development
if (import.meta.env.MODE === 'development') {
  routes.push({
    path: '/dev/pricing',
    redirect: '/pricing-page'
  });
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  // For development, allow all navigation
  if (import.meta.env.MODE === 'development') {
    next();
    return;
  }

  // Your existing navigation guard logic
  if (to.matched.some(record => record.meta.requiresAuth)) {
    const token = localStorage.getItem('token');
    const deviceId = getStoredDeviceId();

    if (!token) {
      console.log('No token, redirecting to sign-in');
      next('/sign-in');
      return;
    }

    // Check for devices first
    api.get('/api/devices')
      .then(response => {
        const hasDevices = response.data.devices && response.data.devices.length > 0;

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
      })
      .catch(error => {
        console.error('Device check failed:', error);
        if (error.response?.status === 401) {
          next('/sign-in');
          return;
        }
        next();
      });
  } else {
    next();
  }
});  

export default router;
