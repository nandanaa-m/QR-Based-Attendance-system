import attendanceService from '../services/attendanceService.js';
import sessionService from '../services/sessionService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { isValidCoordinate } from '../utils/locationValidator.js';

/**
 * Mark attendance for a student — queued path
 * POST /api/mark-attendance
 *
 * Returns HTTP 202 Accepted immediately after validation passes and the
 * record is enqueued.  The actual write to Google Sheets happens during
 * the next queue flush (every 10 s, max 60 writes/min).
 */
export const markAttendance = asyncHandler(async (req, res) => {
  const { sessionId, studentId, studentName, latitude, longitude, deviceId } = req.body;

  // ── Input validation ──────────────────────────────────────────────
  if (!sessionId) {
    throw new AppError('Session ID is required', 400);
  }

  if (!studentId || !studentName) {
    throw new AppError('Student ID and name are required', 400);
  }

  if (!deviceId) {
    throw new AppError('Device fingerprint is required', 400);
  }

  if (!latitude || !longitude) {
    throw new AppError('Location coordinates are required', 400);
  }

  if (!isValidCoordinate(parseFloat(latitude), parseFloat(longitude))) {
    throw new AppError('Invalid coordinates provided', 400);
  }

  // ── Business validation + enqueue ────────────────────────────────
  try {
    const result = await attendanceService.queueAttendance({
      sessionId,
      studentId,
      studentName,
      latitude,
      longitude,
      studentEmail: req.user.email,
      deviceId,
    });

    // 202 Accepted: request is valid and queued; not yet written to DB
    res.status(202).json({
      success:          true,
      queued:           true,
      message:          result.message,
      position:         result.position,
      estimatedWaitMs:  result.estimatedWaitMs,
      data:             result.record,
    });
  } catch (error) {
    // Translate known business errors to 400 Bad Request
    if (
      error.message.includes('not found')     ||
      error.message.includes('not active')    ||
      error.message.includes('already marked')||
      error.message.includes('away from')     ||
      error.message.includes('bounding box')  ||
      error.message.includes('outside the allowed area')
    ) {
      throw new AppError(error.message, 400);
    }
    throw error;
  }
});


/**
 * Get attendance for a session
 * GET /api/attendance/:sessionId
 */
export const getAttendance = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  // Check ownership
  const session = await sessionService.getSession(sessionId);
  if (!session) {
    throw new AppError('Session not found', 404);
  }

  if (session.facultyEmail !== req.user.email) {
    throw new AppError('You do not have permission to view this attendance list', 403);
  }

  const result = await attendanceService.getAttendanceBySession(sessionId);

  res.json({
    success: true,
    data: result
  });
});

/**
 * Check if student already marked attendance
 * GET /api/check-attendance/:sessionId/:studentId
 */
export const checkAttendance = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const studentId = req.user.email; // Use email as identifier for duplicate check if needed

  const hasMarked = await attendanceService.checkDuplicate(sessionId, studentId, req.query.deviceId);

  res.json({
    success: true,
    data: {
      sessionId,
      hasMarkedAttendance: hasMarked
    }
  });
});
