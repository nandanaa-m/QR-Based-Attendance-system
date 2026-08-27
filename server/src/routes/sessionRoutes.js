import express from 'express';
import {
  createSession,
  getSession,
  getAllSessions,
  closeSession
} from '../controllers/sessionController.js';

import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/create-session - Create new attendance session (Teachers only)
router.post('/create-session', authenticate, authorize('teacher'), createSession);

// GET /api/session/:sessionId - Get session by ID (Both can access for scanning)
router.get('/session/:sessionId', getSession);

// GET /api/sessions - Get all sessions (Teachers only, filtered in controller)
router.get('/sessions', authenticate, authorize('teacher'), getAllSessions);

// PATCH /api/session/:sessionId/close - Close a session (Teachers only)
router.patch('/session/:sessionId/close', authenticate, authorize('teacher'), closeSession);

export default router;

