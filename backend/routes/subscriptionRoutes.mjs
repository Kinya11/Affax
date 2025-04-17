import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get subscription status
router.get('/', authenticateToken, async (req, res) => {
  try {
    // For development: Force pro plan status
    if (process.env.NODE_ENV === 'development') {
      return res.json({
        currentPlan: {
          name: 'pro',
          limits: {
            maxLists: -1,
            maxAppsPerList: -1
          }
        },
        availableSeats: 999,
        usedSeats: 1
      });
    }

    // TODO: Add your production subscription logic here
    // For now, return free plan
    res.json({
      currentPlan: {
        name: 'free',
        limits: {
          maxLists: 3,
          maxAppsPerList: 5
        }
      },
      availableSeats: 1,
      usedSeats: 1
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

export default router;
