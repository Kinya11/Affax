"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.awsConfig = void 0;
exports.awsConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'app-icons',
    cdnDomain: process.env.CDN_DOMAIN || 'icons.yourdomain.com',
    uploadDirectory: 'icons'
};
//# sourceMappingURL=aws.js.map