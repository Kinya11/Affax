"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const sharp_1 = __importDefault(require("sharp"));
const aws_js_1 = require("../config/aws.js");
const s3Client = new client_s3_1.S3Client({ region: aws_js_1.awsConfig.region });
class S3Service {
    static async uploadIcon(file, filename) {
        try {
            // Optimize image
            const optimizedBuffer = await (0, sharp_1.default)(file.buffer)
                .resize(256, 256, { fit: 'inside' })
                .webp({ quality: 90 })
                .toBuffer();
            const key = `${aws_js_1.awsConfig.uploadDirectory}/${filename}`;
            await s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: aws_js_1.awsConfig.bucket,
                Key: key,
                Body: optimizedBuffer,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000'
            }));
            return `https://${aws_js_1.awsConfig.cdnDomain}/${key}`;
        }
        catch (error) {
            console.error('S3 upload error:', error);
            throw new Error('Failed to upload icon to S3');
        }
    }
    static async deleteIcon(iconUrl) {
        try {
            const key = iconUrl.split(`${aws_js_1.awsConfig.cdnDomain}/`)[1];
            await s3Client.send(new client_s3_1.DeleteObjectCommand({
                Bucket: aws_js_1.awsConfig.bucket,
                Key: key
            }));
        }
        catch (error) {
            console.error('S3 delete error:', error);
            throw new Error('Failed to delete icon from S3');
        }
    }
}
exports.S3Service = S3Service;
//# sourceMappingURL=s3Service.js.map