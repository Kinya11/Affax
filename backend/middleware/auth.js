import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  console.log('Authenticating token...');
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified, user:', user);
    req.user = user;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const checkDeviceOrAdmin = async (req, res, next) => {
  if (req.user?.isAdmin) {
    return next();
  }

  const deviceId = req.headers['x-device-id'];
  if (!deviceId) {
    return res.status(403).json({ error: 'Device ID required' });
  }

  try {
    const [device] = await req.pool.query(
      `SELECT id FROM devices 
       WHERE user_id = ? AND device_id = ? AND is_active = TRUE`,
      [req.user.userId, deviceId]
    );

    if (!device.length) {
      return res.status(403).json({ error: 'Device not registered' });
    }

    next();
  } catch (error) {
    console.error('Device check error:', error);
    res.status(500).json({ error: 'Failed to verify device' });
  }
};
