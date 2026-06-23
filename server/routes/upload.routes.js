const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const uploadController = require('../controllers/upload.controller');

router.post('/:roomId/files', authenticateToken, asyncHandler(uploadController.uploadFile));
router.get('/:roomId/files', authenticateToken, asyncHandler(uploadController.getFiles));
router.post('/:roomId/voice', authenticateToken, asyncHandler(uploadController.uploadVoice));

module.exports = router;
