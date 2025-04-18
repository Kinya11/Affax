// server.mjs
import { config } from "dotenv";
config({ path: "server_info.env" });
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import argon2 from "argon2";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import { fileURLToPath } from "url";
import { dirname } from "path";
import cookieParser from "cookie-parser";
import deviceRoutes from './routes/deviceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import rateLimit from 'express-rate-limit';
import geoip from 'geoip-lite';
import https from 'https';
import subscriptionRoutes from './routes/subscriptionRoutes.mjs';  // Note the .mjs extension
import pool from './db.mjs';  // Import the shared pool
const { lookup } = geoip;

const execAsync = promisify(exec);

const DEBUG = process.env.NODE_ENV === 'development';

// Initialize Express app
const app = express();
app.use(cookieParser());
const PORT = process.env.PORT || 5001;

// Configuration
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not defined");
  process.exit(1);
}

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Make pool available to routes
app.locals.pool = pool;

const requiredEnvVars = [
  "JWT_SECRET",
  "GOOGLE_CLIENT_ID",
  "DB_HOST",
  "DB_NAME",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL: Missing required environment variable ${envVar}`);
    process.exit(1);
  }
}
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const checkDeviceOrAdmin = async (req, res, next) => {
  try {
    const deviceId = req.headers['x-device-id']
    
    if (!deviceId && !req.user?.isAdmin) {
      return res.status(403).json({
        error: 'Device registration required',
        errorCode: 'DEVICE_NOT_REGISTERED'
      })
    }

    if (req.user?.isAdmin) {
      return next()
    }

    const [device] = await pool.query(
      'SELECT * FROM devices WHERE device_id = ? AND user_id = ?',
      [deviceId, req.user.userId]
    )

    if (!device.length) {
      return res.status(403).json({
        error: 'Device not registered or unauthorized',
        errorCode: 'DEVICE_NOT_AUTHORIZED'
      })
    }

    next()
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Create devices table if it doesn't exist
async function initializeDatabase() {
  try {
    // First create the users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        date_of_birth DATE,
        career_field VARCHAR(255),
        receive_emails BOOLEAN DEFAULT FALSE,
        auth_provider VARCHAR(50),
        google_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if plan_type column exists
    const [columns] = await pool.query(`
      SHOW COLUMNS FROM users WHERE Field = 'plan_type'
    `);

    // Add plan_type column if it doesn't exist
    if (columns.length === 0) {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN plan_type ENUM('free', 'basic', 'pro', 'enterprise') 
        DEFAULT 'free' NOT NULL
      `);
    }

    // Create user_activity_log table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activity_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        activity_type ENUM('registration', 'login', 'failed_login') NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )
    `);

    console.log("Database tables verified/created");
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}

// Call this before starting the server
initializeDatabase();

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Don't exit in development to allow for debugging
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
});

function getPlatform() {
  switch (process.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "macos";
    default:
      return "linux";
  }
}

// Middleware configuration
const corsOptions = {
  origin: process.env.NODE_ENV === "production"
    ? ["https://affax.app", "https://www.affax.app"]
    : ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Device-ID",
    "X-Device-Fingerprint",
    "X-Requested-With",
    "Accept",
    "X-Client-Version",
    "X-Device-Platform",
    "Origin"
  ],
  exposedHeaders: ["Authorization", "X-Device-Registration", "X-New-Token"],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Add debug logging for CORS
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    'content-type': req.headers['content-type']
  });
  next();
});

app.use(cors(corsOptions));

// Remove or modify the existing COOP and COEP headers for development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.removeHeader("Cross-Origin-Opener-Policy");
    res.removeHeader("Cross-Origin-Embedder-Policy");
    next();
  });
}

app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "https://accounts.google.com",
          "https://apis.google.com"
        ],
        "frame-src": ["'self'", "https://accounts.google.com"],
        "img-src": ["'self'", "data:", "https://lh3.googleusercontent.com"],
        "connect-src": [
          "'self'",
          "http://localhost:5001",
          "http://localhost:5173",
          "https://api.affax.app",
          "https://affax.app"
        ]
      }
    }
  })
);

app.use((req, res, next) => {
  res.header("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

// Authentication middleware
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Check if token is revoked
    const [revoked] = await pool
      .query("SELECT 1 FROM revoked_tokens WHERE token = ?", [token])
      .catch((err) => {
        if (err.code === "ER_NO_SUCH_TABLE") {
          console.warn(
            "revoked_tokens table missing - proceeding without revocation check"
          );
          return [[]];
        }
        throw err;
      });

    if (revoked.length) {
      return res.status(403).json({ error: "Token revoked" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { 
      userId: decoded.userId,
      isAdmin: decoded.isAdmin 
    };
    next();
  } catch (error) {
    console.error("Authentication error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ 
        error: "Token expired",
        code: "TOKEN_EXPIRED"
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ 
        error: "Invalid token",
        code: "INVALID_TOKEN"
      });
    }

    res.status(500).json({ 
      error: "Authentication failed",
      code: "AUTH_ERROR"
    });
  }
}

// Helper functions
function generateRandomPassword() {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

function generateDeviceId(req) {
  const components = [
    req.ip,
    req.headers["user-agent"],
    req.headers["accept-language"],
    Date.now().toString(36),
  ];
  return components.join("|").substring(0, 255);
}

app.use((req, res, next) => {
  console.log('Request:', {
    method: req.method,
    path: req.path,
    headers: {
      authorization: req.headers.authorization ? 'present' : 'missing',
      'x-device-id': req.headers['x-device-id'] || 'missing'
    }
  });
  next();
});

// ======================
// Installation Manager
// ======================
class InstallationManager {
  constructor() {
    // Cache platform on initialization
    this._platform = this.getPlatform();
    this.INSTALL_TIMEOUT = 30 * 60 * 1000; // 30 minutes per app
    this.MAX_RETRIES = 3;
    this.activeInstallations = new Map();
  }

  getPlatform() {
    switch (process.platform) {
      case 'win32': return 'windows';
      case 'darwin': return 'macos';
      default: return 'linux';
    }
  }

  async validateSudoPassword(sudoPassword) {
    if (DEBUG) {
      console.log('Attempting to validate password...');
    }
    
    const platform = this.getPlatform();
    
    try {
      if (platform === 'windows') {
        // On Windows, we can test admin rights using a harmless command
        const cmd = `powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList 'exit' -Wait"`;
        await execAsync(cmd);
        return true;
      } else {
        // Unix-like systems (Linux/macOS)
        const escapedPassword = sudoPassword.replace(/'/g, "'\"'\"'");
        const cmd = `echo '${escapedPassword}' | sudo -S -v`;
        
        await execAsync(cmd, {
          timeout: 5000,
          shell: '/bin/bash'
        });
        return true;
      }
    } catch (error) {
      if (DEBUG) {
        console.error('Password validation failed:', {
          platform,
          message: error.message,
          code: error.code,
          signal: error.signal,
          stderr: error.stderr
        });
      }
      return false;
    }
  }

  async checkDiskSpace() {
    try {
      let command;
      switch (process.platform) {
        case 'win32':
          command = 'wmic logicaldisk where "DeviceID=\'C:\'" get freespace /value';
          const { stdout: winOutput } = await execAsync(command);
          const freeBytes = parseInt(winOutput.match(/FreeSpace=(\d+)/)[1]);
          return (freeBytes / (1024 * 1024 * 1024)) > 1; // More than 1GB free
          
        case 'darwin':
          command = 'df -k / | tail -1 | awk \'{print $4}\'';
          const { stdout: macOutput } = await execAsync(command);
          const freeKB = parseInt(macOutput.trim());
          return (freeKB / (1024 * 1024)) > 1; // More than 1GB free
          
        default: // linux
          command = 'df -k / --output=avail | tail -1';
          const { stdout: linuxOutput } = await execAsync(command);
          const freeKBLinux = parseInt(linuxOutput.trim());
          return (freeKBLinux / (1024 * 1024)) > 1; // More than 1GB free
      }
    } catch (error) {
      console.error('Disk space check failed:', error);
      return true; // On error, allow installation to proceed
    }
  }

  async executeInstallCommand(command, sudoPassword, retryCount = 0) {
    try {
      // Parse command if it's a JSON string
      let platformCommand = command;
      if (typeof command === 'string' && command.startsWith('{')) {
        try {
          const commandObj = JSON.parse(command);
          platformCommand = commandObj[this._platform];
          if (!platformCommand) {
            throw new Error(`No command available for platform: ${this._platform}`);
          }
        } catch (parseError) {
          console.error('Command parsing error:', parseError);
          throw new Error('Invalid installation command format');
        }
      }

      switch (this._platform) {
        case 'windows':
          return execAsync(
            platformCommand.includes('winget') ? platformCommand : 
            `powershell -Command "Start-Process -Wait -Verb RunAs '${platformCommand}'"`,
            {
              shell: true,
              maxBuffer: 10 * 1024 * 1024,
              env: {
                ...process.env,
                POWERSHELL_TELEMETRY_OPTOUT: '1',
                POWERSHELL_UPDATECHECK: '0'
              }
            }
          );

        case 'macos':
          if (platformCommand.includes('||')) {
            const [brewCmd, dmgCmd] = platformCommand.split('||').map(cmd => cmd.trim());
            try {
              await execAsync(
                `echo "${sudoPassword.replace(/'/g, "'\\''")}" | sudo -S bash -c '${
                  dmgCmd.replace(/'/g, "'\\''")
                }'`, 
                { shell: '/bin/bash', maxBuffer: 10 * 1024 * 1024 }
              );
              return;
            } catch {
              return execAsync(brewCmd, { 
                shell: '/bin/bash', 
                maxBuffer: 10 * 1024 * 1024 
              });
            }
          }
          return execAsync(
            `echo "${sudoPassword.replace(/'/g, "'\\''")}" | sudo -S bash -c '${
              platformCommand.replace(/'/g, "'\\''")
            }'`,
            { shell: '/bin/bash', maxBuffer: 10 * 1024 * 1024 }
          );

        default: // linux
          // Properly escape the command for Linux
          const escapedCommand = platformCommand
            .replace(/'/g, "'\\''")
            .replace(/"/g, '\\"');
          
          return execAsync(
            `echo "${sudoPassword.replace(/'/g, "'\\''")}" | sudo -S bash -c "${escapedCommand}"`,
            { 
              shell: '/bin/bash', 
              maxBuffer: 10 * 1024 * 1024,
              env: { ...process.env, DEBIAN_FRONTEND: 'noninteractive' }
            }
          );
      }
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        const retryDelay = this._platform === 'windows' ? 1000 : 2000;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.executeInstallCommand(command, sudoPassword, retryCount + 1);
      }
      throw error;
    }
  }

  async startInstallation(installationId, apps, sudoPassword) {
    try {
      // Update initial status
      await pool.query(
        'UPDATE installations SET status = ?, progress = ?, apps_count = ? WHERE id = ?',
        ['installing', 0, apps.length, installationId]
      );

      this.activeInstallations.set(installationId, true);

      // Process apps in chunks
      const chunkSize = 50;
      for (let i = 0; i < apps.length; i += chunkSize) {
        const chunk = apps.slice(i, i + chunkSize);
        await this.installChunk(chunk, installationId, sudoPassword, i);

        // Check if installation was cancelled
        if (!this.activeInstallations.has(installationId)) {
          throw new Error('Installation cancelled');
        }
      }

      // Successful completion
      await pool.query(
        'UPDATE installations SET status = ?, progress = ?, end_time = NOW() WHERE id = ?',
        ['completed', 100, installationId]
      );

    } catch (error) {
      console.error('Installation error:', error);
      
      // Update installation status
      await pool.query(
        'UPDATE installations SET status = ?, error_log = ?, end_time = NOW() WHERE id = ?',
        ['failed', error.message || 'Installation failed', installationId]
      );

      throw error;
    } finally {
      this.activeInstallations.delete(installationId);
    }
  }

  async installChunk(apps, installationId, sudoPassword, offset) {
    // Prepare all commands first
    const installations = apps.map(app => ({
      command: app.install_command,
      index: apps.indexOf(app)
    }));

    for (const { command, index } of installations) {
      try {
        if (!this.activeInstallations.has(installationId)) {
          throw new Error('Installation cancelled');
        }

        await this.executeInstallCommand(command, sudoPassword);
        
        // Update progress less frequently
        const progress = Math.round(((offset + index + 1) / apps.length) * 100);
        if (progress % 10 === 0) {
          await pool.query(
            'UPDATE installations SET progress = ? WHERE id = ?',
            [progress, installationId]
          );
        }
      } catch (error) {
        await this.handleInstallationError(installationId, error);
        throw error;
      }
    }
  }

  async handleInstallationError(installationId, error) {
    try {
      await pool.query(
        `UPDATE installations 
         SET status = 'failed', 
             error_log = ?,
             end_time = NOW()
         WHERE id = ?`,
        [error.message, installationId]
      );
    } catch (dbError) {
      console.error('Failed to update installation status:', dbError);
    }
  }

  async cancelInstallation(installationId) {
    if (this.activeInstallations.has(installationId)) {
      this.activeInstallations.delete(installationId);
      await pool.query(
        'UPDATE installations SET status = ?, error_log = ?, end_time = NOW() WHERE id = ?',
        ['failed', 'Installation cancelled by user', installationId]
      );
    }
  }
}

// Rate limiting configuration
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: process.env.NODE_ENV === 'development' ? 20 : 5, // Higher limit in development
  message: {
    error: "Too many accounts created. Please try again later.",
    details: process.env.NODE_ENV === 'development' 
      ? "Maximum 20 accounts per hour per IP allowed in development"
      : "Maximum 5 accounts per hour per IP allowed"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${req.ip}-${req.headers['user-agent']}`;
  }
});

// Suspicious activity detection
const suspiciousPatterns = {
  userAgents: [
    /phantom/i,
    /selenium/i,
    /puppeteer/i,
    /playwright/i,
    /headless/i
  ],
  emails: [
    /\d{8,}@/i,
    /temp/i,
    /disposable/i
  ]
};

function isSuspiciousRequest(req) {
  const userAgent = req.headers['user-agent'] || '';
  const email = req.body.email || '';
  const ip = req.ip;
  
  if (suspiciousPatterns.userAgents.some(pattern => pattern.test(userAgent))) {
    return true;
  }
  
  if (suspiciousPatterns.emails.some(pattern => pattern.test(email))) {
    return true;
  }
  
  const geo = lookup(ip);
  if (geo && ['A1', 'A2'].includes(geo.country)) {
    return true;
  }
  
  return false;
}

// Routes
app.get("/api/hello", (req, res) => {
  console.log("✅ /api/hello route hit");
  res.json({ message: "Server is working!" });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: pool.pool.config.connectionConfig.database,
    version: process.env.npm_package_version,
  });
});

app.get("/api/db-health", async (req, res) => {
  try {
    console.log("Testing database connection...");
    const conn = await pool.getConnection();
    const [result] = await conn.query("SELECT 1 + 1 AS solution");
    conn.release();

    res.json({
      healthy: true,
      result: result[0].solution,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database health check failed:", error);
    res.status(500).json({
      healthy: false,
      error: error.message,
      details: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
      },
    });
  }
});

// Auth Routes
app.post("/api/auth/register", createAccountLimiter, async (req, res) => {
  try {
    console.log("Registration attempt:", {
      body: {
        ...req.body,
        password: '[REDACTED]' // Don't log the actual password
      },
      deviceId: req.headers['x-device-id'],
      ip: req.ip
    });

    const {
      firstName,
      lastName,
      email,
      password,
      dateOfBirth,
      careerField,
      receiveEmails,
    } = req.body;

    // Log validation state
    console.log("Validation check:", {
      hasFirstName: !!firstName,
      hasLastName: !!lastName,
      hasEmail: !!email,
      hasPassword: !!password,
      hasDateOfBirth: !!dateOfBirth
    });

    if (isSuspiciousRequest(req)) {
      console.log("Suspicious request detected");
      return res.status(403).json({ 
        error: "Registration denied",
        details: "Suspicious activity detected"
      });
    }

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !dateOfBirth) {
      console.log("Missing required fields");
      return res.status(400).json({ 
        error: "Missing required fields",
        details: {
          firstName: !firstName,
          lastName: !lastName,
          email: !email,
          password: !password,
          dateOfBirth: !dateOfBirth
        }
      });
    }

    // Check if user already exists
    const [existing] = await pool.query(
      "SELECT email FROM users WHERE email = ?",
      [email]
    );

    if (existing.length) {
      console.log("Email already registered:", email);
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashedPassword = await argon2.hash(password);

    const [result] = await pool.query(
      `INSERT INTO users 
       (first_name, last_name, email, password, date_of_birth, career_field, receive_emails, plan_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'free')`,
      [
        firstName,
        lastName,
        email,
        hashedPassword,
        dateOfBirth,
        careerField || null,
        receiveEmails || false,
      ]
    );

    console.log("User registered successfully:", {
      userId: result.insertId,
      email: email
    });

    await pool.query(
      `INSERT INTO user_activity_log (user_id, activity_type, ip_address, user_agent)
       VALUES (?, 'registration', ?, ?)`,
      [result.insertId, req.ip, req.headers['user-agent']]
    );

    res.status(201).json({
      success: true,
      message: "Registration successful",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Registration error:", {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      error: "Registration failed",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    if (!email || !password || !deviceId) {
      return res.status(400).json({ error: "Email, password and device_id required" });
    }

    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const validPassword = await argon2.verify(user.password, password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      { 
        userId: user.user_id,
        isAdmin: user.is_admin // Add admin status from DB
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1h" }
    );

    // Check device registration
    const [device] = await pool.query(
      `SELECT id FROM devices 
       WHERE user_id = ? AND device_id = ? AND is_active = TRUE`,
      [user.user_id, deviceId]
    );

    res.json({
      token,
      expires_in: 3600,
      user: {
        id: user.user_id,
        email: user.email,
        firstName: user.first_name,
        isAdmin: user.is_admin // Add this
      },
      requiresDeviceRegistration: device.length === 0
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/google-login", async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    console.log("Received google-login request:", {
      hasIdToken: !!req.body.id_token,
      deviceId: req.body.deviceId
    });

    // Validate request
    if (!req.body.id_token) {
      return res.status(400).json({ error: "Missing ID token" });
    }

    if (!req.body.deviceId || typeof req.body.deviceId !== 'string') {
      return res.status(400).json({ error: "Invalid device ID format" });
    }

    await connection.beginTransaction();

    // Verify the token
    let ticket;
    try {
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      ticket = await client.verifyIdToken({
        idToken: req.body.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (verifyError) {
      console.error("Token verification failed:", verifyError);
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const payload = ticket.getPayload();
    console.log("Google payload received:", {
      email: payload.email,
      sub: payload.sub
    });

    // Check if user exists
    let [users] = await connection.query(
      "SELECT * FROM users WHERE email = ?",
      [payload.email]
    );
    let user = users[0];

    // If user doesn't exist, create one
    if (!user) {
      const [result] = await connection.query(
        `INSERT INTO users (email, first_name, last_name, google_id) 
         VALUES (?, ?, ?, ?)`,
        [
          payload.email,
          payload.given_name || '',
          payload.family_name || '',
          payload.sub
        ]
      );

      [users] = await connection.query(
        "SELECT * FROM users WHERE user_id = ?",
        [result.insertId]
      );
      user = users[0];
    }

    // Check if device exists and is active
    const [devices] = await connection.query(
      "SELECT id FROM devices WHERE user_id = ? AND device_id = ? AND is_active = TRUE",
      [user.user_id, req.body.deviceId]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.user_id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await connection.commit();

    // Return success response
    res.json({
      token,
      user: {
        id: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      requiresDeviceRegistration: devices.length === 0
    });

  } catch (error) {
    await connection.rollback();
    console.error("Google login error:", error);
    res.status(500).json({ 
      error: "Internal server error during Google login",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

app.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies?.token;
    
    if (!token) {
      return res.status(400).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    await pool.query(
      "INSERT INTO revoked_tokens (token, expires_at, user_id) VALUES (?, ?, ?)",
      [token, new Date(decoded.exp * 1000), decoded.userId]
    );

    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }

    res.status(500).json({ error: "Logout failed" });
  }
});

app.get("/api/auth/verify", cors(corsOptions), async (req, res) => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies?.token;
    const deviceId = req.headers["x-device-id"];

    if (!token) {
      return res.json({ valid: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (deviceId && deviceId !== "default-device-id") {
      const [devices] = await pool.query(
        "SELECT id FROM devices WHERE user_id = ? AND device_id = ? AND is_active = TRUE",
        [decoded.userId, deviceId]
      );

      if (!devices.length) {
        return res.json({
          valid: true,
          user: decoded,
          deviceRegistered: false,
        });
      }
    }

    res.json({
      valid: true,
      user: decoded,
      deviceRegistered: true,
    });
  } catch (error) {
    res.json({ valid: false });
  }
});

// Device Routes
app.post("/api/devices/register", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { deviceId, deviceName, platform } = req.body;

    console.log('Device registration request:', {
      userId,
      deviceId,
      deviceName,
      platform
    });

    if (!deviceId || !platform) {
      return res.status(400).json({
        error: "Missing required fields",
        details: { required: ['deviceId', 'platform'] }
      });
    }

    // Get active devices count
    const [activeDevices] = await pool.query(
      "SELECT COUNT(*) as count FROM devices WHERE user_id = ? AND is_active = TRUE",
      [userId]
    );

    // Check device limit
    const DEVICE_LIMIT = 5;
    if (activeDevices[0].count >= DEVICE_LIMIT) {
      return res.status(429).json({
        error: 'Device limit reached',
        details: {
          current: activeDevices[0].count,
          limit: DEVICE_LIMIT
        }
      });
    }

    // Insert or update device
    await pool.query(`
      INSERT INTO devices (user_id, device_id, device_name, platform, is_active, last_active)
      VALUES (?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        device_name = VALUES(device_name),
        platform = VALUES(platform),
        is_active = TRUE,
        last_active = CURRENT_TIMESTAMP
    `, [userId, deviceId, deviceName || `${platform} Device`, platform]);

    res.json({
      success: true,
      details: {
        deviceId,
        deviceName: deviceName || `${platform} Device`,
        platform
      }
    });

  } catch (error) {
    console.error("Device registration error:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Handle specific MySQL errors
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        error: "Database setup required",
        details: "Devices table not found"
      });
    }
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: "Device already registered",
        details: "Duplicate device registration attempt"
      });
    }

    res.status(500).json({
      error: "Failed to register device",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get("/api/devices/check", authenticateToken, async (req, res) => {
  try {
    const deviceId = req.headers["x-device-id"];
    const userId = req.user.userId;

    if (!deviceId) {
      return res.status(400).json({
        registered: false,
        error: "No device ID provided"
      });
    }

    // Check if device exists with the same fingerprint
    const [devices] = await pool.query(
      `SELECT id, is_active, device_id 
       FROM devices 
       WHERE user_id = ? AND (device_id = ? OR device_id LIKE ?)`,
      [userId, deviceId, `${deviceId.split('|').slice(0, -1).join('|')}%`]
    );

    // If device exists but with different random component, use the stored device_id
    if (devices.length > 0) {
      const storedDevice = devices[0];
      res.json({
        registered: true,
        deviceId: storedDevice.device_id,
        userId: userId,
        existingDevice: true
      });
      return;
    }

    res.json({
      registered: false,
      deviceId: deviceId,
      userId: userId
    });

  } catch (error) {
    console.error("Device check error:", error);
    res.status(500).json({ error: "Failed to check device registration" });
  }
});

app.get("/api/devices", authenticateToken, async (req, res) => {
  try {
    const [devices] = await pool.query(
      `SELECT d.id, d.device_id as deviceId, d.device_name as deviceName, 
              d.platform, d.last_active as lastActive, d.is_active as isActive
       FROM devices d
       WHERE d.user_id = ? AND d.is_active = TRUE
       ORDER BY d.last_active DESC`,
      [req.user.userId]
    );

    // Get seat limit from subscription
    const [subscription] = await pool.query(
      `SELECT l.seat_limit
       FROM user_subscriptions us
       JOIN licenses l ON us.license_id = l.id
       WHERE us.user_id = ? AND us.status = 'active'
       LIMIT 1`,
      [req.user.userId]
    );

    const seatLimit = subscription.length ? subscription[0].seat_limit : 3; // Default to 3 if no subscription

    res.json({
      success: true,
      devices,
      seatLimit
    });

  } catch (error) {
    console.error("Error fetching devices:", error);
    res.status(500).json({ 
      error: "Failed to fetch devices",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// List Routes
app.get("/api/lists", authenticateToken, async (req, res) => {
  try {
    console.log("Fetching lists for user:", req.user.userId);
    const [lists] = await pool.query(
      "SELECT * FROM lists WHERE user_id = ?", 
      [req.user.userId]
    );
    
    // Always return an array, even if empty
    res.json(lists || []);
  } catch (error) {
    console.error("List fetch error:", error);
    res.status(500).json({
      error: "Failed to load lists",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

app.post("/api/lists", authenticateToken, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [userPlan] = await conn.query(
        "SELECT plan_type FROM users WHERE user_id = ?",
        [req.user.userId]
      );

      const [listCount] = await conn.query(
        "SELECT COUNT(*) as count FROM lists WHERE user_id = ?",
        [req.user.userId]
      );

      const planLimits = {
        free: 2,
        basic: 5,
        pro: 15,
        enterprise: 50
      };

      const userPlanType = userPlan[0]?.plan_type || 'free';
      const maxLists = planLimits[userPlanType];

      if (listCount[0].count >= maxLists) {
        await conn.rollback();
        return res.status(403).json({
          error: "List limit reached",
          details: {
            current: listCount[0].count,
            limit: maxLists,
            planType: userPlanType
          }
        });
      }

      const [result] = await conn.query(
        "INSERT INTO lists (user_id, name) VALUES (?, ?)",
        [req.user.userId, req.body.name]
      );

      await conn.commit();

      res.status(201).json({
        id: result.insertId,
        name: req.body.name,
        user_id: req.user.userId,
      });
    } catch (error) {
      await conn.rollback();
      console.error("List creation error:", error);
      res.status(500).json({ error: "Failed to create list" });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("List creation error:", error);
    res.status(500).json({ error: "Failed to create list" });
  }
});

app.get("/api/lists/:id", authenticateToken, async (req, res) => {
  try {
    const [list] = await pool.query(
      "SELECT * FROM lists WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.userId]
    );
    res.json(list[0] || {});
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch list" });
  }
});

app.put("/api/lists/:id", authenticateToken, async (req, res) => {
  try {
    await pool.execute(
      "UPDATE lists SET name = ? WHERE id = ? AND user_id = ?",
      [req.body.name, req.params.id, req.user.userId]
    );
    res.sendStatus(204);
  } catch (error) {
    console.error("Error updating list:", error);
    res.status(500).json({ error: "Failed to update list" });
  }
});

app.delete("/api/lists/:id", authenticateToken, async (req, res) => {
  try {
    await pool.execute("DELETE FROM lists WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.user.userId,
    ]);
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting list:", error);
    res.status(500).json({ error: "Failed to delete list" });
  }
});

// List Items Routes
app.get("/api/lists/:id/items", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [items] = await pool.query(
      `SELECT a.id AS app_id, a.name, a.file_size_kb, a.icon_url 
       FROM list_items li
       JOIN apps a ON li.app_id = a.id
       WHERE li.list_id = ?
       LIMIT ? OFFSET ?`,
      [req.params.id, parseInt(limit), offset]
    );

    const [total] = await pool.query(
      `SELECT COUNT(*) AS count 
       FROM list_items 
       WHERE list_id = ?`,
      [req.params.id]
    );

    res.json({
      items,
      total: total[0].count,
      page: parseInt(page),
      totalPages: Math.ceil(total[0].count / limit),
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Failed to load list items" });
  }
});

app.post("/api/lists/:id/items", authenticateToken, async (req, res) => {
  try {
    const listId = req.params.id;
    const appIds = req.body.appIds;

    const [list] = await pool.query(
      "SELECT id FROM lists WHERE id = ? AND user_id = ?",
      [listId, req.user.userId]
    );

    if (!list.length) {
      return res.status(404).json({ error: "List not found" });
    }

    const [existingItems] = await pool.query(
      "SELECT app_id FROM list_items WHERE list_id = ? AND app_id IN (?)",
      [listId, appIds]
    );

    const existingAppIds = existingItems.map((item) => item.app_id);
    const newAppIds = appIds.filter((id) => !existingAppIds.includes(id));

    if (newAppIds.length === 0) {
      return res
        .status(400)
        .json({ error: "All selected apps are already in the list" });
    }

    const values = newAppIds.map((appId) => [listId, appId]);
    await pool.query("INSERT INTO list_items (list_id, app_id) VALUES ?", [
      values,
    ]);

    const [newItems] = await pool.query(
      `SELECT a.id AS app_id, a.name, a.file_size_kb, a.icon_url 
       FROM apps a
       WHERE a.id IN (?)`,
      [newAppIds]
    );

    res.status(201).json(newItems);
  } catch (error) {
    console.error("Error adding apps to list:", error);
    res.status(500).json({
      error: "Failed to add apps to list",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

app.get('/api/test-parsing', async (req, res) => {
  try {
    const [app] = await pool.query(
      "SELECT install_command FROM apps WHERE name = 'Mozilla Firefox'"
    );
    
    const command = app[0].install_command;
    const cleaned = command
      .replace(/^[\s\S]*?({[\s\S]*})[\s\S]*$/, '$1')
      .replace(/\\n/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    res.json({
      raw: command,
      cleaned: cleaned,
      parsed: JSON.parse(cleaned)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete(
  "/api/lists/:listId/items/:appId",
  authenticateToken,
  async (req, res) => {
    try {
      const { listId, appId } = req.params;
      const userId = req.user.userId;

      const [list] = await pool.query(
        "SELECT id FROM lists WHERE id = ? AND user_id = ?",
        [listId, userId]
      );

      if (!list.length) {
        return res.status(404).json({ error: "List not found" });
      }

      const [result] = await pool.query(
        "DELETE FROM list_items WHERE list_id = ? AND app_id = ?",
        [listId, appId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "App not found in list" });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting app from list:", error);
      res.status(500).json({
        error: "Failed to delete app from list",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// App Routes
app.get("/api/apps", authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    // Get total count with search
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM apps 
       WHERE name LIKE ? OR description LIKE ?`,
      [`%${search}%`, `%${search}%`]
    );

    // Get paginated results
    const [apps] = await pool.query(
      `SELECT id, name, file_size_kb, icon_url, description, website
       FROM apps
       WHERE name LIKE ? OR description LIKE ?
       ORDER BY name ASC
       LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, limit, offset]
    );

    res.json({
      items: apps,
      total: countResult[0].total,
      page,
      pages: Math.ceil(countResult[0].total / limit)
    });
  } catch (error) {
    console.error("Error fetching apps:", error);
    res.status(500).json({ error: "Failed to fetch apps" });
  }
});

app.get("/api/apps/:id", authenticateToken, async (req, res) => {
  try {
    const [app] = await pool.query("SELECT * FROM apps WHERE id = ?", [
      req.params.id,
    ]);
    res.json(app[0] || null);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch app" });
  }
});

app.post("/api/apps", authenticateToken, async (req, res) => {
  try {
    const { id, name, file_size_kb } = req.body;
    const [result] = await pool.query(
      "INSERT INTO apps (id, name, file_size_kb) VALUES (?, ?, ?)",
      [id, name, file_size_kb]
    );
    res.status(201).json({ id, name, file_size_kb });
  } catch (error) {
    console.error("Error creating app:", error);
    res.status(500).json({ error: "Failed to create app" });
  }
});

// Make yourself an admin by calling this endpoint
app.post('/api/make-admin/:email', async (req, res) => {
  try {
    // Add some basic security - maybe check if it's running in development
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Only available in development' });
    }
    
    await pool.query(
      'UPDATE users SET is_admin = TRUE WHERE email = ?',
      [req.params.email]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set admin' });
  }
});

// Installation Routes
app.post("/api/lists/:listId/install", 
  authenticateToken, 
  checkDeviceOrAdmin, 
  async (req, res) => {
    console.log('Install request:', {
      userId: req.user?.userId,
      deviceId: req.headers['x-device-id'],
      listId: req.params.listId
    })
    
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { listId } = req.params;
      const { sudoPassword } = req.body;
      
      if (!sudoPassword) {
        await conn.rollback();
        return res.status(400).json({
          error: "Sudo password is required",
          errorCode: "MISSING_PASSWORD"
        });
      }

      const installationManager = new InstallationManager();
      
      try {
        const isValidPassword = await installationManager.validateSudoPassword(sudoPassword);
        
        if (!isValidPassword) {
          await conn.rollback();
          return res.status(403).json({
            error: "Incorrect Password",
            errorCode: "INVALID_PASSWORD"
          });
        }
      } catch (error) {
        console.error('Password validation error:', error);
        await conn.rollback();
        return res.status(500).json({
          error: "Failed to validate password",
          errorCode: "VALIDATION_ERROR"
        });
      }

      // Get apps with valid install commands
      const [apps] = await conn.query(
        `SELECT a.id, a.name, a.install_command 
         FROM list_items li
         JOIN apps a ON li.app_id = a.id
         WHERE li.list_id = ? AND a.install_command IS NOT NULL
         AND JSON_VALID(a.install_command)`,
        [listId]
      );

      if (!apps.length) {
        await conn.rollback();
        return res.status(400).json({
          error: "No valid apps to install",
          errorCode: "NO_VALID_APPS"
        });
      }

      // Create installation record
      const [result] = await conn.query(
        `INSERT INTO installations 
         (user_id, device_id, list_id, status, apps_count)
         VALUES (?, ?, ?, 'pending', ?)`,
        [req.user.userId, req.headers["x-device-id"], listId, apps.length]
      );

      await conn.commit();

      // Start installation in background
      installationManager
        .startInstallation(result.insertId, apps, sudoPassword)
        .catch((err) => {
          console.error("Background installation error:", err);
          pool.query(
            'UPDATE installations SET status = ?, error_log = ? WHERE id = ?',
            ['failed', err.message || 'Installation failed', result.insertId]
          ).catch(console.error);
        });

      res.json({
        success: true,
        installationId: result.insertId,
        totalApps: apps.length
      });

    } catch (error) {
      await conn.rollback();
      console.error("Installation error:", error);
      res.status(500).json({
        error: "Installation failed to start",
        errorCode: "INSTALLATION_FAILED",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      conn.release();
    }
  });

app.get(
  "/api/installations/:id/status",
  authenticateToken,
  async (req, res) => {
    try {
      const [installation] = await pool.query(
        `SELECT status, progress, apps_count, error_log
       FROM installations WHERE id = ?`,
        [req.params.id]
      );

      if (!installation.length) {
        return res.status(404).json({ error: "Installation not found" });
      }

      res.json({
        status: installation[0].status,
        progress: installation[0].progress,
        total: installation[0].apps_count,
        error: installation[0].error_log,
      });
    } catch (error) {
      console.error("Status check error:", error);
      res.status(500).json({
        error: "Status check failed",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

app.post("/api/installations/:id/cancel", authenticateToken, async (req, res) => {
  try {
    const installationId = req.params.id;
    
    // Verify user owns this installation
    const [installation] = await pool.query(
      'SELECT user_id FROM installations WHERE id = ?',
      [installationId]
    );

    if (!installation.length || installation[0].user_id !== req.user.userId) {
      return res.status(404).json({ error: "Installation not found" });
    }

    await installationManager.cancelInstallation(installationId);
    res.json({ success: true });

  } catch (error) {
    console.error("Cancellation error:", error);
    res.status(500).json({ error: "Failed to cancel installation" });
  }
});

// Device Middleware
app.use(async (req, res, next) => {
  if (!req.path.startsWith("/api") || req.path.includes("/auth")) {
    return next();
  }

  if (req.deviceProcessed) {
    return next();
  }

  const deviceId = req.headers["x-device-id"] || generateDeviceId(req);
  req.deviceId = deviceId;

  if (req.user?.userId) {
    try {
      const [device] = await pool.query(
        `SELECT id FROM devices 
         WHERE user_id = ? AND device_id = ?`,
        [req.user.userId, deviceId]
      );

      if (!device.length) {
        const [subscription] = await pool.query(
          `SELECT l.seat_limit, COUNT(d.id) as used_seats
           FROM user_subscriptions us
           JOIN licenses l ON us.license_id = l.id
           LEFT JOIN devices d ON d.user_id = us.user_id AND d.is_active = TRUE
           WHERE us.user_id = ? AND us.status = 'active'
           GROUP BY us.id`,
          [req.user.userId]
        );

        if (subscription.length) {
          const { seat_limit, used_seats } = subscription[0];
          if (used_seats < seat_limit) {
            await pool.query(
              `INSERT INTO devices 
               (user_id, device_id, device_name, platform, last_active)
               VALUES (?, ?, ?, ?, NOW())`,
              [
                req.user.userId,
                deviceId,
                req.headers["x-device-name"] || "Unknown Device",
                req.headers["x-platform"] || "Unknown",
              ]
            );
          }
        }
      } else {
        await pool.query(
          `UPDATE devices SET last_active = NOW() WHERE id = ?`,
          [device[0].id]
        );
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  req.deviceProcessed = true;
  next();
});

// Error Handling
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    error: err.message,
    errorCode: err.code,
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Cleanup expired tokens every hour
setInterval(async () => {
  try {
    await pool.query("DELETE FROM revoked_tokens WHERE expires_at < NOW()");
    console.log("Cleaned up expired tokens");
  } catch (err) {
    console.error("Token cleanup error:", err);
  }
}, 3600000);

// Add some debug logging
console.log('Routes mounted:', app._router.stack.map(r => r.route?.path || r.name).filter(Boolean));

// Mount device routes
app.use('/api/devices', deviceRoutes);

// Mount payment routes
app.use('/api/payment', paymentRoutes);

// Mount the subscription routes
app.use('/api/subscription', subscriptionRoutes);

// Handle 404 for undefined API routes
app.use('/api/*', (req, res) => {
  console.log('404 hit:', req.method, req.path);
  res.status(404).json({ error: 'API endpoint not found' });
});

// Create HTTP server
const httpServer = app.listen(PORT, () => {
  console.log(`HTTP Server running on http://localhost:${PORT}`);
});

// Only create HTTPS server if SSL files exist
if (process.env.NODE_ENV === 'production' || process.env.SSL_ENABLED === 'true') {
  try {
    const sslOptions = {
      key: fs.readFileSync(path.join(__dirname, '../ssl/private.key')),
      cert: fs.readFileSync(path.join(__dirname, '../ssl/certificate.crt')),
      ca: fs.readFileSync(path.join(__dirname, '../ssl/ca_bundle.crt'))
    };

    const httpsServer = https.createServer(sslOptions, app).listen(PORT + 1, () => {
      console.log(`HTTPS Server running on https://localhost:${PORT + 1}`);
    });
  } catch (error) {
    console.warn('SSL files not found, HTTPS server not started');
  }
}
