import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
import meetingController from '../controllers/meetingController.js';

// Meeting routes
router.get('/', authenticateToken, meetingController.getAllMeetings);
router.get('/count', authenticateToken, meetingController.getMeetingsCount);
router.get('/:id', authenticateToken, meetingController.getMeetingById);
router.post('/', authenticateToken, meetingController.createMeeting);
router.put('/:id', authenticateToken, meetingController.updateMeeting);
router.delete('/:id', authenticateToken, meetingController.deleteMeeting);
router.post('/:id/join', authenticateToken, meetingController.joinMeeting);
router.post('/:id/leave', authenticateToken, meetingController.leaveMeeting);
router.get('/:id/participants', authenticateToken, meetingController.getMeetingParticipants);
router.post('/:id/participants', authenticateToken, meetingController.addParticipants);
router.post('/agora-token', authenticateToken, meetingController.generateAgoraToken);

export default router;
