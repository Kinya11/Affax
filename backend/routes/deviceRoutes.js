import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Debug route
router.get('/test', (req, res) => {
  res.json({ message: 'Device routes are working' });
});

// Get all devices
router.get('/', authenticateToken, async (req, res) => {
  try {
    const currentDeviceId = req.headers['x-device-id'];
    
    // Get all active devices
    const [devices] = await req.app.locals.pool.query(
      `SELECT 
        id,
        device_id as deviceId,
        device_name as deviceName,
        platform,
        is_active as isActive,
        last_active as lastActive,
        created_at as createdAt
       FROM devices
       WHERE user_id = ? AND is_active = TRUE
       ORDER BY 
         CASE WHEN device_id = ? THEN 0 ELSE 1 END,
         last_active DESC
       LIMIT ?`,
      [req.user.userId, currentDeviceId, req.user.seatLimit || 3]
    );

    // If we have a current device ID, verify it's valid
    if (currentDeviceId) {
      const isValidDevice = devices.some(device => device.deviceId === currentDeviceId);
      if (!isValidDevice) {
        return res.status(403).json({
          error: 'Current device not registered',
          code: 'DEVICE_NOT_REGISTERED'
        });
      }
    }

    res.json({
      devices,
      seatLimit: req.user.seatLimit || 3,
      currentDeviceId
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Deactivate device
router.post('/deactivate', authenticateToken, async (req, res) => {
  try {
    const { id, deviceId } = req.body;
    const currentDeviceId = req.headers['x-device-id'];
    const userId = req.user?.userId; // Safely access userId

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (!id || !deviceId) {
      return res.status(400).json({
        error: 'Missing required parameters'
      });
    }

    // First verify this is a valid device for this user
    const [devices] = await req.app.locals.pool.query(
      'SELECT * FROM devices WHERE id = ? AND user_id = ? AND is_active = TRUE',
      [id, userId]
    );

    if (!devices.length) {
      return res.status(404).json({
        error: 'Device not found or already deactivated'
      });
    }

    const device = devices[0];

    // Prevent deactivating current device
    if (device.device_id === currentDeviceId) {
      return res.status(403).json({
        error: 'Cannot deactivate current device',
        code: 'CURRENT_DEVICE'
      });
    }

    // Deactivate the device
    const [result] = await req.app.locals.pool.query(
      'UPDATE devices SET is_active = FALSE WHERE id = ? AND user_id = ? AND device_id != ?',
      [id, userId, currentDeviceId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        error: 'Failed to deactivate device'
      });
    }

    // Log the deactivation
    await req.app.locals.pool.query(
      'INSERT INTO device_activity (device_id, user_id, activity_type) VALUES (?, ?, ?)',
      [deviceId, userId, 'deactivate']
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deactivating device:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
