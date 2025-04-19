import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

let stripeInstance = null;

export const initializeStripe = () => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured in environment variables');
  }

  try {
    if (!stripeInstance) {
      stripeInstance = new Stripe(stripeKey, {
        apiVersion: '2023-10-16'
      });
    }
    return stripeInstance;
  } catch (error) {
    console.error('× Stripe initialization error:', error);
    throw error;
  }
};

export const getStripeInstance = () => {
  if (!stripeInstance) {
    return initializeStripe();
  }
  return stripeInstance;
};

export const getPlanPrice = (plan) => {
  const prices = {
    'premium': 1000,  // $10.00
    'enterprise': 10000  // $100.00
  };
  return prices[plan] || 1000;
};
