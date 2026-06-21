const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const { isAllowedFileExtension, sanitizeFileName } = require('../utils/fileValidation');
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

const CLOUDINARY_ENABLED = cloudinary.isConfigured;

function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.on('error', reject);
    stream.end(buffer);
  });
}

router.post('/:roomId/files', authenticateToken, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({
        success: false,
        error: err.message,
        detail: process.env.NODE_ENV !== 'production' ? err.message : undefined
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file provided.' });
      }

      const { roomId } = req.params;
      const username = req.user.username;

      if (!isAllowedFileExtension(req.file.originalname)) {
        return res.status(400).json({ success: false, error: 'File type not allowed.' });
      }

      const room = await db.getRoomById(roomId);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room not found.' });
      }

      const isMember = room.ownerId === req.user.userId ||
        (room.participants && room.participants.some(p => p.userId === req.user.userId));
      if (!isMember) {
        return res.status(403).json({ success: false, error: 'You are not a member of this room.' });
      }

      const cleanName = sanitizeFileName(req.file.originalname);
      let fileUrl, cloudinaryPublicId;

      if (CLOUDINARY_ENABLED) {
        try {
          const result = await uploadBufferToCloudinary(req.file.buffer, {
            folder: `cursor_room/${roomId}`,
            public_id: Date.now() + '-' + Math.random().toString(36).substring(2, 8),
            resource_type: 'auto'
          });
          fileUrl = result.secure_url;
          cloudinaryPublicId = result.public_id;
        } catch (cloudErr) {
          console.error('Cloudinary upload failed:', cloudErr.message, '(http_code:', cloudErr.http_code + ')');
          const message = cloudErr.http_code === 403
            ? 'File upload failed: Cloudinary permission denied. Check your Cloudinary API credentials.'
            : 'Failed to upload file to Cloudinary.';
          return res.status(500).json({
            success: false,
            error: message,
            detail: process.env.NODE_ENV !== 'production' ? cloudErr.message : undefined
          });
        }
      } else if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({
          success: false,
          error: 'File upload is not configured. Set Cloudinary environment variables.'
        });
      } else {
        const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        const uniqueName = Date.now() + '-' + Math.random().toString(36).substring(2, 8) + path.extname(req.file.originalname);
        fs.writeFileSync(path.join(UPLOAD_DIR, uniqueName), req.file.buffer);
        fileUrl = '/uploads/' + uniqueName;
        cloudinaryPublicId = null;
      }

      const fileMsg = await db.saveFileMessage(
        roomId, username, cleanName, req.file.originalname,
        req.file.mimetype, req.file.size, fileUrl, cloudinaryPublicId, req.user.userId
      );

      const io = req.app.get('io');
      if (io) {
        io.to(roomId).emit('room:file-message', fileMsg);
      }

      res.status(201).json({ success: true, file: fileMsg });
    } catch (error) {
      console.error('File upload failed:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to upload file.',
        detail: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  });
});

router.get('/:roomId/files', authenticateToken, async (req, res) => {
  try {
    const files = await db.getFileMessages(req.params.roomId);
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch files.' });
  }
});

module.exports = router;
