import express from 'express';
import {
  exportAttendanceCSV,
  getAttendanceSummary
} from '../controllers/exportController.js';

import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/export-attendance/:sessionId - Export attendance as CSV (Teachers only)
router.get('/export-attendance/:sessionId', authenticate, authorize('teacher'), exportAttendanceCSV);

// GET /api/attendance-summary/:sessionId - Get attendance summary (JSON) (Teachers only)
router.get('/attendance-summary/:sessionId', authenticate, authorize('teacher'), getAttendanceSummary);

export default router;

