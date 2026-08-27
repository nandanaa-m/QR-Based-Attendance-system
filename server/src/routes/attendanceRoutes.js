import express from 'express';
import {
  markAttendance,
  getAttendance,
  checkAttendance
} from '../controllers/attendanceController.js';

import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/mark-attendance - Mark attendance (Students only)
router.post('/mark-attendance', authenticate, authorize('student'), markAttendance);

// GET /api/attendance/:sessionId - Get attendance for a session (Faculty only)
router.get('/attendance/:sessionId', authenticate, authorize('teacher'), getAttendance);

// GET /api/check-attendance/:sessionId/:studentId - Check attendance status (Students only)
router.get('/check-attendance/:sessionId/:studentId', authenticate, authorize('student'), checkAttendance);

export default router;

