const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const authController = require('../controllers/auth.controller');

router.post('/signup', asyncHandler(authController.signup));
router.post('/login', asyncHandler(authController.login));
router.get('/me', authenticateToken, asyncHandler(authController.getMe));
router.post('/color', authenticateToken, asyncHandler(authController.updateColor));
router.post('/change-password', authenticateToken, asyncHandler(authController.changePassword));
router.patch('/profile', authenticateToken, asyncHandler(authController.updateProfile));

module.exports = router;
