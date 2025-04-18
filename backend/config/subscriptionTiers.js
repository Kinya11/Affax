export const subscriptionTiers = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      devices: 2,
      lists: 1,
      appsPerList: 5,
      features: {
        batchInstall: false,
        backgroundUpdates: false,
        deviceCustomization: false,
        support: 'community',
        authMethods: ['google'],
      }
    }
  },
  premium: {
    name: 'Premium',
    price: 9.99,
    yearlyPrice: 70,
    limits: {
      devices: 5,
      lists: -1, // Unlimited
      appsPerList: -1,
      totalItems: 10000,
      features: {
        batchInstall: true,
        backgroundUpdates: true,
        deviceCustomization: true,
        support: 'priority',
        authMethods: ['google', 'email', 'github'],
        sessionHistory: true,
        appBundles: true
      }
    }
  },
  enterprise: {
    name: 'Enterprise',
    pricePerSeat: 29.99,
    limits: {
      devices: -1, // Seat based
      lists: -1,
      appsPerList: -1,
      features: {
        batchInstall: true,
        backgroundUpdates: true,
        deviceCustomization: true,
        support: 'premium',
        authMethods: ['google', 'email', 'github', 'sso'],
        sessionHistory: true,
        appBundles: true,
        adminDashboard: true,
        roleBasedAccess: true,
        webhooks: true,
        analytics: true,
        sla: true
      }
    }
  }
};