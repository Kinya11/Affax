import express from 'express';
import pool from '../db.mjs';
import { authenticateToken } from '../middleware/auth.js';
import { subscriptionTiers } from '../config/subscriptionTiers.js';

const router = express.Router();

// Get subscription status
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [subscription] = await pool.query(
      `SELECT 
        us.plan_type,
        us.seats_limit,
        COUNT(d.id) as used_seats
       FROM user_subscriptions us
       LEFT JOIN devices d ON d.user_id = us.user_id AND d.is_active = TRUE
       WHERE us.user_id = ? AND us.status = 'active'
       GROUP BY us.id`,
      [req.user.userId]
    );

    const planType = subscription?.[0]?.plan_type || 'free';
    const tierConfig = subscriptionTiers[planType];

    res.json({
      currentPlan: {
        name: planType,
        limits: tierConfig.limits,
        seats: {
          limit: subscription?.[0]?.seats_limit || tierConfig.limits.devices,
          used: subscription?.[0]?.used_seats || 0
        }
      },
      features: tierConfig.limits.features
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

export default router;
