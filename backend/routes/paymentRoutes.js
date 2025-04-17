import express from 'express';
import Stripe from 'stripe';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Create a payment intent
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;
    
    // Get price based on plan
    const amount = getPlanPrice(plan); // Implement this function based on your pricing

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        userId: req.user.userId,
        plan
      }
    });

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

// Webhook to handle successful payments
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handleSuccessfulPayment(paymentIntent);
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await handleFailedPayment(failedPayment);
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook Error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Helper function to get plan price
function getPlanPrice(plan) {
  const prices = {
    'basic': 500,    // $5.00
    'premium': 1000, // $10.00
    'pro': 2000     // $20.00
  };
  return prices[plan] || prices.premium;
}

// Handle successful payment
async function handleSuccessfulPayment(paymentIntent) {
  const { userId, plan } = paymentIntent.metadata;
  
  const pool = req.app.locals.pool;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Update user subscription
    await connection.query(
      `INSERT INTO user_subscriptions (user_id, plan_type, status, start_date, end_date)
       VALUES (?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH))
       ON DUPLICATE KEY UPDATE 
       plan_type = VALUES(plan_type),
       status = 'active',
       start_date = VALUES(start_date),
       end_date = VALUES(end_date)`,
      [userId, plan]
    );

    // Add payment record
    await connection.query(
      `INSERT INTO payments (user_id, amount, status, stripe_payment_id)
       VALUES (?, ?, 'completed', ?)`,
      [userId, paymentIntent.amount, paymentIntent.id]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Failed to process successful payment:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Handle failed payment
async function handleFailedPayment(paymentIntent) {
  const { userId } = paymentIntent.metadata;
  
  const pool = req.app.locals.pool;
  
  try {
    await pool.query(
      `INSERT INTO payments (user_id, amount, status, stripe_payment_id)
       VALUES (?, ?, 'failed', ?)`,
      [userId, paymentIntent.amount, paymentIntent.id]
    );
  } catch (error) {
    console.error('Failed to record failed payment:', error);
    throw error;
  }
}

export default router;
