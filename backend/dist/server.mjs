// server.mjs
import { config } from "dotenv";
config({ path: "server_info.env" });
import express from "express";
import mysql from "mysql2/promise";
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
import { exec } from "child_process";
// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});
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
const checkDeviceOrAdmin = async (req, res, next) => {
    if (req.user?.isAdmin) {
        return next();
    }
    // Original device check logic
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
        return res.status(403).json({ error: 'Device ID required' });
    }
    const [device] = await pool.query(`SELECT id FROM devices 
     WHERE user_id = ? AND device_id = ? AND is_active = TRUE`, [req.user.userId, deviceId]);
    if (!device.length) {
        return res.status(403).json({ error: 'Device not registered' });
    }
    next();
};
// Create devices table if it doesn't exist
async function initializeDatabase() {
    try {
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await pool.query(`
      CREATE TABLE IF NOT EXISTS lists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);
        await pool.query(`
      CREATE TABLE IF NOT EXISTS apps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        file_size_kb INT,
        icon_url VARCHAR(255),
        download_url VARCHAR(255),
        install_command TEXT,
        description TEXT,
        website VARCHAR(255),
        INDEX name_idx (name),
        INDEX size_idx (file_size_kb)
      )
    `);
        await pool.query(`
      CREATE TABLE IF NOT EXISTS list_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        list_id INT NOT NULL,
        app_id INT NOT NULL,
        installation_order INT,
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
        FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
        UNIQUE KEY (list_id, app_id),
        INDEX list_app_idx (list_id, app_id)
      )
    `);
        await pool.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        device_name VARCHAR(255),
        platform VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        last_active TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE KEY (user_id, device_id)
      )
    `);
        await pool.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        seat_limit INT NOT NULL,
        price DECIMAL(10,2) NOT NULL
      )
    `);
        await pool.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        license_id INT NOT NULL,
        status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (license_id) REFERENCES licenses(id)
      )
    `);
        await pool.query(`
      CREATE TABLE IF NOT EXISTS installations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        list_id INT NOT NULL,
        status ENUM('pending', 'installing', 'completed', 'failed') DEFAULT 'pending',
        progress INT DEFAULT 0,
        apps_count INT NOT NULL,
        error_log TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
      )
    `);
        await pool.query(`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        user_id INT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);
        console.log("Database tables verified/created");
    }
    catch (error) {
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
        ? "https://your-production-domain.com"
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
    ],
    exposedHeaders: ["Authorization", "X-Device-Registration", "X-New-Token"],
    maxAge: 86400,
};
app.options("*", cors(corsOptions));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(helmet({
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
            ],
            "frame-src": ["'self'", "https://accounts.google.com"],
            "img-src": ["'self'", "data:", "https://lh3.googleusercontent.com"],
            "connect-src": [
                "'self'",
                "http://localhost:5001",
                "http://localhost:5173",
            ],
        },
    },
}));
app.use((req, res, next) => {
    res.header("Cross-Origin-Embedder-Policy", "unsafe-none");
    res.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    next();
});
// Authentication middleware
async function authenticateToken(req, res, next) {
    try {
        // Get token from either header or cookie
        const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;
        if (!token) {
            return res.status(401).json({ error: "No token provided" });
        }
        // Check if token is revoked
        const [revoked] = await pool
            .query("SELECT 1 FROM revoked_tokens WHERE token = ?", [token])
            .catch((err) => {
            if (err.code === "ER_NO_SUCH_TABLE") {
                console.warn("revoked_tokens table missing - proceeding without revocation check");
                return [[]];
            }
            throw err;
        });
        if (revoked.length) {
            return res.status(403).json({ error: "Token revoked" });
        }
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { userId: decoded.userId };
        next();
    }
    catch (error) {
        console.error("Authentication error:", error);
        if (error.name === "JsonWebTokenError") {
            return res.status(403).json({ error: "Invalid token" });
        }
        if (error.name === "TokenExpiredError") {
            return res.status(403).json({ error: "Token expired" });
        }
        res.status(500).json({ error: "Authentication failed" });
    }
}
// Helper functions
function generateRandomPassword() {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
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
async function runInstallCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Install failed: ${stderr}`);
                reject(error);
            }
            else {
                console.log(`Install success: ${stdout}`);
                resolve();
            }
        });
    });
}
// ======================
// Installation Manager
// ======================
class InstallationManager {
    constructor() {
        this.activeInstallations = new Map();
    }
    getPlatform() {
        switch (process.platform) {
            case 'win32': return 'windows';
            case 'darwin': return 'macos';
            case 'linux': return 'linux';
            default: return 'linux';
        }
    }
    async executeInstallCommand(commandTemplate, sudoPassword) {
        try {
            // Log the incoming command template for debugging
            console.log('Raw command template:', commandTemplate);
            let commands;
            try {
                // If the command is a string, parse it
                if (typeof commandTemplate === 'string') {
                    // Remove any BOM and normalize whitespace
                    let cleanJson = commandTemplate.trim().replace(/^\uFEFF/, '');
                    // If the string doesn't start with {, assume it's wrapped
                    if (!cleanJson.startsWith('{')) {
                        const jsonMatch = cleanJson.match(/({[\s\S]*})/);
                        if (!jsonMatch) {
                            throw new Error('Could not find valid JSON object in command template');
                        }
                        cleanJson = jsonMatch[1];
                    }
                    // Parse the JSON
                    commands = JSON.parse(cleanJson);
                }
                else if (typeof commandTemplate === 'object') {
                    commands = commandTemplate;
                }
                else {
                    throw new Error('Command template must be either a string or an object');
                }
                // Validate the commands object
                if (!commands || typeof commands !== 'object') {
                    throw new Error('Invalid command format: must be an object with platform-specific commands');
                }
                // Get the appropriate command for the current platform
                const platform = process.platform === 'win32' ? 'windows' :
                    process.platform === 'darwin' ? 'macos' : 'linux';
                let command = commands[platform];
                // Validate the command
                if (!command) {
                    throw new Error(`No installation command available for ${platform}`);
                }
                console.log(`Executing command for ${platform}:`, command);
                // For non-Windows platforms, prefix with sudo -S
                if (platform !== 'windows') {
                    command = `echo "${sudoPassword}" | sudo -S bash -c '${command.replace(/'/g, "'\\''")}'`;
                }
                // Execute the command
                return new Promise((resolve, reject) => {
                    exec(command, {
                        shell: true,
                        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
                    }, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`Command execution failed:`, stderr);
                            reject(new Error(stderr || error.message));
                        }
                        else {
                            console.log(`Command executed successfully:`, stdout);
                            resolve(stdout);
                        }
                    });
                });
            }
            catch (parseError) {
                console.error('Command parsing error:', parseError);
                throw new Error(`Invalid command format: ${parseError.message}`);
            }
        }
        catch (error) {
            console.error('Installation error:', error);
            throw error;
        }
    }
    async startInstallation(installationId, apps, sudoPassword) {
        // Process apps in chunks to avoid memory issues
        const chunkSize = 50;
        for (let i = 0; i < apps.length; i += chunkSize) {
            const chunk = apps.slice(i, i + chunkSize);
            await this.installChunk(chunk, installationId, sudoPassword, i);
        }
    }
    async installChunk(apps, installationId, sudoPassword, offset) {
        for (const app of apps) {
            try {
                await this.executeInstallCommand(app.install_command, sudoPassword);
                // Update progress in batches
                const progress = Math.round(((offset + apps.indexOf(app) + 1) / apps.length) * 100);
                if (progress % 5 === 0) { // Update every 5% progress
                    await pool.query('UPDATE installations SET progress = ?, status = ? WHERE id = ?', [progress, progress === 100 ? 'completed' : 'installing', installationId]);
                }
            }
            catch (error) {
                await this.handleInstallationError(installationId, error);
                throw error;
            }
        }
    }
    async handleInstallationError(installationId, error) {
        try {
            await pool.query(`UPDATE installations 
         SET status = 'failed', 
             error_log = ?,
             end_time = NOW()
         WHERE id = ?`, [error.message, installationId]);
        }
        catch (dbError) {
            console.error('Failed to update installation status:', dbError);
        }
    }
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
    }
    catch (error) {
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
app.post("/api/auth/register", async (req, res) => {
    try {
        const { firstName, lastName, email, password, dateOfBirth, careerField, receiveEmails, } = req.body;
        // Validate required fields
        if (!firstName || !lastName || !email || !password || !dateOfBirth) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Check if user already exists
        const [existing] = await pool.query("SELECT email FROM users WHERE email = ?", [email]);
        if (existing.length) {
            return res.status(409).json({ error: "Email already registered" });
        }
        // Hash password
        const hashedPassword = await argon2.hash(password);
        // Insert new user
        const [result] = await pool.query(`INSERT INTO users 
       (first_name, last_name, email, password, date_of_birth, career_field, receive_emails)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            firstName,
            lastName,
            email,
            hashedPassword,
            dateOfBirth,
            careerField || null,
            receiveEmails || false,
        ]);
        res.status(201).json({
            message: "Registration successful",
            userId: result.insertId,
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            error: "Registration failed",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
});
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password required" });
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
        const token = jwt.sign({
            userId: user.user_id,
            isAdmin: user.is_admin // Add admin status from DB
        }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.json({
            token,
            expires_in: 3600,
            user: {
                id: user.user_id,
                email: user.email,
                firstName: user.first_name,
                isAdmin: user.is_admin // Add this
            }
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
app.post("/api/auth/google-login", async (req, res) => {
    try {
        if (!req.body.id_token) {
            return res.status(400).json({ error: "Missing ID token" });
        }
        const ticket = await client.verifyIdToken({
            idToken: req.body.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        console.log("Google payload:", payload);
        if (!payload?.email) {
            return res.status(400).json({ error: "Invalid Google payload" });
        }
        // Find or create user
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [payload.email]);
        let user = users[0];
        if (!user) {
            // Create new user
            const [result] = await pool.query("INSERT INTO users (email, first_name, last_name, google_id) VALUES (?, ?, ?, ?)", [payload.email, payload.given_name, payload.family_name, payload.sub]);
            user = {
                user_id: result.insertId,
                email: payload.email,
                first_name: payload.given_name,
                last_name: payload.family_name,
                google_id: payload.sub
            };
        }
        // Generate JWT token
        const token = jwt.sign({
            userId: user.user_id,
            isAdmin: user.is_admin || false
        }, process.env.JWT_SECRET, { expiresIn: "1h" });
        // Send response
        res.json({
            token,
            user: {
                id: user.user_id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                isAdmin: user.is_admin || false
            }
        });
    }
    catch (error) {
        console.error("Google login error:", error);
        res.status(500).json({
            error: "Authentication failed",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});
app.post("/api/auth/logout", authenticateToken, async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;
        if (!token) {
            return res.status(400).json({ error: "No token provided" });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await pool.query("INSERT INTO revoked_tokens (token, expires_at, user_id) VALUES (?, ?, ?)", [token, new Date(decoded.exp * 1000), decoded.userId]);
        res.clearCookie("token", {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
        });
        res.json({ message: "Logged out successfully" });
    }
    catch (error) {
        console.error("Logout error:", error);
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ error: "Invalid token" });
        }
        res.status(500).json({ error: "Logout failed" });
    }
});
app.get("/api/auth/verify", cors(corsOptions), async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;
        const deviceId = req.headers["x-device-id"];
        if (!token) {
            return res.json({ valid: false });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (deviceId && deviceId !== "default-device-id") {
            const [devices] = await pool.query("SELECT id FROM devices WHERE user_id = ? AND device_id = ? AND is_active = TRUE", [decoded.userId, deviceId]);
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
    }
    catch (error) {
        res.json({ valid: false });
    }
});
// Device Routes
app.post("/api/devices/register", authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const { deviceId, deviceName, platform } = req.body;
        // Validate required fields
        if (!deviceId || !platform) {
            return res.status(400).json({
                error: "Missing required fields",
                details: { required: ['deviceId', 'platform'] }
            });
        }
        // Debug logging
        console.log('Registration attempt:', {
            userId,
            deviceId: deviceId.substring(0, 50) + '...', // Truncated for logging
            deviceName,
            platform
        });
        // First, ensure the devices table exists
        await pool.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        device_name VARCHAR(255),
        platform VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_device (user_id, device_id)
      )
    `);
        // Check if device already exists
        const [existingDevice] = await pool.query(`SELECT id FROM devices 
       WHERE user_id = ? AND device_id = ?`, [userId, deviceId]);
        console.log('Existing device check:', {
            found: existingDevice.length > 0,
            deviceCount: existingDevice.length
        });
        if (existingDevice.length) {
            // Update existing device
            await pool.query(`UPDATE devices 
         SET device_name = ?, 
             platform = ?, 
             is_active = TRUE, 
             last_active = CURRENT_TIMESTAMP
         WHERE id = ?`, [
                deviceName || `${platform} Device`,
                platform,
                existingDevice[0].id
            ]);
            console.log('Updated existing device:', existingDevice[0].id);
        }
        else {
            // Register new device
            const [result] = await pool.query(`INSERT INTO devices 
         (user_id, device_id, device_name, platform, is_active, last_active)
         VALUES (?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP)`, [
                userId,
                deviceId,
                deviceName || `${platform} Device`,
                platform
            ]);
            console.log('Created new device:', result.insertId);
        }
        res.json({
            success: true,
            message: "Device registered successfully",
            details: {
                deviceId,
                deviceName: deviceName || `${platform} Device`,
                platform
            }
        });
    }
    catch (error) {
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
        const [device] = await pool.query(`SELECT id, is_active 
       FROM devices 
       WHERE user_id = ? AND device_id = ? AND is_active = TRUE`, [userId, deviceId]);
        res.json({
            registered: device.length > 0,
            deviceId: deviceId,
            userId: userId
        });
    }
    catch (error) {
        console.error("Device check error:", error);
        res.status(500).json({
            registered: false,
            error: "Failed to check device registration"
        });
    }
});
// List Routes
app.get("/api/lists", authenticateToken, async (req, res) => {
    try {
        console.log("Fetching lists for user:", req.user.userId);
        const [lists] = await pool.query("SELECT * FROM lists WHERE user_id = ?", [
            req.user.userId,
        ]);
        console.log("Found lists:", lists);
        res.json(lists);
    }
    catch (error) {
        console.error("List fetch error:", error);
        res.status(500).json({
            error: "Failed to load lists",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
});
app.post("/api/lists", authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.query("INSERT INTO lists (user_id, name) VALUES (?, ?)", [req.user.userId, req.body.name]);
        res.status(201).json({
            id: result.insertId,
            name: req.body.name,
            user_id: req.user.userId,
        });
    }
    catch (error) {
        console.error("List creation error:", error);
        res.status(500).json({ error: "Failed to create list" });
    }
});
app.get("/api/lists/:id", authenticateToken, async (req, res) => {
    try {
        const [list] = await pool.query("SELECT * FROM lists WHERE id = ? AND user_id = ?", [req.params.id, req.user.userId]);
        res.json(list[0] || {});
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch list" });
    }
});
app.put("/api/lists/:id", authenticateToken, async (req, res) => {
    try {
        await pool.execute("UPDATE lists SET name = ? WHERE id = ? AND user_id = ?", [req.body.name, req.params.id, req.user.userId]);
        res.sendStatus(204);
    }
    catch (error) {
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
    }
    catch (error) {
        console.error("Error deleting list:", error);
        res.status(500).json({ error: "Failed to delete list" });
    }
});
// List Items Routes
app.get("/api/lists/:id/items", authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        const [items] = await pool.query(`SELECT a.id AS app_id, a.name, a.file_size_kb, a.icon_url 
       FROM list_items li
       JOIN apps a ON li.app_id = a.id
       WHERE li.list_id = ?
       LIMIT ? OFFSET ?`, [req.params.id, parseInt(limit), offset]);
        const [total] = await pool.query(`SELECT COUNT(*) AS count 
       FROM list_items 
       WHERE list_id = ?`, [req.params.id]);
        res.json({
            items,
            total: total[0].count,
            page: parseInt(page),
            totalPages: Math.ceil(total[0].count / limit),
        });
    }
    catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Failed to load list items" });
    }
});
app.post("/api/lists/:id/items", authenticateToken, async (req, res) => {
    try {
        const listId = req.params.id;
        const appIds = req.body.appIds;
        const [list] = await pool.query("SELECT id FROM lists WHERE id = ? AND user_id = ?", [listId, req.user.userId]);
        if (!list.length) {
            return res.status(404).json({ error: "List not found" });
        }
        const [existingItems] = await pool.query("SELECT app_id FROM list_items WHERE list_id = ? AND app_id IN (?)", [listId, appIds]);
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
        const [newItems] = await pool.query(`SELECT a.id AS app_id, a.name, a.file_size_kb, a.icon_url 
       FROM apps a
       WHERE a.id IN (?)`, [newAppIds]);
        res.status(201).json(newItems);
    }
    catch (error) {
        console.error("Error adding apps to list:", error);
        res.status(500).json({
            error: "Failed to add apps to list",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
});
app.get('/api/test-parsing', async (req, res) => {
    try {
        const [app] = await pool.query("SELECT install_command FROM apps WHERE name = 'Mozilla Firefox'");
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
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.delete("/api/lists/:listId/items/:appId", authenticateToken, async (req, res) => {
    try {
        const { listId, appId } = req.params;
        const userId = req.user.userId;
        const [list] = await pool.query("SELECT id FROM lists WHERE id = ? AND user_id = ?", [listId, userId]);
        if (!list.length) {
            return res.status(404).json({ error: "List not found" });
        }
        const [result] = await pool.query("DELETE FROM list_items WHERE list_id = ? AND app_id = ?", [listId, appId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "App not found in list" });
        }
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error("Error deleting app from list:", error);
        res.status(500).json({
            error: "Failed to delete app from list",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
});
// App Routes
app.get("/api/apps", authenticateToken, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    try {
        // Get total count with search
        const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM apps 
       WHERE name LIKE ? OR description LIKE ?`, [`%${search}%`, `%${search}%`]);
        // Get paginated results
        const [apps] = await pool.query(`SELECT id, name, file_size_kb, icon_url, description, website
       FROM apps
       WHERE name LIKE ? OR description LIKE ?
       ORDER BY name ASC
       LIMIT ? OFFSET ?`, [`%${search}%`, `%${search}%`, limit, offset]);
        res.json({
            items: apps,
            total: countResult[0].total,
            page,
            pages: Math.ceil(countResult[0].total / limit)
        });
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch app" });
    }
});
app.post("/api/apps", authenticateToken, async (req, res) => {
    try {
        const { id, name, file_size_kb } = req.body;
        const [result] = await pool.query("INSERT INTO apps (id, name, file_size_kb) VALUES (?, ?, ?)", [id, name, file_size_kb]);
        res.status(201).json({ id, name, file_size_kb });
    }
    catch (error) {
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
        await pool.query('UPDATE users SET is_admin = TRUE WHERE email = ?', [req.params.email]);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to set admin' });
    }
});
// Installation Routes
app.post("/api/lists/:listId/install", authenticateToken, checkDeviceOrAdmin, async (req, res) => {
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
        // Get apps with valid install commands
        const [apps] = await conn.query(`SELECT a.id, a.name, a.install_command 
       FROM list_items li
       JOIN apps a ON li.app_id = a.id
       WHERE li.list_id = ? AND a.install_command IS NOT NULL
       AND JSON_VALID(a.install_command)`, // Add JSON validation
        [listId]);
        if (!apps.length) {
            await conn.rollback();
            return res.status(400).json({
                error: "No valid apps to install",
                errorCode: "NO_VALID_APPS"
            });
        }
        // Validate install commands
        const validApps = apps.filter(app => {
            try {
                const command = typeof app.install_command === 'string'
                    ? JSON.parse(app.install_command)
                    : app.install_command;
                return command && typeof command === 'object';
            }
            catch (e) {
                console.error(`Invalid install command for app ${app.name}:`, e);
                return false;
            }
        });
        if (!validApps.length) {
            await conn.rollback();
            return res.status(400).json({
                error: "No apps with valid installation commands",
                errorCode: "INVALID_COMMANDS"
            });
        }
        // Create installation record
        const [result] = await conn.query(`INSERT INTO installations 
       (user_id, device_id, list_id, status, apps_count)
       VALUES (?, ?, ?, 'pending', ?)`, [req.user.userId, req.headers["x-device-id"], listId, validApps.length]);
        await conn.commit();
        // Start installation in background
        const installationManager = new InstallationManager();
        installationManager
            .startInstallation(result.insertId, validApps, sudoPassword)
            .catch((err) => console.error("Background installation error:", err));
        res.json({
            success: true,
            installationId: result.insertId,
            appsCount: validApps.length,
            statusUrl: `/api/installations/${result.insertId}/status`
        });
    }
    catch (error) {
        await conn.rollback();
        console.error("Installation error:", error);
        res.status(500).json({
            error: "Installation failed to start",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
            errorCode: "INSTALLATION_FAILED"
        });
    }
    finally {
        conn.release();
    }
});
app.get("/api/installations/:id/status", authenticateToken, async (req, res) => {
    try {
        const [installation] = await pool.query(`SELECT status, progress, apps_count, error_log
       FROM installations WHERE id = ?`, [req.params.id]);
        if (!installation.length) {
            return res.status(404).json({ error: "Installation not found" });
        }
        res.json({
            status: installation[0].status,
            progress: installation[0].progress,
            total: installation[0].apps_count,
            error: installation[0].error_log,
        });
    }
    catch (error) {
        console.error("Status check error:", error);
        res.status(500).json({
            error: "Status check failed",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
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
            const [device] = await pool.query(`SELECT id FROM devices 
         WHERE user_id = ? AND device_id = ?`, [req.user.userId, deviceId]);
            if (!device.length) {
                const [subscription] = await pool.query(`SELECT l.seat_limit, COUNT(d.id) as used_seats
           FROM user_subscriptions us
           JOIN licenses l ON us.license_id = l.id
           LEFT JOIN devices d ON d.user_id = us.user_id AND d.is_active = TRUE
           WHERE us.user_id = ? AND us.status = 'active'
           GROUP BY us.id`, [req.user.userId]);
                if (subscription.length) {
                    const { seat_limit, used_seats } = subscription[0];
                    if (used_seats < seat_limit) {
                        await pool.query(`INSERT INTO devices 
               (user_id, device_id, device_name, platform, last_active)
               VALUES (?, ?, ?, ?, NOW())`, [
                            req.user.userId,
                            deviceId,
                            req.headers["x-device-name"] || "Unknown Device",
                            req.headers["x-platform"] || "Unknown",
                        ]);
                    }
                }
            }
            else {
                await pool.query(`UPDATE devices SET last_active = NOW() WHERE id = ?`, [device[0].id]);
            }
        }
        catch (error) {
            console.error("Device middleware error:", error);
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
    }
    catch (err) {
        console.error("Token cleanup error:", err);
    }
}, 3600000);
// Handle 404 for undefined API routes
app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
});
// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=server.mjs.map