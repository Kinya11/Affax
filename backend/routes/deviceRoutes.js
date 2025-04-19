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
    const { deviceId, id } = req.body; // Get deviceId from request body instead of query
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Get the current device ID from headers
    const currentDeviceId = req.headers['x-device-id'];
    
    // Prevent deactivating the current device
    if (deviceId === currentDeviceId) {
      return res.status(400).json({ error: 'Cannot deactivate current device' });
    }

    // Deactivate the device in your database
    await Device.deactivate(deviceId); // Implement this method in your Device model

    res.json({ success: true });
  } catch (error) {
    console.error('Error deactivating device:', error);
    res.status(500).json({ error: 'Failed to deactivate device' });
  }
});

export default router;
