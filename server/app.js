const express = require('express');
const path = require('path');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const uploadRoutes = require('./routes/upload.routes');
const voiceRoutes = require('./routes/voice.routes');
const healthRoutes = require('./routes/health.routes');

function createApp(corsOptions) {
  const app = express();

  app.use(cors(corsOptions));
  app.use(express.json());

  app.use('/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/rooms', uploadRoutes);
  app.use('/api/rooms', voiceRoutes);

  if (process.env.NODE_ENV !== 'production') {
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    app.get('/api/debug/cloudinary-test', (req, res) => {
      res.json({
        success: true,
        cloudinary_configured: Boolean(
          process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
        ),
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '(not set)',
        has_api_key: !!process.env.CLOUDINARY_API_KEY,
        has_api_secret: !!process.env.CLOUDINARY_API_SECRET
      });
    });
  }

  app.get('/', (req, res) => {
    res.json({ success: true, message: "Multiplayer Cursor Room Backend is running!", status: "healthy" });
  });

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found"
    });
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
