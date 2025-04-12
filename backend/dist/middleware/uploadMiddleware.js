"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueFilename = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const crypto_1 = __importDefault(require("crypto"));
const storage = multer_1.default.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'), false);
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    }
});
const generateUniqueFilename = (originalname) => {
    const timestamp = Date.now();
    const hash = crypto_1.default.randomBytes(8).toString('hex');
    const ext = '.webp'; // We'll convert everything to WebP
    return `${timestamp}-${hash}${ext}`;
};
exports.generateUniqueFilename = generateUniqueFilename;
//# sourceMappingURL=uploadMiddleware.js.map