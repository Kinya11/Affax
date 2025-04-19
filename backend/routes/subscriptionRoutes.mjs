import express from 'express';
import pool from '../db.mjs';
import { authenticateToken } from '../middleware/auth.js';
import { subscriptionTiers } from '../config/subscriptionTiers.js';

const router = express.Router();

// Get subscription status
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.query(
      `SELECT 
        u.user_id,
        u.plan_type,
        COUNT(d.id) as used_seats
       FROM users u
       LEFT JOIN devices d ON d.user_id = u.user_id AND d.is_active = TRUE
       WHERE u.user_id = ?
       GROUP BY u.user_id`,
      [req.user.userId]
    );

    // Use the plan_type directly since it's already in the correct format
    const planType = !result?.length ? 'free' : result[0].plan_type;
    const tierConfig = subscriptionTiers[planType];

    res.json({
      currentPlan: {
        name: planType,
        limits: tierConfig.limits,
        seats: {
          limit: tierConfig.limits.devices,
          used: result?.[0]?.used_seats || 0
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
