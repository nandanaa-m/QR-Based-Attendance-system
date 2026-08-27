import exportService from '../services/exportService.js';
import sessionService from '../services/sessionService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

/**
 * Export attendance as CSV
 * GET /api/export-attendance/:sessionId
 */
export const exportAttendanceCSV = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  // Check ownership
  const session = await sessionService.getSession(sessionId);
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  
  if (session.facultyEmail !== req.user.email) {
    throw new AppError('You do not have permission to export this attendance', 403);
  }

  try {
    const result = await exportService.exportAttendanceCSV(sessionId);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    
    res.send(result.csv);
  } catch (error) {
    if (error.message.includes('not found')) {
      throw new AppError(error.message, 404);
    }
    throw error;
  }
});

/**
 * Get attendance summary (JSON)
 * GET /api/attendance-summary/:sessionId
 */
export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  // Check ownership
  const session = await sessionService.getSession(sessionId);
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  
  if (session.facultyEmail !== req.user.email) {
    throw new AppError('You do not have permission to view this summary', 403);
  }

  try {
    const summary = await exportService.getAttendanceSummary(sessionId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      throw new AppError(error.message, 404);
    }
    throw error;
  }
});

