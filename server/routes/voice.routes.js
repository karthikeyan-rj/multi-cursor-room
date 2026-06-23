const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const voiceController = require('../controllers/voice.controller');

router.post('/:roomId/voice-token', authenticateToken, asyncHandler(voiceController.getVoiceToken));

module.exports = router;
