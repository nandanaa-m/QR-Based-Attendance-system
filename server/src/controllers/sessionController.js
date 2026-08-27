import sessionService from '../services/sessionService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { isValidCoordinate } from '../utils/locationValidator.js';

/**
 * Create a new attendance session
 * POST /api/create-session
 */
export const createSession = asyncHandler(async (req, res) => {
  const { facultyName, subject, latitude, longitude, radius } = req.body;

  // Validation
  if (!facultyName || !subject) {
    throw new AppError('Faculty name and subject are required', 400);
  }

  if (!latitude || !longitude) {
    throw new AppError('Location coordinates are required', 400);
  }

  if (!isValidCoordinate(parseFloat(latitude), parseFloat(longitude))) {
    throw new AppError('Invalid coordinates provided', 400);
  }

  const session = await sessionService.createSession({
    facultyName,
    subject,
    latitude,
    longitude,
    radius,
    facultyEmail: req.user.email
  });

  res.status(201).json({
    success: true,
    message: 'Session created successfully',
    data: session
  });
});

/**
 * Get session by ID
 * GET /api/session/:sessionId
 */
export const getSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { withQR } = req.query;

  let session;
  
  if (withQR === 'true') {
    session = await sessionService.getSessionWithQR(sessionId);
  } else {
    session = await sessionService.getSession(sessionId);
  }

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  res.json({
    success: true,
    data: session
  });
});

/**
 * Get all sessions
 * GET /api/sessions
 */
export const getAllSessions = asyncHandler(async (req, res) => {
  let sessions = await sessionService.getAllSessions();

  // If user is a teacher, only show their sessions
  if (req.user && req.user.role === 'teacher') {
    sessions = sessions.filter(s => s.facultyEmail === req.user.email);
  }

  res.json({
    success: true,
    count: sessions.length,
    data: sessions
  });
});

/**
 * Close a session
 * PATCH /api/session/:sessionId/close
 */
export const closeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await sessionService.getSession(sessionId);

  if (!session) {
    throw new AppError('Session not found', 404);
  }

  // Check ownership
  if (session.facultyEmail !== req.user.email) {
    throw new AppError('You do not have permission to close this session', 403);
  }

  const updatedSession = await sessionService.closeSession(sessionId);

  res.json({
    success: true,
    message: 'Session closed successfully',
    data: updatedSession
  });
});

