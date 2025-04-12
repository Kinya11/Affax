const storageConfig = {
  // Local development
  local: {
    path: './uploads/icons',
    maxSize: 100 * 1024, // 100KB max per icon
    allowedTypes: ['image/png', 'image/jpeg', 'image/webp'],
  },
  
  // Production (example with S3)
  production: {
    type: 's3',
    bucket: 'app-icons',
    region: 'us-east-1',
    cdnDomain: 'icons.yourdomain.com',
    cacheControl: 'public, max-age=31536000', // 1 year
    compression: {
      webp: true,
      quality: 90,
      maxWidth: 256,
      maxHeight: 256,
    }
  }
};