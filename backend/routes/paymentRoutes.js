import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getStripeInstance, getPlanPrice } from '../config/stripe.js';

const router = express.Router();

// Modify the create-payment-intent route with better error handling
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    const stripe = getStripeInstance();
    const { plan } = req.body;
    
    if (!plan) {
      return res.status(400).json({ error: 'Plan is required' });
    }

    console.log(`Creating payment intent for plan: ${plan}`);

    // Get price based on plan
    const amount = getPlanPrice(plan);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        userId: req.user.userId,
        plan
      }
    });

    console.log(`Payment intent created successfully: ${paymentIntent.id}`);

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    res.status(500).json({ 
      error: 'Payment initialization failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
