import { exec } from 'child_process';
import crypto from 'crypto';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';

const execAsync = promisify(exec);

class DeviceManager {
  async getHardwareId(platform) {
    try {
      let hardwareId;
      let additionalInfo = '';

      switch (platform) {
        case 'win32':
          // Add more Windows-specific identifiers
          const [uuid, biosSerial, cpuId] = await Promise.all([
            execAsync('wmic csproduct get uuid'),
            execAsync('wmic bios get serialnumber'),
            execAsync('wmic cpu get processorid')
          ]);
          
          hardwareId = `${uuid.split('\n')[1].trim()}-${biosSerial.split('\n')[1].trim()}`;
          additionalInfo = cpuId.split('\n')[1].trim();
          break;
          
        case 'darwin':
          // Add more macOS-specific identifiers
          const [platformUUID, serialNumber] = await Promise.all([
            execAsync('ioreg -d2 -c IOPlatformExpertDevice | awk -F\\" \'/IOPlatformUUID/{print $(NF-1)}\''),
            execAsync('system_profiler SPHardwareDataType | awk \'/Serial/ {print $4}\'')
          ]);
          
          hardwareId = `${platformUUID.trim()}-${serialNumber.trim()}`;
          break;
          
        case 'linux':
          // Add more Linux-specific identifiers
          const [machineId, dmidecode] = await Promise.all([
            fs.promises.readFile('/etc/machine-id', 'utf8'),
            execAsync('sudo dmidecode -s system-uuid')
          ]);
          
          hardwareId = `${machineId.trim()}-${dmidecode.trim()}`;
          break;
          
        default:
          // Enhanced fallback with more system information
          const fallbackInfo = {
            arch: process.arch,
            platform: process.platform,
            hostname: os.hostname(),
            networkInterfaces: Object.values(os.networkInterfaces())
              .flat()
              .filter(ni => !ni.internal && ni.mac !== '00:00:00:00:00:00')
              .map(ni => ni.mac)
              .join('-')
          };
          
          hardwareId = crypto.createHash('sha256')
            .update(JSON.stringify(fallbackInfo))
            .digest('hex');
      }

      // Add timestamp and random component for uniqueness
      const timestamp = Date.now().toString(36);
      const random = crypto.randomBytes(4).toString('hex');
      
      // Create final device fingerprint
      const deviceFingerprint = crypto.createHash('sha256')
        .update(`${hardwareId}${additionalInfo}${timestamp}${random}`)
        .digest('hex');

      return deviceFingerprint;
    } catch (error) {
      console.error('Error generating hardware ID:', error);
      throw new Error('Failed to generate hardware identifier');
    }
  }

  async validateSeatAvailability(userId, pool) {
    const [subscription] = await pool.query(`
      SELECT l.seat_limit, COUNT(d.id) as used_seats
      FROM user_subscriptions us
      JOIN licenses l ON us.license_id = l.id
      LEFT JOIN user_devices d ON d.user_id = us.user_id AND d.is_active = TRUE
      WHERE us.user_id = ? AND us.status = 'active'
      GROUP BY us.id
    `, [userId]);

    if (!subscription.length) {
      return {
        canAddDevice: false,
        reason: 'NO_ACTIVE_SUBSCRIPTION',
        seatLimit: 0,
        usedSeats: 0
      };
    }

    return {
      canAddDevice: subscription[0].used_seats < subscription[0].seat_limit,
      reason: subscription[0].used_seats >= subscription[0].seat_limit ? 'SEAT_LIMIT_REACHED' : null,
      seatLimit: subscription[0].seat_limit,
      usedSeats: subscription[0].used_seats
    };
  }

  async registerDevice(userId, deviceInfo, pool) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Reset current device flag for all user's devices
      await conn.query(
        `UPDATE user_devices 
         SET is_current = FALSE 
         WHERE user_id = ?`,
        [userId]
      );

      const [existingDevice] = await conn.query(
        'SELECT id FROM user_devices WHERE user_id = ? AND device_id = ?',
        [userId, deviceInfo.deviceId]
      );

      if (existingDevice.length) {
        await conn.query(
          `UPDATE user_devices 
           SET is_active = TRUE,
               is_current = TRUE,
               last_active = CURRENT_TIMESTAMP,
               device_name = ?
           WHERE id = ?`,
          [deviceInfo.deviceName, existingDevice[0].id]
        );
        deviceId = existingDevice[0].id;
      } else {
        const [result] = await conn.query(
          `INSERT INTO user_devices 
           (user_id, device_id, device_name, platform, is_current)
           VALUES (?, ?, ?, ?, TRUE)`,
          [userId, deviceInfo.deviceId, deviceInfo.deviceName, deviceInfo.platform]
        );
        deviceId = result.insertId;
      }

      await conn.commit();
      return deviceId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async validateDeviceActivity(userId, deviceId, pool) {
    const [activity] = await pool.query(
      `SELECT 
        COUNT(*) as loginCount,
        MAX(timestamp) as lastLogin
       FROM device_activity_log
       WHERE user_id = ? AND device_id = ?
       AND timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [userId, deviceId]
    );

    const hoursSinceLastLogin = activity[0].lastLogin 
      ? (Date.now() - new Date(activity[0].lastLogin)) / (1000 * 60 * 60)
      : 24;

    return {
      isValid: activity[0].loginCount < 10 && hoursSinceLastLogin >= 1,
      hoursSinceLastLogin,
      loginCount24h: activity[0].loginCount
    };
  }

  async logDeviceActivity(userId, deviceId, activityType, pool) {
    await pool.query(
      `INSERT INTO device_activity_log 
       (user_id, device_id, activity_type, timestamp)
       VALUES (?, ?, ?, NOW())`,
      [userId, deviceId, activityType]
    );
  }
}

export default new DeviceManager();
