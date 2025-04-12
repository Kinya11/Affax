"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: "server_info.env" });
const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
console.log('Initializing database connection with config:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    // Don't log the password
});
exports.pool = promise_1.default.createPool(dbConfig);
// Test the connection
exports.pool.getConnection()
    .then(connection => {
    console.log('Database connection established successfully');
    connection.release();
})
    .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
});
//# sourceMappingURL=db.js.map