export const requireDevice = async (req, res, next) => {
  const deviceId = req.headers['x-device-id'];
  
  if (!deviceId) {
    return res.status(403).json({
      error: 'Device ID required',
      code: 'DEVICE_REQUIRED'
    });
  }

  try {
    const [device] = await req.app.locals.pool.query(
      `SELECT id FROM devices 
       WHERE user_id = ? AND device_id = ? AND is_active = TRUE`,
      [req.user.userId, deviceId]
    );

    if (!device.length) {
      return res.status(403).json({
        error: 'Device not registered or inactive',
        code: 'DEVICE_NOT_REGISTERED'
      });
    }

    next();
  } catch (error) {
    console.error('Device check error:', error);
    res.status(500).json({ error: 'Failed to verify device' });
  }
};
