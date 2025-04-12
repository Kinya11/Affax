"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/api/auth.ts (rename from .js to .ts)
const index_js_1 = __importDefault(require("../src/api/index.js"));
exports.default = {
    register(userData) {
        return index_js_1.default.post('/auth/register', userData);
    },
    login(credentials) {
        return index_js_1.default.post('/auth/login', credentials);
    },
    googleLogin(idToken) {
        return index_js_1.default.post('/auth/google-login', { id_token: idToken });
    },
    logout() {
        return index_js_1.default.post('/auth/logout');
    },
    // Add the missing methods
    getValidToken() {
        const token = localStorage.getItem('token');
        if (!token)
            return null;
        // Add token validation logic if needed
        return token;
    },
    clearAuthData() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};
//# sourceMappingURL=auth.js.map