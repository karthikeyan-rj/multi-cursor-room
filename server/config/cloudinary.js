const cloudinary = require('cloudinary').v2;

const config = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
};

const isConfigured = !!(config.cloud_name && config.api_key && config.api_secret);

if (!isConfigured) {
  if (process.env.NODE_ENV === 'production') {
    console.log('Cloudinary not configured. File upload will be unavailable in production.');
  } else {
    console.log('Cloudinary not configured. File upload will use local disk storage.');
  }
}

if (isConfigured) {
  cloudinary.config(config);
  console.log('Cloudinary configured successfully.');
}

module.exports = cloudinary;
module.exports.isConfigured = isConfigured;
