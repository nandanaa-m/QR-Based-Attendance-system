import storage from '../storage/index.js';
import { generateAttendanceCSV } from '../utils/csvGenerator.js';
import sessionService from './sessionService.js';

/**
 * Export Service
 * Handles exporting attendance data to various formats
 */
class ExportService {
  /**
   * Export attendance for a session as CSV
   */
  async exportAttendanceCSV(sessionId) {
    // Get session info
    const session = await sessionService.getSession(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    // Get attendance records
    const attendance = await storage.getAttendanceBySession(sessionId);

    // Generate CSV
    const csv = generateAttendanceCSV(attendance, session);

    // Generate filename
    const date = new Date(session.createdAt).toISOString().split('T')[0];
    const subjectSlug = session.subject.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const filename = `attendance_${subjectSlug}_${date}.csv`;

    return {
      csv,
      filename,
      session,
      recordCount: attendance.length
    };
  }

  /**
   * Get attendance summary for a session
   */
  async getAttendanceSummary(sessionId) {
    const session = await sessionService.getSession(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    const attendance = await storage.getAttendanceBySession(sessionId);

    return {
      sessionId,
      subject: session.subject,
      facultyName: session.facultyName,
      createdAt: session.createdAt,
      status: session.status,
      totalAttendance: attendance.length,
      students: attendance.map(a => ({
        studentId: a.studentId,
        studentName: a.studentName,
        markedAt: a.markedAt
      }))
    };
  }
}

export default new ExportService();

