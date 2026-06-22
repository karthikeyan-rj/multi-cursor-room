const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const roomController = require('../controllers/room.controller');

router.get('/', authenticateToken, asyncHandler(roomController.getRooms));
router.post('/', authenticateToken, asyncHandler(roomController.createRoom));
router.post('/join', authenticateToken, asyncHandler(roomController.joinRoom));
router.get('/:roomId', authenticateToken, asyncHandler(roomController.getRoom));
router.get('/:roomId/members', authenticateToken, asyncHandler(roomController.getMembers));
router.get('/:roomId/activities', authenticateToken, asyncHandler(roomController.getActivities));
router.get('/:roomId/settings', authenticateToken, asyncHandler(roomController.getSettings));
router.post('/:roomId/settings', authenticateToken, asyncHandler(roomController.updateSettings));
router.post('/:roomId/kick', authenticateToken, asyncHandler(roomController.kickUser));
router.post('/:roomId/requests/:userId/approve', authenticateToken, asyncHandler(roomController.approveJoinRequest));
router.post('/:roomId/requests/:userId/reject', authenticateToken, asyncHandler(roomController.rejectJoinRequest));
router.delete('/:roomId', authenticateToken, asyncHandler(roomController.deleteRoom));

module.exports = router;
